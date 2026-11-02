import assert from 'node:assert/strict'
import { createHash, createHmac, randomUUID } from 'node:crypto'
import { createServer as httpServer, type Server } from 'node:http'
import { before, after, test } from 'node:test'
import { createApp, defineEventHandler, toNodeListener } from 'h3'
import { apiHandler } from '../server/api/v1/[...path].ts'
import { createAccount } from '../server/services/accounts.ts'
import { issueToken, type User } from '../server/core/auth.ts'
import { query, getDatabase, closeDatabase } from '../server/core/db.ts'
import { migrate } from '../server/database/migrate.ts'
import { consumeRateLimit, rules } from '../server/core/rate-limit.ts'
import { saveQuestion } from '../server/services/learning-writer.ts'
import { readFile } from 'node:fs/promises'

process.env.APP_ENV = 'test'
process.env.SECRET_KEY_BASE = 'synthetic-reset-' + randomUUID() + randomUUID()
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
const integration = { skip: !process.env.TEST_DATABASE_URL }
const originalEnv = { ...process.env }
let server: Server, relay: Server
let base = ''
const jobs = new Set<Promise<unknown>>()
const emails: string[] = [], messages: string[] = []
let rejectMail = false, holdMail = false, holdGreeting = false
const heldMail = new Set<{ finish: (reject: boolean) => void }>()
const heldGreetings = new Set<{ finish: (reject: boolean) => void }>()
let questionId: number | undefined
const digest = (value: string) => createHash('sha256').update(value).digest('hex')

before(async () => {
  if (integration.skip) return
  assert.match(new URL(process.env.TEST_DATABASE_URL!).pathname, /_test$/)
  await migrate()
  const content = JSON.parse(await readFile(new URL('../../content/questions.json', import.meta.url), 'utf8'))
  questionId = (await saveQuestion(content.questions[0])).id
  relay = httpServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    const envelope = JSON.parse(raw)
    assert.equal(req.method, 'POST')
    assert.equal(req.url, '/exec')
    assert.equal(envelope.signature === createHmac('sha256', 'a'.repeat(64)).update(envelope.payload).digest('hex'), true)
    const data = JSON.parse(envelope.payload)
    const held = { finish(rejected: boolean) {
      if (!rejected) messages.push(envelope.payload)
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: !rejected, request_id: data.request_id }))
    } }
    if (holdGreeting) heldGreetings.add(held)
    else if (holdMail) heldMail.add(held)
    else held.finish(rejectMail)
  })
  await new Promise<void>(resolve => relay.listen(0, '127.0.0.1', resolve))
  Object.assign(process.env, { PASSWORD_RESET_ENABLED: 'true', PASSWORD_RESET_GAS_URL: `http://127.0.0.1:${(relay.address() as {port:number}).port}/exec`, PASSWORD_RESET_GAS_SECRET: 'a'.repeat(64), FRONTEND_URL: 'http://localhost:3200' })
  const app = createApp()
  app.use(defineEventHandler(event => {
    Object.assign(event, { waitUntil: (job: Promise<unknown>) => { jobs.add(job); void job.finally(() => jobs.delete(job)) } })
    return apiHandler(event)
  }))
  server = httpServer(toNodeListener(app))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/v1`
})

after(async () => {
  await Promise.all(jobs)
  if (server) await new Promise<void>(resolve => server.close(() => resolve()))
  if (relay) await new Promise<void>(resolve => relay.close(() => resolve()))
  if (!integration.skip) await query('DELETE FROM users WHERE email=ANY($1)', [emails])
  if (questionId) await query('DELETE FROM questions WHERE id=$1', [questionId])
  process.env = originalEnv
  await closeDatabase()
})

async function account() {
  const email = `reset-${randomUUID()}@example.invalid`; emails.push(email)
  const user = await createAccount({ name: 'Reset synthetic user', email, password: 'Original-password-123' })
  return { user, token: issueToken(user), email }
}
async function call(path: string, body?: unknown, token?: string, method = body ? 'POST' : 'GET') {
  const response = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null, headers: response.headers }
}
async function requestLink(email: string) {
  const start = messages.length
  const response = await call('/auth/forgot-password', { email })
  assert.equal(response.status, 202)
  await Promise.all(jobs)
  assert.equal(messages.length, start + 1)
  return { ...capturedMessage(messages[start]!), response }
}
function capturedMessage(message: string) {
  const data = JSON.parse(message)
  assert.match(data.token, /^[A-Za-z0-9_-]{43}$/)
  assert.equal(data.origin, 'http://localhost:3200')
  return { secret: data.token as string, message }
}
const reset = (token: string, password = 'Replacement-password-456') => call('/auth/reset-password', { token, password, password_confirmation: password })

test('reset requests hide account existence, store only hashes, and return before the GAS relay completes', integration, async () => {
  const { email, user } = await account()
  const count = messages.length
  const missing = await call('/auth/forgot-password', { email: `absent-${randomUUID()}@example.invalid` })
  await Promise.all(jobs)
  assert.equal(messages.length, count)
  const sent = await requestLink(' ' + email.toUpperCase() + ' ')
  assert.equal(sent.response.status, missing.status)
  assert.deepEqual(sent.response.body, missing.body)
  assert.equal(sent.response.headers.get('cache-control'), 'no-store')
  const [row] = await query('SELECT * FROM password_reset_tokens WHERE user_id=$1', [user.id])
  assert.equal(row!.token_digest === digest(sent.secret), true)
  assert.equal(JSON.stringify(row).includes(sent.secret), false)
  assert.equal(row!.auth_version, 0)
  const remaining = new Date(row!.expires_at).getTime() - Date.now()
  assert.ok(remaining > 29 * 60 * 1000 && remaining <= 30 * 60 * 1000)
  assert.equal(JSON.stringify(sent.response.body).includes(sent.secret), false)
  assert.equal((await call('/auth/forgot-password', { email: 'bad' })).status, 422)
})

test('reset validation preserves tokens; concurrent use succeeds once and revokes all previous sessions', integration, async () => {
  const { user, token, email } = await account()
  await query(`INSERT INTO verification_access_grants(user_id,reason,granted_by,expires_at,created_at,updated_at) VALUES($1,'Synthetic reset fixture','Synthetic test',CURRENT_TIMESTAMP+INTERVAL '1 hour',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, [user.id])
  const item = (await call(`/questions/${questionId}`)).body.data
  assert.equal((await call(`/questions/${questionId}/favorite`, undefined, token, 'PUT')).status, 201)
  assert.equal((await call(`/questions/${questionId}/answer`, { answer_type: 'single_choice', selected_choice_id: item.choices[0].id, question_version: item.question_version, submission_key: randomUUID() }, token)).status, 200)
  const favorites = await query('SELECT * FROM favorites WHERE user_id=$1 ORDER BY id', [user.id])
  const histories = await query('SELECT * FROM answer_histories WHERE user_id=$1 ORDER BY id', [user.id])
  const { secret } = await requestLink(email)
  const [before] = await query<User>('SELECT * FROM users WHERE id=$1', [user.id])
  assert.equal((await call('/auth/reset-password', { token: secret, password: 'short', password_confirmation: 'short' })).status, 422)
  assert.equal((await call('/auth/reset-password', { token: secret, password: 'Valid-password', password_confirmation: 'different' })).status, 422)
  assert.equal((await reset(secret, 'あ'.repeat(25))).status, 422)
  assert.equal((await reset(secret, 'Original-password-123')).status, 422)
  assert.equal((await reset('B'.repeat(43))).body.error.code, 'invalid_reset_token')
  const unchanged = (await query<User>('SELECT * FROM users WHERE id=$1', [user.id]))[0]!
  assert.equal(JSON.stringify(unchanged) === JSON.stringify(before), true)
  const results = await Promise.all([reset(secret), reset(secret)])
  assert.deepEqual(results.map(r => r.status).sort(), [200, 422])
  assert.equal((await reset(secret)).body.error.code, 'invalid_reset_token')
  assert.equal((await query('SELECT * FROM password_reset_tokens WHERE user_id=$1', [user.id])).length, 0)
  assert.equal((await call('/me', undefined, token)).status, 401)
  assert.equal((await call('/auth/login', { email, password: 'Original-password-123' })).status, 401)
  const login = await call('/auth/login', { email, password: 'Replacement-password-456' })
  assert.equal(login.status, 200)
  assert.equal((await call('/me', undefined, login.body.data.access_token)).status, 200)
  const [after] = await query<User>('SELECT * FROM users WHERE id=$1', [user.id])
  assert.equal(after!.auth_version, 1)
  for (const field of ['id', 'name', 'email', 'role', 'created_at'] as const) assert.equal(JSON.stringify(before![field]) === JSON.stringify(after![field]), true)
  assert.equal(JSON.stringify(await query('SELECT * FROM favorites WHERE user_id=$1 ORDER BY id', [user.id])) === JSON.stringify(favorites), true)
  assert.equal(JSON.stringify(await query('SELECT * FROM answer_histories WHERE user_id=$1 ORDER BY id', [user.id])) === JSON.stringify(histories), true)
})

test('GAS relay response delay does not delay the generic HTTP response', integration, async () => {
  const { email } = await account(), count = messages.length
  holdGreeting = true
  try {
    const result = await call('/auth/forgot-password', { email })
    assert.equal(result.status, 202)
    assert.equal(messages.length, count)
    assert.ok(jobs.size > 0)
  } finally {
    holdGreeting = false
    for (const held of heldGreetings) held.finish(false)
    heldGreetings.clear()
  }
  await Promise.all(jobs)
  assert.equal(messages.length, count + 1)
})

test('a reset waiting on the user lock cannot use a link that expires while it waits', integration, async () => {
  const { user, email } = await account(), { secret } = await requestLink(email)
  const blocker = await getDatabase().connect()
  let pending: ReturnType<typeof reset> | undefined
  try {
    await blocker.query('BEGIN')
    await blocker.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user.id])
    const pid = (await blocker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid
    pending = reset(secret)
    let waiting = false
    for (let index = 0; index < 200; index++) {
      const [row] = await query('SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))) waiting', [pid])
      if (row!.waiting) { waiting = true; break }
      await new Promise(resolve => setTimeout(resolve, 5))
    }
    assert.equal(waiting, true)
    await blocker.query("UPDATE password_reset_tokens SET expires_at=clock_timestamp()+INTERVAL '100 milliseconds' WHERE user_id=$1", [user.id])
    await new Promise(resolve => setTimeout(resolve, 150))
    await blocker.query('COMMIT')
    assert.equal((await pending).body.error.code, 'invalid_reset_token')
  } finally { await blocker.query('ROLLBACK'); blocker.release(); if (pending) await pending }
  assert.equal((await query<User>('SELECT auth_version FROM users WHERE id=$1', [user.id]))[0]!.auth_version, 0)
})

test('new requests invalidate earlier links, expiry is enforced and password changes invalidate outstanding links', integration, async () => {
  const first = await account()
  const old = await requestLink(first.email), recent = await requestLink(first.email)
  assert.equal((await reset(old.secret)).body.error.code, 'invalid_reset_token')
  await query("UPDATE password_reset_tokens SET expires_at=clock_timestamp()-INTERVAL '1 second' WHERE user_id=$1", [first.user.id])
  assert.equal((await reset(recent.secret)).body.error.code, 'invalid_reset_token')
  const active = await requestLink(first.email)
  assert.equal((await call('/auth/forgot-password', { email: first.email })).status, 429)
  assert.equal((await call('/me/password', { current_password: 'Original-password-123', password: 'Changed-directly-789', password_confirmation: 'Changed-directly-789' }, first.token, 'PATCH')).status, 200)
  assert.equal((await reset(active.secret)).body.error.code, 'invalid_reset_token')
})

test('GAS relay rejection does not disclose membership and removes the undelivered token', integration, async () => {
  const { email, user } = await account()
  rejectMail = true
  const errors: unknown[][] = [], previous = console.error
  console.error = (...args: unknown[]) => { errors.push(args) }
  try {
    const known = await call('/auth/forgot-password', { email })
    const absent = await call('/auth/forgot-password', { email: `absent-${randomUUID()}@example.invalid` })
    await Promise.all(jobs)
    assert.equal(known.status, 202)
    assert.deepEqual(known.body, absent.body)
    assert.equal((await query('SELECT * FROM password_reset_tokens WHERE user_id=$1', [user.id])).length, 0)
    assert.equal(errors.length, 1)
    assert.equal(JSON.stringify(errors).includes(email), false)
    assert.equal(JSON.stringify(errors).includes('password_reset_delivery_failed'), true)
  } finally { console.error = previous; rejectMail = false }
  process.env.PASSWORD_RESET_ENABLED = 'false'
  try {
    assert.equal((await call('/auth/forgot-password', { email })).status, 503)
    assert.equal((await call('/auth/forgot-password', { email: 'absent@example.invalid' })).status, 503)
  } finally { process.env.PASSWORD_RESET_ENABLED = 'true' }
})

test('a delayed failure from an earlier email cannot remove the latest reset token', integration, async () => {
  const { email, user } = await account()
  holdMail = true
  let latest = ''
  try {
    assert.equal((await call('/auth/forgot-password', { email })).status, 202)
    for (let index = 0; heldMail.size === 0 && index < 200; index++) await new Promise(resolve => setTimeout(resolve, 5))
    assert.equal(heldMail.size, 1)
    holdMail = false
    const count = messages.length
    assert.equal((await call('/auth/forgot-password', { email })).status, 202)
    for (let index = 0; messages.length === count && index < 200; index++) await new Promise(resolve => setTimeout(resolve, 5))
    assert.equal(messages.length, count + 1)
    latest = capturedMessage(messages[count]!).secret
  } finally {
    holdMail = false
    for (const held of heldMail) held.finish(true)
    heldMail.clear()
    const previous = console.error; console.error = () => {}
    try { await Promise.all(jobs) } finally { console.error = previous }
  }
  const [row] = await query('SELECT token_digest FROM password_reset_tokens WHERE user_id=$1', [user.id])
  assert.equal(row!.token_digest === digest(latest), true)
  assert.equal((await reset(latest)).status, 200)
})

test('the shared delivery cap fails closed without disclosing membership or changing the password', integration, async () => {
  const { email, user } = await account(), count = messages.length
  for (let i = 0; i <= rules.password_reset_delivery.limit; i++) await consumeRateLimit('password_reset_delivery', 'gas-mail')
  const previous = console.error; console.error = () => {}
  try {
    const known = await call('/auth/forgot-password', { email })
    const absent = await call('/auth/forgot-password', { email: `absent-${randomUUID()}@example.invalid` })
    await Promise.all(jobs)
    assert.equal(known.status, 202)
    assert.deepEqual(known.body, absent.body)
    assert.equal(messages.length, count)
    assert.equal((await query('SELECT * FROM password_reset_tokens WHERE user_id=$1', [user.id])).length, 0)
    assert.equal((await query<User>('SELECT auth_version FROM users WHERE id=$1', [user.id]))[0]!.auth_version, 0)
  } finally { console.error = previous }
})

test('IP rate limits reject further reset requests and submissions without changing passwords', integration, async () => {
  for (const scope of ['password_reset_request_ip', 'password_reset_submit'] as const) {
    for (let index = 0; index <= rules[scope].limit; index++) await consumeRateLimit(scope, '127.0.0.1')
  }
  assert.equal((await call('/auth/forgot-password', { email: 'absent@example.invalid' })).status, 429)
  assert.equal((await reset('B'.repeat(43))).status, 429)
})
