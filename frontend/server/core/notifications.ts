import { randomBytes } from 'node:crypto'

const sent = new Map<string, number>()
export async function notifyFailure(route: string, status: number, expected = false, send = fetch) {
  if (process.env.ERROR_NOTIFICATIONS_ENABLED !== 'true' || status < 500 || (status === 503 && expected)) return 'ignored'
  const category = status === 503 ? 'api' : route.startsWith('webhooks/stripe') ? 'stripe_webhook' : route.startsWith('payments/checkout_sessions') ? 'stripe_api' : 'api'
  try {
    const dsn = new URL(process.env.SENTRY_ERROR_DSN || '')
    const environment = process.env.ERROR_NOTIFICATION_ENVIRONMENT || (process.env.NODE_ENV === 'production' ? 'production' : 'verification')
    if (dsn.protocol !== 'https:' || (dsn.port && dsn.port !== '443') || !/^o\d+\.ingest(?:\.[a-z]+)?\.sentry\.io$/.test(dsn.hostname) || !/^[a-f0-9]{32}$/i.test(dsn.username) || dsn.password || !/^\/\d+$/.test(dsn.pathname) || dsn.search || dsn.hash || !['production', 'verification'].includes(environment)) return 'failed'
    const key = `${environment}:${category}`
    if (Date.now() - (sent.get(key) || 0) < 3600000) return 'throttled'
    sent.set(key, Date.now())
    const eventId = randomBytes(16).toString('hex')
    const timestamp = new Date().toISOString()
    const messages = { api: 'Exam Practice API server failure', stripe_api: 'Exam Practice Stripe API connection failure', stripe_webhook: 'Exam Practice Stripe webhook processing failure' }
    // Only fixed messages are sent. Requests, exceptions, users and bodies never enter the envelope.
    const payload = JSON.stringify({ event_id: eventId, timestamp, environment, level: 'error', message: messages[category] })
    const body = [JSON.stringify({ event_id: eventId, sent_at: timestamp }), JSON.stringify({ type: 'event', length: Buffer.byteLength(payload) }), payload, ''].join('\n')
    const response = await send(`https://${dsn.host}/api${dsn.pathname}/envelope/`, { method: 'POST', headers: { 'Content-Type': 'application/x-sentry-envelope', 'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${dsn.username}` }, body, signal: AbortSignal.timeout(1000), redirect: 'error' })
    return response.ok ? 'sent' : 'failed'
  } catch { return 'failed' }
}
