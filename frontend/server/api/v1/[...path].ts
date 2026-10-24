import { defineEventHandler, getRequestURL, setResponseStatus, type H3Event } from 'h3'
import { authenticate } from '../../core/auth.ts'
import { configuration } from '../../core/config.ts'
import { ApiError } from '../../core/errors.ts'
import { applyApiHeaders } from '../../core/http.ts'
import { notifyFailure } from '../../core/notifications.ts'
import { throttle } from '../../core/rate-limit.ts'
import { handleAccounts } from '../../services/accounts.ts'
import { handleLearning } from '../../services/learning.ts'
import { handlePayments } from '../../services/payments.ts'

export async function apiHandler(event: H3Event) {
  const headRequest = event.method === 'HEAD'
  if (headRequest) {
    event._method = 'GET'
    event.node.req.method = 'GET'
  }
  const parts = getRequestURL(event).pathname.replace(/^\/api\/v1\/?/, '').split('/').filter(Boolean)
  const route = parts.join('/')
  try {
    if (applyApiHeaders(event)) return ''
    if (route === 'health' && ['GET', 'HEAD'].includes(event.method)) return { status: 'ok', app: `${configuration.site.name} API` }
    // Signup, login and Stripe signatures supply their own authentication.
    const user = route.startsWith('auth/') || route === 'webhooks/stripe' ? null : await authenticate(event)
    if (event.method === 'POST' && /^questions\/[^/]+\/answer$/.test(route)) await throttle(event, 'answer')
    for (const handler of [handleAccounts, handleLearning, handlePayments]) {
      const result = await handler(event, parts, user)
      if (result !== undefined) return result
    }
    throw new ApiError(404, 'not_found', '対象が見つかりません')
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    const apiError = error instanceof ApiError ? error : statusCode && statusCode >= 400 && statusCode < 500 ? new ApiError(statusCode, 'bad_request', '入力内容を確認してください') : new ApiError(500, 'internal_server_error', '処理に失敗しました')
    setResponseStatus(event, apiError.status)
    if (apiError.status >= 500) {
      // Never log URL queries, parameters, exception messages, credentials or personal data.
      console.error(JSON.stringify({ category: 'api_failure', status: apiError.status, route: route.startsWith('webhooks/') ? 'stripe_webhook' : route.startsWith('payments/') ? 'payments' : 'api' }))
      await notifyFailure(route, apiError.status, apiError.expectedUnavailability)
    }
    return { error: { code: apiError.code, message: apiError.message, ...(apiError.details ? { details: apiError.details } : {}) } }
  } finally {
    // H3 suppresses the response body after dispatch, retaining GET status/headers.
    if (headRequest) { event._method = 'HEAD'; event.node.req.method = 'HEAD' }
  }
}
export default defineEventHandler(apiHandler)
