import assert from 'node:assert/strict'
import test, { beforeEach, afterEach } from 'node:test'
import { EXAM_CONFIG } from '../app/utils/examConfig.ts'
import { computed, ref } from 'vue'
import { useAuth, type AuthUser } from '../app/composables/useAuth.ts'
import { useFavorites } from '../app/composables/useFavorites.ts'

const initialPaymentMode = EXAM_CONFIG.payments.enabled
beforeEach(() => { EXAM_CONFIG.payments.enabled = true })
afterEach(() => { EXAM_CONFIG.payments.enabled = initialPaymentMode })

const globals = globalThis as any
globals.computed = computed
globals.useAuth = useAuth

const user: AuthUser = {
  id: 1, name: 'Test User', email: 'test@example.invalid', role: 'user', paid_content_access: false,
  membership: { status: 'free', purchased_at: null, expires_at: null },
  favorite_questions: [],
}

const createAuth = (token: string | null, api: (...args: any[]) => Promise<unknown>) => {
  const states = new Map()
  const cookie = ref(token)
  let cookieCalls = 0
  const app = { $api: api }
  globals.useNuxtApp = () => app
  globals.useCookie = () => { cookieCalls += 1; return cookie }
  globals.useState = (key: string, init: () => unknown) => {
    if (!states.has(key)) states.set(key, ref(init()))
    return states.get(key)
  }
  return { auth: useAuth(), states, cookieCalls: () => cookieCalls }
}

test('anonymous users do not trigger a current-user request', async () => {
  let requests = 0
  const { auth } = createAuth(null, async () => { requests += 1 })
  assert.equal(await auth.ensureCurrentUser(), null)
  assert.equal(requests, 0)
})

test('composables share the cookie and deduplicate concurrent user requests', async () => {
  let requests = 0
  let resolve!: (response: unknown) => void
  const harness = createAuth('session-token', async () => {
    requests += 1
    return await new Promise(done => { resolve = done })
  })
  const other = useAuth()
  assert.equal(harness.auth.accessToken, other.accessToken)
  assert.equal(harness.cookieCalls(), 1)
  const first = harness.auth.ensureCurrentUser()
  const second = other.ensureCurrentUser()
  assert.equal(requests, 1)
  resolve({ data: user })
  assert.deepEqual(await first, user)
  assert.deepEqual(await second, user)
  assert.deepEqual(await other.ensureCurrentUser(), user)
  assert.equal(requests, 1)
})

test('an old in-flight response cannot restore a logged-out session', async () => {
  let resolve!: (response: unknown) => void
  const { auth } = createAuth('session-token', async () => await new Promise(done => { resolve = done }))
  const request = auth.ensureCurrentUser()
  auth.logout()
  resolve({ data: user })
  assert.equal(await request, null)
  assert.equal(auth.user.value, null)
  assert.equal(auth.accessToken.value, null)
  assert.deepEqual(useFavorites().favoriteIds.value, [])
})

test('login hydrates all sidebar favorites without fetching a favorites endpoint', async () => {
  const calls: string[] = []
  const paid = { ...user, paid_content_access: true, favorite_questions: [{ id: 17, exam_number: 2, question_number: 3 }] }
  const { auth } = createAuth(null, async (path) => {
    calls.push(path)
    return { data: { access_token: 'paid-token', user: paid } }
  })
  const sidebar = useFavorites()
  await auth.login({ email: user.email, password: 'test-only' })
  assert.equal(sidebar.isFavoriteAt(2, 3), true)
  assert.deepEqual(sidebar.favoriteIds.value, [17])
  await auth.ensureCurrentUser()
  assert.deepEqual(calls, ['/api/v1/auth/login'])
  auth.logout()
  assert.equal(sidebar.isFavoriteAt(2, 3), false)
})

test('logout clears authentication and paid favorites without an API request', async () => {
  const calls: string[] = []
  const paid = { ...user, paid_content_access: true, favorite_questions: [{ id: 17, exam_number: 2, question_number: 3 }] }
  const { auth } = createAuth(null, async (path) => {
    calls.push(path)
    return { data: { access_token: 'test-session', user: paid } }
  })
  await auth.login({ email: user.email, password: 'test-only' })
  auth.logout()
  assert.equal(auth.accessToken.value, null)
  assert.equal(auth.user.value, null)
  assert.equal(auth.isLoggedIn.value, false)
  assert.deepEqual(auth.authHeaders.value, {})
  assert.deepEqual(useFavorites().favoriteIds.value, [])
  assert.deepEqual(calls, ['/api/v1/auth/login'])
})

test('initial user request hydrates favorites once and mutations only send PUT or DELETE', async () => {
  const calls: Array<[string, string | undefined]> = []
  const question = { id: 23, exam_number: 3, question_number: 8 }
  const paid = { ...user, paid_content_access: true, favorite_questions: [] }
  const { auth } = createAuth('paid-token', async (path, options) => {
    calls.push([path, options?.method])
    return path === '/api/v1/me' ? { data: paid } : { data: { question } }
  })
  const favorites = useFavorites()
  await auth.ensureCurrentUser()
  const other = useFavorites()
  await favorites.toggleFavorite(question)
  assert.equal(other.isFavoriteAt(3, 8), true)
  await other.toggleFavorite(question)
  assert.equal(favorites.isFavoriteAt(3, 8), false)
  assert.deepEqual(calls, [['/api/v1/me', undefined], ['/api/v1/questions/23/favorite', 'PUT'], ['/api/v1/questions/23/favorite', 'DELETE']])
})

test('verification access uses the server entitlement without pretending a purchase', async () => {
  const calls: string[] = []
  const verification = {
    ...user,
    paid_content_access: true,
    verification_access: { expires_at: '2026-10-20T00:00:00Z' },
    favorite_questions: [{ id: 61, exam_number: 6, question_number: 1 }],
  }
  const { auth } = createAuth('verification-token', async (path) => {
    calls.push(path)
    return { data: verification }
  })
  await auth.ensureCurrentUser()
  assert.equal(auth.user.value?.role, 'user')
  assert.equal(auth.user.value?.membership.status, 'free')
  assert.equal(auth.user.value?.membership.purchased_at, null)
  assert.equal(useFavorites().canUseFavorites.value, true)
  assert.equal(useFavorites().isFavoriteAt(6, 1), true)
  assert.deepEqual(calls, ['/api/v1/me'])
})

test('anonymous and free sessions never request favorites', async () => {
  let requests = 0
  const { auth } = createAuth(null, async () => { requests += 1; return { data: user } })
  const favorites = useFavorites()
  const question = { id: 1, exam_number: 1, question_number: 1 }
  await assert.rejects(favorites.toggleFavorite(question))
  auth.user.value = { ...user, favorite_questions: [question] }
  auth.accessToken.value = 'free-token'
  assert.equal(favorites.canUseFavorites.value, false)
  assert.equal(favorites.isFavoriteAt(1, 1), false)
  await assert.rejects(favorites.toggleFavorite(question))
  assert.equal(requests, 0)
})

test('stale mutations cannot mark another session favorites', async () => {
  let resolve!: (value: unknown) => void
  const question = { id: 8, exam_number: 1, question_number: 8 }
  const { auth } = createAuth('first-token', async () => await new Promise(done => { resolve = done }))
  auth.user.value = { ...user, paid_content_access: true, favorite_questions: [] }
  const favorites = useFavorites()
  const mutation = favorites.toggleFavorite(question)
  auth.logout()
  auth.accessToken.value = 'second-token'
  auth.user.value = { ...user, id: 2, paid_content_access: true, favorite_questions: [] }
  resolve({ data: { question } })
  await mutation
  assert.equal(favorites.isFavorite(question.id), false)
})

test('failed mutations retain the existing favorite colors without a reload request', async () => {
  let requests = 0
  const question = { id: 8, exam_number: 1, question_number: 8 }
  const { auth } = createAuth('paid-token', async () => {
    requests += 1
    throw new Error('Network failure')
  })
  auth.user.value = { ...user, paid_content_access: true, favorite_questions: [question] }
  const favorites = useFavorites()
  await assert.rejects(favorites.toggleFavorite(question))
  assert.equal(favorites.isFavoriteAt(1, 8), true)
  assert.equal(requests, 1)
})

test('permission loss clears coloring without fetching user data again', async () => {
  let requests = 0
  const question = { id: 8, exam_number: 1, question_number: 8 }
  const { auth } = createAuth('paid-token', async () => {
    requests += 1
    throw { data: { error: { code: 'paid_membership_required' } } }
  })
  auth.user.value = { ...user, paid_content_access: true, favorite_questions: [question] }
  const favorites = useFavorites()
  await assert.rejects(favorites.toggleFavorite(question))
  assert.equal(favorites.canUseFavorites.value, false)
  assert.deepEqual(favorites.favoriteIds.value, [])
  assert.equal(requests, 1)
})

test('user state and tokens are isolated between Nuxt app instances', async () => {
  const first = createAuth('first-token', async () => ({ data: user })).auth
  const secondUser = { ...user, id: 2 }
  const second = createAuth('second-token', async () => ({ data: secondUser })).auth
  await first.ensureCurrentUser()
  await second.ensureCurrentUser()
  assert.equal(first.user.value?.id, 1)
  assert.equal(second.user.value?.id, 2)
  first.logout()
  assert.equal(second.accessToken.value, 'second-token')
  assert.equal(second.user.value?.id, 2)
})


test('free service mode lets signed-in members save favorites without a paid entitlement', async () => {
  EXAM_CONFIG.payments.enabled = false
  const question = { id: 1, exam_number: 1, question_number: 1 }
  let calls = 0
  const { auth } = createAuth('free-token', async () => { calls += 1; return { data: { question } } })
  auth.user.value = { ...user, favorite_questions: [] }
  const favorites = useFavorites()
  assert.equal(favorites.canUseFavorites.value, true)
  await favorites.toggleFavorite(question)
  assert.equal(favorites.isFavoriteAt(1, 1), true)
  assert.equal(calls, 1)
  auth.logout()
  assert.equal(favorites.canUseFavorites.value, false)
})
