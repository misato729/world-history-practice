import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { ref, watch, reactive, effectScope, onScopeDispose } from 'vue'
import { selectPracticePositions, shufflePracticeSequence } from '../app/utils/practiceSequence.ts'

const source = readFileSync(new URL('../app/pages/practice/start.vue', import.meta.url), 'utf8')
const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)![1]!
const setup = new Function('useSeoMeta', 'useRoute', 'useNuxtApp', 'useAuth', 'ref', 'onMounted', 'watch', 'onScopeDispose', 'navigateTo', 'selectPracticePositions', 'shufflePracticeSequence',
  stripTypeScriptTypes(script.replace(/^import[^\n]*\n/gm, '')) + '\nreturn { error, prepare }')
const flush = () => new Promise<void>(done => setImmediate(done))
function harness(query: Record<string, string>, data: unknown[], token: string | null = null) {
  const accessToken = ref(token), calls: string[] = [], destinations: any[] = [], mounted: (() => void)[] = []
  const route = reactive({ fullPath: '/practice/start?' + new URLSearchParams(query), query })
  const scope = effectScope()
  const view = scope.run(() => setup(() => {}, () => route, () => ({ $api: async (_path: string, options: any) => {
    calls.push('catalog'); assert.deepEqual(options.query, Object.fromEntries(Object.entries(query).filter(([key]) => ['major_category_code', 'category_code', 'history_topic'].includes(key))))
    return { data }
  } }), () => ({ accessToken, authHeaders: ref({}), ensureCurrentUser: async () => { calls.push('qualification'); return {} } }),
  ref, (fn: () => void) => mounted.push(fn), watch, onScopeDispose, async (to: unknown) => { destinations.push(to) }, selectPracticePositions, shufflePracticeSequence))!
  mounted.forEach(fn => fn())
  return { view, calls, destinations, dispose: () => scope.stop() }
}
test('free exercise resolves actual sparse positions after navigation, never assumed question 1', async () => {
  const h = harness({ exams: '1', history_topic: 'art_history' }, [{ exam_number: 1, question_numbers: [7, 19] }])
  await flush(); assert.equal(h.destinations[0].path, '/practice/1/7'); assert.deepEqual(h.calls, ['catalog']); h.dispose()
})
test('zero matching positions do not fall back to an unrelated question', async () => {
  const h = harness({ exams: '1' }, [{ exam_number: 2, question_numbers: [1] }])
  await flush(); assert.equal(h.destinations.length, 0); assert.match(h.view.error.value, /この条件に合う公開問題はまだありません/); h.dispose()
})
test('authenticated exercise resolves qualification before catalog; paid locked entries excluded', async () => {
  const h = harness({ exams: '6' }, [{ exam_number: 6, access: 'paid_membership_required', question_numbers: [8] }], 'synthetic-session')
  await flush(); assert.deepEqual(h.calls, ['qualification', 'catalog']); assert.equal(h.destinations.length, 0); h.dispose()
})
test('random seed zero remains identical to the sequence used by the exercise page', async () => {
  const h = harness({ exams: '1', order: 'random', seed: '0' }, [{ exam_number: 1, question_numbers: [7, 19, 21] }])
  await flush(); const expected = shufflePracticeSequence(selectPracticePositions([{ exam_number: 1, question_numbers: [7, 19, 21] }], [1]), 0)[0]!
  assert.equal(h.destinations[0].path, `/practice/1/${expected.questionNumber}`); h.dispose()
})

for (const seed of [undefined, '-1', '1e3', '4294967296']) {
  test(`invalid or missing random seed ${seed} cannot create a conflicting sequence`, async () => {
    const query: Record<string, string> = { exams: '1', order: 'random', ...(seed === undefined ? {} : { seed }) }
    const h = harness(query, [{ exam_number: 1, question_numbers: [7, 19, 21] }])
    await flush(); assert.equal(h.destinations.length, 0); assert.match(h.view.error.value, /ランダム演習の指定/); h.dispose()
  })
}
