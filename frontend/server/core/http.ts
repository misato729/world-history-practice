import { getHeader, setHeader, setResponseStatus, type H3Event } from 'h3'
import { environment } from './config.ts'
import { fail } from './errors.ts'

export function allowedOrigins(configured = process.env.CORS_ORIGINS || '', env = environment()) {
  const values = configured.split(',').map(value => value.trim()).filter(Boolean)
  for (const value of values) {
    try {
      const url = new URL(value)
      if (!['http:', 'https:'].includes(url.protocol) || (env === 'production' && url.protocol !== 'https:') || url.origin !== value || url.username || url.password || value.includes('*')) throw new Error()
    } catch { throw new Error('CORS_ORIGINS requires exact origins (HTTPS in production)') }
  }
  return [...new Set([...(env === 'development' ? ['http://localhost:3200', 'http://127.0.0.1:3200'] : []), ...values])]
}
export function applyApiHeaders(event: H3Event) {
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  const origin = getHeader(event, 'origin')
  const origins = allowedOrigins()
  if (origin && origins.includes(origin)) {
    setHeader(event, 'Access-Control-Allow-Origin', origin)
    setHeader(event, 'Vary', 'Origin')
    setHeader(event, 'Access-Control-Allow-Headers', 'Authorization, Content-Type')
    setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD')
  }
  if (event.method === 'OPTIONS') {
    if (origin && !origins.includes(origin)) fail(403, 'forbidden', 'この接続元は許可されていません')
    setResponseStatus(event, 204)
    return true
  }
  return false
}
