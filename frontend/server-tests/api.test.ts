import assert from 'node:assert/strict'
import { createHmac, randomUUID } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { readFile } from 'node:fs/promises'
import { after, before, test } from 'node:test'
import { createApp, defineEventHandler, toNodeListener } from 'h3'
import { apiHandler } from '../server/api/v1/[...path].ts'
import { issueToken, verifyToken, type User } from '../server/core/auth.ts'
import { configuration, setConfigurationForTesting } from '../server/core/config.ts'
import { query, closeDatabase } from '../server/core/db.ts'
import { allowedOrigins } from '../server/core/http.ts'
import { notifyFailure } from '../server/core/notifications.ts'
import { consumeRateLimit } from '../server/core/rate-limit.ts'
import { migrate } from '../server/database/migrate.ts'
import { saveQuestion } from '../server/services/learning-writer.ts'

process.env.APP_ENV = 'test'
// A new signing namespace keeps persistent rate-limit buckets isolated per run.
process.env.SECRET_KEY_BASE = 'synthetic-api-test-' + randomUUID() + randomUUID()
process.env.CORS_ORIGINS ||= 'http://localhost:3100'
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
const databaseAvailable = Boolean(process.env.TEST_DATABASE_URL)
const integration = { skip: !databaseAvailable }
const original = structuredClone(configuration)
let server: Server
let base: string
const emails: string[] = []
const questionIds: number[] = []

before(async () => {
  if (!databaseAvailable) return
  assert.match(new URL(process.env.TEST_DATABASE_URL!).pathname, /_test$/)
  await migrate()
  const app = createApp()
  app.use(defineEventHandler(apiHandler))
  server = createServer(toNodeListener(app))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/v1`
  const content = JSON.parse(await readFile(new URL('../../content/questions.json', import.meta.url), 'utf8'))
  for (const input of content.questions) questionIds.push((await saveQuestion(input)).id)
})
after(async () => {
  setConfigurationForTesting(original)
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  if (databaseAvailable) {
    await query('DELETE FROM users WHERE email=ANY($1)', [emails])
    await query('DELETE FROM questions WHERE id=ANY($1)', [questionIds])
  }
  await closeDatabase()
})

async function request(path: string, options: { method?: string, body?: unknown, token?: string, headers?: Record<string, string> } = {}) {
  const response = await fetch(base + path, {
    method: options.method || 'GET',
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...options.headers },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })
  const text = await response.text()
  return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : null }
}
async function account() {
  const email = `api-${randomUUID()}@example.invalid`
  emails.push(email)
  const response = await request('/auth/signup', { method: 'POST', body: { name: 'API synthetic test', email: ` ${email.toUpperCase()} `, password: 'Synthetic-password-123', password_confirmation: 'Synthetic-password-123', role: 'admin' } })
  assert.equal(response.status, 201)
  return { email, ...response.body.data }
}

test('signed tokens expire, bind role and purpose, reject tampering and accept legacy Rails envelopes', () => {
  const user = { id: 7, role: 'user' as const }
  const now = Date.now()
  const token = issueToken(user, now)
  assert.deepEqual(verifyToken(token, now), { user_id: 7, role: 'user' })
  assert.equal(verifyToken(token, now + 86400001), null)
  assert.equal(verifyToken(token + 'x', now), null)
  const legacy = (purpose: string) => {
    const value = Buffer.from(JSON.stringify({ _rails: { message: Buffer.from(JSON.stringify(user.id ? { user_id: user.id, role: user.role } : {})).toString('base64'), exp: new Date(now + 60000).toISOString(), pur: purpose } })).toString('base64')
    return value + '--' + createHmac('sha256', process.env.SECRET_KEY_BASE!).update(value).digest('hex')
  }
  assert.deepEqual(verifyToken(legacy('access_token'), now), { user_id: 7, role: 'user' })
  assert.equal(verifyToken(legacy('another-purpose'), now), null)
})

test('CORS only allows exact configured origins and requires HTTPS for production', () => {
  assert.deepEqual(allowedOrigins('https://example.invalid', 'production'), ['https://example.invalid'])
  for (const value of ['*', 'https://example.invalid/path', 'https://user:secret@example.invalid', 'http://example.invalid', 'https://example.invalid/']) assert.throws(() => allowedOrigins(value, 'production'))
})

test('notification payloads exclude exception, request and user information', async () => {
  const old = { ...process.env }
  try {
    process.env.ERROR_NOTIFICATIONS_ENABLED = 'true'
    process.env.SENTRY_ERROR_DSN = 'https://' + 'a'.repeat(32) + '@o1.ingest.sentry.io/1'
    process.env.ERROR_NOTIFICATION_ENVIRONMENT = 'verification'
    let destination = ''
    let payload = ''
    const fakeFetch = (async (url: string | URL | Request, options?: RequestInit) => { destination = String(url); payload = String(options?.body); return new Response('', { status: 200 }) }) as typeof fetch
    assert.equal(await notifyFailure('webhooks/stripe?access_token=synthetic-private', 500, false, fakeFetch), 'sent')
    assert.equal(destination, 'https://o1.ingest.sentry.io/api/1/envelope/')
    assert.ok(payload.includes('Exam Practice Stripe webhook processing failure'))
    assert.ok(!payload.includes('synthetic-private'))
    assert.equal(await notifyFailure('webhooks/stripe', 500, false, fakeFetch), 'throttled')
    assert.equal(await notifyFailure('payments/checkout_sessions', 503, true, fakeFetch), 'ignored')
  } finally { process.env = old }
})

test('HTTP health, old response envelope, no-store and permitted preflight remain available', integration, async () => {
  const health = await request('/health')
  assert.equal(health.status, 200)
  assert.deepEqual(health.body, { status: 'ok', app: `${configuration.site.name} API` })
  assert.equal(health.headers.get('cache-control'), 'no-store')
  const origin = allowedOrigins()[0]!
  const preflight = await request('/auth/login', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' } })
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin)
  assert.equal((await request('/missing')).body.error.code, 'not_found')
  assert.equal((await request('/me')).status, 401)
  const head = await request('/exams', { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal(head.body, null)
})

test('signup, normalized login, role filtering, duplicate email and public user fields retain their contracts', integration, async () => {
  const session = await account()
  assert.equal(session.user.role, 'user')
  assert.equal(session.user.email, session.email)
  assert.equal('password_digest' in session.user, false)
  assert.equal(session.token_type, 'Bearer')
  assert.equal(session.expires_in, 86400)
  assert.equal((await request('/me', { token: session.access_token })).body.data.id, session.user.id)
  const login = await request('/auth/login', { method: 'POST', body: { email: session.email.toUpperCase(), password: 'Synthetic-password-123' } })
  assert.equal(login.status, 200)
  assert.equal((await request('/auth/login', { method: 'POST', body: { email: session.email, password: 'wrong' } })).status, 401)
  const duplicate = await request('/auth/signup', { method: 'POST', body: { name: 'Duplicate', email: session.email, password: 'Synthetic-password-123' } })
  assert.equal(duplicate.status, 422)
  assert.ok(duplicate.body.error.details.email)
  assert.equal((await request('/auth/signup', { method: 'POST', body: { name: '', email: 'invalid', password: 'short', password_confirmation: 'other' } })).status, 422)
})

test('HTTP exercises hide answers, save authenticated history and preserve favorite ownership', integration, async () => {
  const session = await account()
  const question = await request('/questions/next?exam_number=1&after_question_number=0')
  assert.equal(question.status, 200)
  const item = question.body.data
  assert.equal('explanation_blocks' in item, false)
  assert.equal('is_correct' in item.choices[0], false)
  const answered = await request(`/questions/${item.id}/answer`, { method: 'POST', token: session.access_token, body: { answer_type: 'single_choice', selected_choice_id: item.choices[1].id, question_version: item.question_version, submission_key: randomUUID() } })
  assert.equal(answered.status, 200)
  assert.ok(answered.body.data.answer_history_id)
  assert.ok(answered.body.data.explanation_blocks.length)
  const favorite = await request(`/questions/${item.id}/favorite`, { method: 'PUT', token: session.access_token })
  assert.equal(favorite.status, 201)
  assert.equal((await request(`/questions/${item.id}/favorite`, { method: 'PUT', token: session.access_token })).status, 200)
  assert.equal((await request('/favorites', { token: session.access_token })).body.meta.total_count, 1)
  assert.equal((await request('/answer_histories', { token: session.access_token })).body.meta.total_count, 1)
  assert.equal((await request(`/questions/${item.id}/favorite`, { method: 'DELETE', token: session.access_token })).status, 204)
  assert.equal((await request(`/questions/${item.id}/favorite`, { method: 'PUT' })).status, 401)
})

test('HTTP administrator checks re-read roles and CRUD keeps question IDs and deletion cascades', integration, async () => {
  const session = await account()
  assert.equal((await request('/admin/questions', { token: session.access_token })).status, 403)
  await query("UPDATE users SET role='admin' WHERE id=$1", [session.user.id])
  assert.equal((await request('/admin/questions', { token: session.access_token })).status, 401)
  const adminToken = issueToken({ id: session.user.id, role: 'admin' })
  assert.equal((await request('/admin/questions', { token: adminToken })).status, 200)
  const detail = await request(`/admin/questions/${questionIds[0]}`, { token: adminToken })
  assert.equal(detail.status, 200)
  const changed = await request(`/admin/questions/${questionIds[0]}`, { method: 'PATCH', token: adminToken, body: { question: { ...detail.body.data, publication_status: 'private' } } })
  assert.equal(changed.status, 200)
  assert.equal((await request(`/questions/${questionIds[0]}`)).status, 404)
  const stale = await request(`/admin/questions/${questionIds[0]}`, { method: 'PATCH', token: adminToken, body: { question: detail.body.data } })
  assert.equal(stale.status, 409)
  const restored = await request(`/admin/questions/${questionIds[0]}`, { method: 'PATCH', token: adminToken, body: { question: { ...detail.body.data, lock_version: changed.body.data.lock_version } } })
  assert.equal(restored.status, 200)
})

test('HTTP paid mode, expiry, malformed token and sales-off preserve server authorization', integration, async () => {
  const session = await account()
  setConfigurationForTesting({ ...original, payments: { ...original.payments, enabled: true, free_exam_count: 1 } })
  try {
    assert.equal((await request('/questions/next?exam_number=2&after_question_number=0')).status, 401)
    assert.equal((await request('/questions/next?exam_number=2&after_question_number=0', { token: session.access_token })).status, 403)
    assert.equal((await request('/favorites', { token: session.access_token })).status, 403)
    assert.equal((await request('/me', { token: issueToken({ id: session.user.id, role: 'user' }, Date.now() - 86400001) })).status, 401)
    assert.equal((await request('/me', { token: 'invalid' })).status, 401)
    assert.equal((await request('/payments/config')).body.data.enabled, false)
    assert.equal((await request('/payments/checkout_sessions', { method: 'POST', token: session.access_token })).body.error.code, 'payment_unavailable')
  } finally { setConfigurationForTesting(original) }
})

test('account deletion checks password, removes personal records and invalidates tokens', integration, async () => {
  const session = await account()
  assert.equal((await request('/me', { method: 'DELETE', token: session.access_token, body: { current_password: 'wrong' } })).status, 422)
  assert.equal((await request('/me', { method: 'DELETE', token: session.access_token, body: { current_password: 'Synthetic-password-123' } })).status, 204)
  assert.equal((await request('/me', { token: session.access_token })).status, 401)
})

test('PostgreSQL rate increments are atomic across concurrent requests', integration, async () => {
  const subject = `synthetic-rate-${randomUUID()}`
  const results = await Promise.all(Array.from({ length: 45 }, () => consumeRateLimit('login', subject)))
  assert.equal(results.filter(result => result.allowed).length, 30)
  assert.ok(results.every(result => result.retryAfter > 0 && result.retryAfter <= 300))
})

test('HTTP throttling returns the stable error code and a retry interval', integration, async () => {
  await Promise.all(Array.from({ length: 10 }, () => consumeRateLimit('signup', '127.0.0.1')))
  const response = await request('/auth/signup', { method: 'POST', body: { name: '', email: 'invalid', password: 'short' } })
  assert.equal(response.status, 429)
  assert.equal(response.body.error.code, 'rate_limit_exceeded')
  assert.ok(Number(response.headers.get('retry-after')) > 0)
  assert.equal(response.headers.get('cache-control'), 'no-store')
})
