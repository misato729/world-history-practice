import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test, { type TestContext } from 'node:test'
import { computed, effectScope, ref, watch, type Ref } from 'vue'
import { EXAM_CONFIG, SITE, hasFullExamAccess } from '../app/utils/examConfig.ts'
import type { AuthUser } from '../shared/types/auth.ts'

const source = readFileSync(new URL('../app/pages/premium/complete.vue', import.meta.url), 'utf8')
const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)![1]!
const setup = new Function('ref', 'computed', 'watch', 'definePageMeta', 'useSeoMeta', 'useAuth', 'hasFullExamAccess',
  'onMounted', 'onBeforeUnmount', 'window', 'SITE',
  `${stripTypeScriptTypes(script.replace(/^import[^\n]*\n/gm, ''))}\nreturn { state, accessLabel, checkMembership }`)
const flush = () => new Promise<void>(done => setImmediate(done))
const member = (id = 1): AuthUser => ({
  id, name: `Member ${id}`, email: `member-${id}@example.test`, role: 'user',
  paid_content_access: false, favorite_questions: [],
  membership: { status: 'free', purchased_at: null, expires_at: null },
})
const purchased = (): AuthUser => ({
  ...member(), paid_content_access: true,
  membership: { status: 'active', purchased_at: '2026-01-01T00:00:00.000Z', expires_at: null },
})
const verification = (): AuthUser => ({
  ...member(), paid_content_access: true, verification_access: { expires_at: '2099-01-01T00:00:00.000Z' },
})

function harness(t: TestContext, initial: AuthUser | null, options: {
  paymentsEnabled?: boolean
  hasSession?: boolean
  refresh?: (user: Ref<AuthUser | null>, attempt: number) => AuthUser | null | void | Promise<AuthUser | null | void>
} = {}) {
  const user = ref<AuthUser | null>(initial)
  const refreshes: boolean[] = []
  const waits: { callback: () => void, delay: number }[] = []
  const mounted: (() => void)[] = []
  const beforeUnmount: (() => void)[] = []
  const auth = {
    user, isLoggedIn: computed(() => options.hasSession === true || user.value !== null),
    ensureCurrentUser: async (force = false) => {
      refreshes.push(force)
      const current = await options.refresh?.(user, refreshes.length)
      return current === undefined ? user.value : current
    },
  }
  const config = structuredClone(EXAM_CONFIG)
  config.payments.enabled = options.paymentsEnabled ?? true
  const scope = effectScope()
  const view = scope.run(() => setup(ref, computed, watch, () => {}, () => {}, () => auth,
    (current: AuthUser | null) => hasFullExamAccess(current, config),
    (callback: () => void) => mounted.push(callback),
    (callback: () => void) => beforeUnmount.push(callback),
    { setTimeout: (callback: () => void, delay: number) => { waits.push({ callback, delay }); return waits.length } }, SITE))!
  let destroyed = false
  const unmount = () => {
    if (destroyed) return
    destroyed = true
    for (const callback of beforeUnmount) callback()
    scope.stop()
  }
  t.after(unmount)
  const advance = async () => {
    const next = waits.shift()
    assert.ok(next, 'A membership retry should be scheduled')
    assert.equal(next.delay, 1500)
    next.callback()
    await flush()
  }
  return { auth, view, refreshes, waits, advance, unmount, mount: () => mounted.forEach(callback => callback()) }
}

test('a cached purchase is confirmed by one successful forced membership response', async t => {
  const { view, refreshes, waits, mount } = harness(t, purchased())
  assert.equal(view.state.value, 'checking')
  mount()
  await flush()
  assert.equal(view.state.value, 'complete')
  assert.deepEqual(refreshes, [true])
  assert.deepEqual(waits, [])
})

test('verification and administrator access require one check and never become purchase confirmation', async t => {
  for (const initial of [verification(), { ...member(), role: 'admin' as const, paid_content_access: true }]) {
    const { view, refreshes, waits, mount } = harness(t, initial)
    assert.equal(view.state.value, 'checking')
    mount()
    await flush()
    assert.equal(view.state.value, 'available')
    assert.equal(view.accessLabel.value, initial.role === 'admin' ? '管理者権限で全問題を利用できます' : '検証用資格で全問題を利用できます')
    assert.deepEqual(refreshes, [true])
    assert.deepEqual(waits, [])
  }
})

test('access with payments disabled is shown after a successful check without claiming a purchase', async t => {
  const { view, refreshes, waits } = harness(t, member(), { paymentsEnabled: false })
  await view.checkMembership()
  assert.equal(view.state.value, 'available')
  assert.equal(view.accessLabel.value, '全問題を利用できます')
  assert.deepEqual(refreshes, [true])
  assert.deepEqual(waits, [])
})

test('a free account retains the bounded eight membership checks and seven retry delays', async t => {
  const { view, refreshes, waits, advance } = harness(t, member())
  const checking = view.checkMembership()
  await flush()
  // Repeated activation while checking must not start a second polling loop.
  await view.checkMembership()
  for (let attempt = 1; attempt < 8; attempt += 1) {
    assert.equal(refreshes.length, attempt)
    await advance()
  }
  await checking
  assert.equal(view.state.value, 'pending')
  assert.deepEqual(refreshes, Array(8).fill(true))
  assert.deepEqual(waits, [])
})

test('a purchase arriving during polling completes and stops further checks', async t => {
  const { auth, view, refreshes, waits, advance } = harness(t, member(), {
    refresh: (user, attempt) => { if (attempt === 2) user.value = purchased() },
  })
  const checking = view.checkMembership()
  await flush()
  await advance()
  await checking
  assert.equal(auth.user.value?.membership.status, 'active')
  assert.equal(view.state.value, 'complete')
  assert.equal(refreshes.length, 2)
  assert.deepEqual(waits, [])
})

test('non-purchase access returned by a check is shown as available', async t => {
  const { view, refreshes, waits } = harness(t, member(), { refresh: user => { user.value = verification() } })
  await view.checkMembership()
  assert.equal(view.state.value, 'available')
  assert.equal(view.accessLabel.value, '検証用資格で全問題を利用できます')
  assert.equal(refreshes.length, 1)
  assert.deepEqual(waits, [])
})

test('a membership snapshot changed during a delay still needs a successful forced response', async t => {
  const { auth, view, refreshes, advance } = harness(t, member())
  const checking = view.checkMembership()
  await flush()
  auth.user.value = purchased()
  assert.equal(view.state.value, 'checking')
  await advance()
  await checking
  assert.equal(view.state.value, 'complete')
  assert.equal(refreshes.length, 2)
})

test('unmounting stops retries and a replacement user cannot inherit purchase confirmation', async t => {
  const first = harness(t, member())
  const checking = first.view.checkMembership()
  await flush()
  first.unmount()
  await first.advance()
  await checking
  assert.equal(first.refreshes.length, 1)

  const second = harness(t, purchased())
  await second.view.checkMembership()
  assert.equal(second.view.state.value, 'complete')
  second.auth.user.value = member(2)
  assert.equal(second.view.state.value, 'pending')
  second.auth.user.value = null
  await second.view.checkMembership()
  assert.deepEqual(second.refreshes, [true])
})

test('an old account lookup finishing after an owner change cannot continue polling', async t => {
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  const { auth, view, refreshes, waits } = harness(t, member(), { refresh: () => pending })
  const checking = view.checkMembership()
  auth.user.value = member(2)
  assert.equal(view.state.value, 'pending')
  release()
  await checking
  assert.equal(view.state.value, 'pending')
  assert.equal(refreshes.length, 1)
  assert.deepEqual(waits, [])
})

test('a cached active purchase that has been revoked never displays purchase confirmation', async t => {
  const { view, refreshes, advance } = harness(t, purchased(), {
    refresh: user => { user.value = { ...member(), membership: { status: 'revoked', purchased_at: null, expires_at: null } } },
  })
  assert.equal(view.state.value, 'checking')
  const checking = view.checkMembership()
  await flush()
  assert.equal(view.state.value, 'checking')
  for (let attempt = 1; attempt < 8; attempt += 1) await advance()
  await checking
  assert.equal(view.state.value, 'pending')
  assert.equal(refreshes.length, 8)
})

test('a cached verification grant that has expired never displays access confirmation', async t => {
  const { view, refreshes, advance } = harness(t, verification(), { refresh: user => { user.value = member() } })
  assert.equal(view.state.value, 'checking')
  const checking = view.checkMembership()
  await flush()
  assert.equal(view.state.value, 'checking')
  for (let attempt = 1; attempt < 8; attempt += 1) await advance()
  await checking
  assert.equal(view.state.value, 'pending')
  assert.equal(refreshes.length, 8)
})

test('failed forced lookups cannot confirm the paid snapshot left in shared state', async t => {
  for (const cached of [purchased(), verification()]) {
    const { auth, view, refreshes, advance } = harness(t, cached, { refresh: () => null })
    const checking = view.checkMembership()
    await flush()
    assert.equal(auth.user.value?.paid_content_access, true)
    assert.equal(view.state.value, 'checking')
    // A cached profile may also be restored while the forced lookup fails.
    auth.user.value = member()
    auth.user.value = cached
    assert.equal(view.state.value, 'checking')
    for (let attempt = 1; attempt < 8; attempt += 1) {
      await advance()
      assert.notEqual(view.state.value, 'complete')
      assert.notEqual(view.state.value, 'available')
    }
    await checking
    assert.equal(view.state.value, 'pending')
    assert.equal(refreshes.length, 8)
  }
})

test('a cold authenticated session resolves its owner before forced purchase confirmation', async t => {
  const { view, refreshes, mount } = harness(t, null, {
    hasSession: true,
    refresh: user => { user.value = purchased() },
  })
  mount()
  await flush()
  await flush()
  assert.equal(view.state.value, 'complete')
  assert.deepEqual(refreshes, [false, true])
})
