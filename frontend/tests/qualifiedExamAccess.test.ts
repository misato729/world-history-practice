import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { computed, effectScope, onScopeDispose, ref, watch } from 'vue'
import { hasFullExamAccess } from '../app/utils/examConfig.ts'
import type { AuthUser } from '../shared/types/auth.ts'

const source = readFileSync(new URL('../app/composables/useQualifiedExamAccess.ts', import.meta.url), 'utf8')
const factory = new Function('computed', 'onMounted', 'onScopeDispose', 'ref', 'watch', 'useAuth', 'hasFullExamAccess', 'setTimeout', 'clearTimeout',
  stripTypeScriptTypes(source.replace(/^import[^\n]*\n/gm, '').replace('export const', 'const')) + '\nreturn useQualifiedExamAccess')
const member = (kind = 'free'): AuthUser => ({
  id: 1, name: 'Synthetic', email: 'synthetic@example.invalid', role: kind === 'admin' ? 'admin' : 'user',
  paid_content_access: kind !== 'free', favorite_questions: [],
  membership: { status: kind === 'premium' ? 'active' : 'free', purchased_at: null, expires_at: null },
  verification_access: kind === 'verification' ? { expires_at: new Date(Date.now() + 60000).toISOString() } : null,
})
const flush = () => new Promise<void>(done => setImmediate(done))
function harness(initial: AuthUser | null, token: string | null = 'synthetic-session') {
  const user = ref(initial), accessToken = ref(token), enabled = ref(true)
  const pending: { token: string | null; resolve: (value: AuthUser | null) => void }[] = []
  const timers: (() => void)[] = [], mounted: (() => void)[] = []
  let calls = 0
  const scope = effectScope()
  const useGate = factory(computed, (fn: () => void) => mounted.push(fn), onScopeDispose, ref, watch, () => ({
    accessToken, user, ensureCurrentUser: (force: boolean) => {
      assert.equal(force, true); calls++
      const originalToken = accessToken.value
      return new Promise<AuthUser | null>(resolve => pending.push({ token: originalToken, resolve: value => {
        if (accessToken.value !== originalToken) { resolve(null); return }
        if (value) user.value = value
        resolve(value)
      } }))
    },
  }), hasFullExamAccess, (fn: () => void) => { timers.push(fn); return timers.length }, () => {})
  const gate = scope.run(() => useGate(computed(() => enabled.value)))!
  mounted.forEach(fn => fn())
  return { gate, user, accessToken, enabled, pending, timers, calls: () => calls, dispose: () => scope.stop() }
}

test('anonymous homepage requires neither qualification nor question catalog', () => {
  const h = harness(null, null)
  assert.equal(h.calls(), 0); assert.equal(h.gate.allowed.value, false); h.dispose()
})
for (const role of ['free', 'premium', 'admin', 'verification']) {
  test(`${role}: cached entitlement stays blocked until fresh qualification completes`, async () => {
    const h = harness(member(role))
    assert.equal(h.gate.allowed.value, false); assert.equal(h.gate.status.value, 'pending')
    h.pending[0]!.resolve(member(role)); await flush()
    assert.equal(h.gate.allowed.value, role !== 'free'); h.dispose()
  })
}
test('failed /me never authorizes a stale premium user', async () => {
  const h = harness(member('premium')); h.pending[0]!.resolve(null); await flush()
  assert.equal(h.gate.allowed.value, false); assert.equal(h.gate.status.value, 'error'); h.dispose()
})
test('same-user session replacement and logout immediately invalidate qualification', async () => {
  const h = harness(member('premium')); h.pending[0]!.resolve(member('premium')); await flush()
  assert.equal(h.gate.allowed.value, true)
  h.accessToken.value = 'replacement-session'
  assert.equal(h.gate.allowed.value, false)
  h.pending[1]!.resolve(member('free')); await flush()
  assert.equal(h.gate.allowed.value, false)
  h.accessToken.value = null; h.user.value = null
  assert.equal(h.gate.allowed.value, false); h.dispose()
})
test('delayed old session qualification cannot authorize a replacement free session', async () => {
  const h = harness(member('premium'))
  h.accessToken.value = 'replacement-session'
  h.pending[0]!.resolve(member('premium')); await flush()
  assert.equal(h.gate.allowed.value, false)
  h.pending[1]!.resolve(member('free')); await flush()
  assert.equal(h.gate.allowed.value, false); h.dispose()
})
test('expired verification and expiry after verification cannot authorize catalogs', async () => {
  const expired = member('verification'); expired.verification_access!.expires_at = '2000-01-01T00:00:00Z'
  const h = harness(expired); h.pending[0]!.resolve(expired); await flush()
  assert.equal(h.gate.allowed.value, false); h.dispose()
  const valid = harness(member('verification')); valid.pending[0]!.resolve(member('verification')); await flush()
  assert.equal(valid.gate.allowed.value, true)
  valid.timers[0]!(); assert.equal(valid.gate.allowed.value, false); valid.dispose()
})
test('late results after leaving the scope are discarded', async () => {
  const h = harness(member('premium')); h.dispose(); h.pending[0]!.resolve(member('premium')); await flush()
  assert.equal(h.gate.allowed.value, false)
})
