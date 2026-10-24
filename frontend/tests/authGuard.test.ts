import assert from 'node:assert/strict'
import test from 'node:test'

const globals = globalThis as any
globals.defineNuxtRouteMiddleware = (guard: unknown) => guard
globals.navigateTo = (target: unknown) => target
const { default: guard } = await import('../app/middleware/auth.ts')

test('anonymous users return to the complete original URL after login', () => {
  globals.useAuth = () => ({ isLoggedIn: { value: false } })
  for (const path of ['/history', '/favorites?page=2', '/account#profile', '/premium/complete?session_id=example']) {
    assert.deepEqual((guard as any)({ fullPath: path }), { path: '/login', query: { redirect: path } })
  }
})

test('signed-in navigation does not wait for an additional API check', () => {
  globals.useAuth = () => ({ isLoggedIn: { value: true } })
  assert.equal((guard as any)({ fullPath: '/favorites' }), undefined)
})
