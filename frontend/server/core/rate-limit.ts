import { createHmac } from 'node:crypto'
import { getHeader, setHeader, type H3Event } from 'h3'
import { isIP } from 'node:net'
import { query } from './db.ts'
import { secretKey } from './config.ts'
import { fail } from './errors.ts'

export const rules = {
  signup: { limit: 10, period: 900 }, login: { limit: 30, period: 300 },
  checkout_ip: { limit: 20, period: 300 }, checkout_user: { limit: 10, period: 300 },
  answer: { limit: 120, period: 60 },
} as const
export type RateScope = keyof typeof rules

export function clientAddress(event: H3Event) {
  // Never trust arbitrary proxy headers from an unconfigured deployment.
  const address = (process.env.FLY_APP_NAME ? getHeader(event, 'fly-client-ip') : undefined) || event.node.req.socket.remoteAddress || 'unknown'
  return isIP(address) ? address.replace(/^::ffff:/, '') : 'unknown'
}
export async function consumeRateLimit(scope: RateScope, subject: string, now = Date.now()) {
  const rule = rules[scope]
  const start = Math.floor(now / 1000 / rule.period) * rule.period
  const expires = new Date((start + rule.period) * 1000)
  const key = createHmac('sha256', secretKey()).update(['api-rate-limit-v1', scope, subject, start].join('\0')).digest('hex')
  await query('DELETE FROM api_rate_limit_buckets WHERE key IN (SELECT key FROM api_rate_limit_buckets WHERE expires_at <= $1 LIMIT 100)', [new Date(now)])
  const [row] = await query(`INSERT INTO api_rate_limit_buckets(key,request_count,expires_at) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET request_count=api_rate_limit_buckets.request_count+1 RETURNING request_count`, [key, expires])
  return { allowed: row!.request_count <= rule.limit, retryAfter: Math.max(1, Math.ceil((expires.getTime() - now) / 1000)) }
}
export async function throttle(event: H3Event, scope: RateScope, subject = clientAddress(event)) {
  let result
  try { result = await consumeRateLimit(scope, subject) }
  catch {
    setHeader(event, 'Retry-After', 60); setHeader(event, 'Cache-Control', 'no-store')
    fail(503, 'rate_limiter_unavailable', '一時的に操作できません。しばらく待ってからお試しください')
  }
  if (!result.allowed) {
    setHeader(event, 'Retry-After', result.retryAfter); setHeader(event, 'Cache-Control', 'no-store')
    fail(429, 'rate_limit_exceeded', '操作が集中しています。しばらく待ってからお試しください')
  }
}
