import assert from 'node:assert/strict'
import test from 'node:test'
import { computed, effectScope, ref, shallowRef, watch } from 'vue'
import { achievementStatus } from '../shared/achievement.ts'
import { useAchievementReport } from '../app/composables/useAchievementReport.ts'

test('achievement uses the two latest results, distinguishing no history from nullable reference grades', () => {
  for (const [results, status] of [
    [[], 'unanswered'], [[true], 'correct'], [[false], 'incorrect'],
    [[true, true], 'mastered'], [[true, false], 'correct'],
    [[false, true], 'incorrect'], [[false, false], 'struggling'],
    [[null], 'reference'], [[null, null], 'reference'], [[true, null], 'correct'], [[false, null], 'incorrect'],
  ] as const) assert.equal(achievementStatus(results), status)
})

function harness(token: string | null = 'first-session') {
  const accessToken = ref(token)
  const user = ref({ id: 1, paid_content_access: true })
  const requests: { resolve: (result: unknown) => void; reject: () => void; signal: AbortSignal; headers: object; path: string }[] = []
  let unmount!: () => void
  Object.assign(globalThis, {
    computed, ref, shallowRef, watch,
    onBeforeUnmount: (fn: () => void) => { unmount = fn },
    useAuth: () => ({ accessToken, user, authHeaders: computed(() => ({ Authorization: `Bearer ${accessToken.value}` })) }),
    useNuxtApp: () => ({ $api: (path: string, options: any) => new Promise((resolve, reject) => {
      requests.push({ resolve, reject: () => reject(new Error('Synthetic failure')), signal: options.signal, headers: options.headers, path })
    }) }),
  })
  const scope = effectScope()
  const loader = scope.run(() => useAchievementReport())!
  const dispose = () => { unmount(); scope.stop() }
  return { accessToken, user, requests, loader, dispose }
}
const report = (total: number) => ({ exams: [], total_count: total, answered_count: 0, full_access: false })
const flush = async () => { await Promise.resolve(); await Promise.resolve() }

test('anonymous accounts make no report or question requests', () => {
  const h = harness(null)
  assert.equal(h.requests.length, 0)
  assert.equal(h.loader.loading.value, false)
  assert.equal(h.loader.report.value, null)
  h.dispose()
})

test('session changes cancel requests and ignore responses from old sessions', async () => {
  const h = harness()
  assert.equal(h.requests[0]!.path, '/api/v1/me/achievement')
  h.accessToken.value = 'new-session'
  assert.equal(h.requests[0]!.signal.aborted, true)
  h.requests[1]!.resolve({ data: report(2) }); await flush()
  h.requests[0]!.resolve({ data: report(99) }); await flush()
  assert.equal(h.loader.report.value?.total_count, 2)
  h.accessToken.value = null
  assert.equal(h.loader.report.value, null)
  assert.equal(h.loader.loading.value, false)
  h.dispose()
})

test('entitlement changes erase old paid results and a same-user new session reloads', async () => {
  const h = harness()
  h.requests[0]!.resolve({ data: report(30) }); await flush()
  h.user.value.paid_content_access = false
  assert.equal(h.loader.report.value, null)
  h.requests[1]!.resolve({ data: report(5) }); await flush()
  assert.equal(h.loader.report.value?.total_count, 5)
  h.accessToken.value = 'replacement-session-for-same-user'
  assert.equal(h.requests.length, 3)
  h.dispose()
  h.requests[2]!.resolve({ data: report(90) }); await flush()
  assert.equal(h.loader.report.value, null)
})

test('a failed report stays distinct from zero questions and can be retried', async () => {
  const h = harness()
  h.requests[0]!.reject(); await flush()
  assert.ok(h.loader.error.value)
  assert.equal(h.loader.report.value, null)
  const pending = h.loader.reload()
  h.requests[1]!.resolve({ data: report(0) })
  await pending
  assert.equal(h.loader.report.value?.total_count, 0)
  assert.equal(h.loader.error.value, '')
  assert.equal(h.loader.loading.value, false)
  h.dispose()
})
