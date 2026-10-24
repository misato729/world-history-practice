import assert from 'node:assert/strict'
import test from 'node:test'
import { ofetch } from 'ofetch'
import { computed, ref } from 'vue'
import { useApiStatus } from '../app/composables/useApiStatus.ts'

const globals = globalThis as any
globals.computed = computed
globals.defineNuxtPlugin = (setup: unknown) => setup
globals.useApiStatus = useApiStatus
globals.useRuntimeConfig = () => ({ public: { apiBase: 'https://api.example.invalid' } })
globals.useRoute = () => ({ fullPath: '/favorites', meta: { middleware: 'auth' } })
const { default: setupApi } = await import('../app/plugins/api.ts')

const createClient = (fetch: typeof globalThis.fetch) => {
  const states = new Map()
  globals.useState = (key: string, init: () => unknown) => {
    if (!states.has(key)) states.set(key, ref(init()))
    return states.get(key)
  }
  const token = ref<string | null>('current-token')
  let logoutCalls = 0
  globals.useAuth = () => ({ accessToken: token, logout: () => { token.value = null; logoutCalls += 1 } })
  globals.$fetch = ofetch.create({}, { fetch })
  const result = (setupApi as any)({ runWithContext: (fn: () => unknown) => fn() })
  return { api: result.provide.api, status: useApiStatus().apiStatus, token, logoutCalls: () => logoutCalls }
}

test('API state starts idle and counts simultaneous requests', async () => {
  const resolvers: Array<(response: Response) => void> = []
  const client = createClient(async () => await new Promise<Response>(resolve => { resolvers.push(resolve) }))
  assert.equal(client.status.value, 'idle')
  const first = client.api('/first')
  const second = client.api('/second')
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(client.status.value, 'checking')
  resolvers[0]!(new Response('{}', { status: 200 }))
  await first
  assert.equal(client.status.value, 'checking')
  resolvers[1]!(new Response('{}', { status: 200 }))
  await second
  assert.equal(client.status.value, 'connected')
})

test('HTTP 4xx is reachable while server and network failures are failed', async () => {
  const reachable = createClient(async () => new Response('{}', { status: 422 }))
  await assert.rejects(reachable.api('/validation', { retry: 0 }))
  assert.equal(reachable.status.value, 'connected')

  const server = createClient(async () => new Response('{}', { status: 503 }))
  await assert.rejects(server.api('/unavailable', { retry: 0 }))
  assert.equal(server.status.value, 'failed')

  const network = createClient(async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(network.api('/offline', { retry: 0 }))
  assert.equal(network.status.value, 'failed')
})

test('rate-limited actions preserve the session and expose the server retry advice without retrying', async () => {
  let calls = 0
  const client = createClient(async () => {
    calls += 1
    return new Response(JSON.stringify({ error: { code: 'rate_limit_exceeded', message: 'Please wait before retrying' } }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '30' },
    })
  })
  await assert.rejects(client.api('/answer', { method: 'POST', headers: { Authorization: 'Bearer current-token' } }), (error: any) => {
    assert.equal(error.data.error.code, 'rate_limit_exceeded')
    assert.equal(error.data.error.message, 'Please wait before retrying')
    assert.equal(error.response.headers.get('Retry-After'), '30')
    return true
  })
  assert.equal(calls, 1)
  assert.equal(client.token.value, 'current-token')
  assert.equal(client.logoutCalls(), 0)
  assert.equal(client.status.value, 'connected')
})

test('navigation cancellation does not report a connection failure', async () => {
  const controller = new AbortController()
  const client = createClient(async (_input, options) => {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    return new Response('{}', { status: 200 })
  })
  await client.api('/success')
  controller.abort()
  await assert.rejects(client.api('/canceled', { signal: controller.signal, retry: 0 }))
  assert.equal(client.status.value, 'connected')
})

test('only a 401 for the current authenticated request clears the session', async () => {
  const client = createClient(async () => new Response('{}', { status: 401 }))
  await assert.rejects(client.api('/auth/login', { retry: 0 }))
  assert.equal(client.logoutCalls(), 0)
  await assert.rejects(client.api('/stale', { headers: { Authorization: 'Bearer old-token' }, retry: 0 }))
  assert.equal(client.logoutCalls(), 0)
  await assert.rejects(client.api('/me', { headers: { Authorization: 'Bearer current-token' }, retry: 0 }))
  assert.equal(client.logoutCalls(), 1)
  assert.equal(client.token.value, null)
  assert.equal(client.status.value, 'connected')
})
