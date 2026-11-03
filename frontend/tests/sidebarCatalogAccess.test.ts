import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { computed, effectScope, nextTick, onScopeDispose, reactive, ref, shallowRef, watch } from 'vue'
import * as catalog from '../app/utils/examCatalog.ts'
import { hasFullExamAccess } from '../app/utils/examConfig.ts'
import { createPracticeFilterCatalogLoader, practiceFilterScopeKey } from '../app/utils/practiceFilterCatalog.ts'
import type { AuthUser } from '../shared/types/auth.ts'

const read = (path: string) => readFileSync(new URL(`../app/${path}`, import.meta.url), 'utf8')
const factory = (source: string, names: string[], result: string) => new Function(...names,
  stripTypeScriptTypes(source.replace(/^import[^\n]*\n/gm, '').replace('export const', 'const')) + `\nreturn ${result}`)
const sidebarSource = read('components/ExamSidebar.vue').split('<script setup lang="ts">')[1]!.split('</script>')[0]!
const staticRoutes = (readdirSync(new URL('../app/pages/', import.meta.url), { recursive: true }) as string[])
  .filter(path => path.endsWith('.vue') && !path.includes('[') && path !== 'index.vue' && !/^(practice|admin)\//.test(path))
  .map(path => '/' + path.replace(/(?:\/index)?\.vue$/, ''))
const flush = async () => { await nextTick(); await new Promise<void>(resolve => setImmediate(resolve)); await nextTick() }
const member = (kind: string): AuthUser | null => kind === 'anonymous' ? null : ({
  id: 1, name: 'Synthetic', email: 'synthetic@example.invalid', role: kind === 'admin' ? 'admin' : 'user',
  paid_content_access: kind !== 'free', favorite_questions: [],
  membership: { status: kind === 'premium' ? 'active' : 'free', purchased_at: null, expires_at: null },
  verification_access: kind === 'verification' ? { expires_at: new Date(Date.now() + 60000).toISOString() } : null,
})
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function harness(path: string, kind: string) {
  const route = reactive({ path, fullPath: path, params: {} })
  const user = ref(member(kind)), accessToken = ref<string | null>(kind === 'anonymous' ? null : 'synthetic-session')
  const authHeaders = computed(() => accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {})
  const qualifications: ReturnType<typeof deferred<AuthUser | null>>[] = []
  const requests: { signal: AbortSignal, result: ReturnType<typeof deferred<{ data: catalog.ExamCatalogEntry[] }>> }[] = []
  const events: string[] = [], mounted: (() => void)[] = [], beforeUnmount: (() => void)[] = []
  const auth = { user, accessToken, authHeaders, ensureCurrentUser: (force: boolean) => {
    assert.equal(force, true); events.push('me:start')
    const pending = deferred<AuthUser | null>(); qualifications.push(pending)
    return pending.promise.then(current => { events.push('me:end'); if (current) user.value = current; return current })
  } }
  const onMounted = (callback: () => void) => mounted.push(callback)
  const useQualified = factory(read('composables/useQualifiedExamAccess.ts'),
    ['computed', 'onMounted', 'onScopeDispose', 'ref', 'watch', 'useAuth', 'hasFullExamAccess', 'setTimeout', 'clearTimeout'], 'useQualifiedExamAccess')(
      computed, onMounted, onScopeDispose, ref, watch, () => auth, hasFullExamAccess, () => 0, () => {})
  const useCatalog = factory(read('composables/usePracticeFilterCatalog.ts'),
    ['computed', 'onMounted', 'onScopeDispose', 'ref', 'shallowRef', 'watch', 'useAuth', 'useNuxtApp', 'createPracticeFilterCatalogLoader', 'practiceFilterScopeKey'], 'usePracticeFilterCatalog')(
      computed, onMounted, onScopeDispose, ref, shallowRef, watch, () => auth, () => ({ $api: (url: string, options: { signal: AbortSignal }) => {
        assert.equal(url, '/api/v1/exams'); events.push('exams')
        const result = deferred<{ data: catalog.ExamCatalogEntry[] }>(); requests.push({ signal: options.signal, result }); return result.promise
      } }), createPracticeFilterCatalogLoader, practiceFilterScopeKey)
  const dependencies = { computed, ref, watch, onMounted, onBeforeUnmount: (callback: () => void) => beforeUnmount.push(callback), nextTick,
    useRoute: () => route, useAuth: () => auth, useQualifiedExamAccess: useQualified, usePracticeFilterCatalog: useCatalog,
    withDefaults: (props: object, defaults: object) => ({ ...defaults, ...props }), defineProps: () => ({}), defineEmits: () => () => {}, defineModel: () => ref(false),
    window: { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) },
    ...catalog, hasFullExamAccess }
  const scope = effectScope()
  const setup = factory(sidebarSource, Object.keys(dependencies), '{ exams, catalogEnabled, isLoading, hasAccessError, examTarget, isStaticExamLocked, retryCatalog, openExam, toggleExam }')
  const sidebar = scope.run(() => setup(...Object.values(dependencies)))!
  mounted.forEach(callback => callback())
  return { sidebar, route, user, accessToken, requests, qualifications, events,
    go: (next: string) => { route.path = next; route.fullPath = next },
    dispose: () => { beforeUnmount.forEach(callback => callback()); scope.stop() } }
}
const sparseCatalog = (): catalog.ExamCatalogEntry[] => [{ exam_number: 1, question_numbers: [3, 7], groups: [{ id: 1, group_number: 1, title: 'Synthetic group', question_numbers: [3, 7] }] }]
function assertStatic(h: ReturnType<typeof harness>) {
  assert.equal(h.sidebar.catalogEnabled.value, false)
  assert.equal(h.sidebar.isLoading.value, false)
  assert.equal(h.sidebar.hasAccessError.value, false)
  assert.equal(h.sidebar.exams.value.length, catalog.EXAM_SET_COUNT)
  assert.ok(h.sidebar.exams.value.every((exam: catalog.ExamCatalogEntry & { groupLinks: unknown[] }) => !exam.question_numbers.length && exam.groupLinks.length === 4 && (exam as catalog.SidebarExamCatalogEntry).isStatic))
}

for (const kind of ['anonymous', 'free', 'premium', 'admin', 'verification']) {
  test(`all non-practice pages use no question/qualification requests for ${kind}`, async () => {
    assert.ok(staticRoutes.includes('/privacy-policy') && staticRoutes.includes('/premium/complete'))
    for (const path of [...staticRoutes, '/future-static-page', '/practice-guide']) {
      const h = harness(path, kind)
      try {
        await flush(); assertStatic(h)
        assert.equal(h.requests.length, 0, path); assert.equal(h.qualifications.length, 0, path)
        await h.sidebar.retryCatalog(); assert.equal(h.requests.length, 0, path)
        const paid = h.sidebar.exams.value.find((exam: catalog.ExamCatalogEntry) => exam.exam_number === catalog.FREE_EXAM_MAX + 1)
        const qualified = ['premium', 'admin', 'verification'].includes(kind)
        assert.equal(h.sidebar.isStaticExamLocked(paid), !qualified)
        assert.deepEqual(h.sidebar.examTarget(paid), qualified ? { path: '/practice/start', query: { exams: String(paid.exam_number) } } : '/premium')
        h.go('/terms'); await flush(); assertStatic(h); assert.equal(h.requests.length, 0)
      } finally { h.dispose() }
    }
  })
}
for (const kind of ['anonymous', 'free', 'premium', 'admin', 'verification']) {
  test(`home still waits for fresh qualification before catalogs for ${kind}`, async () => {
    const h = harness('/', kind)
    try {
      assert.equal(h.requests.length, 0)
      if (kind !== 'anonymous') { h.qualifications[0]!.resolve(member(kind)); await flush() }
      assert.equal(h.requests.length, ['premium', 'admin', 'verification'].includes(kind) ? 1 : 0)
      if (h.requests.length) assert.deepEqual(h.events, ['me:start', 'me:end', 'exams'])
    } finally { h.dispose() }
  })
}
test('entering home from a static page first checks qualification, leaving during it never fetches questions', async () => {
  const h = harness('/privacy-policy', 'premium')
  try {
    h.go('/'); await flush(); assert.equal(h.qualifications.length, 1); assert.equal(h.requests.length, 0)
    h.go('/terms'); h.qualifications[0]!.resolve(member('premium')); await flush()
    assertStatic(h); assert.equal(h.requests.length, 0)
    h.go('/'); await flush(); h.qualifications[1]!.resolve(member('premium')); await flush()
    assert.deepEqual(h.events, ['me:start', 'me:end', 'me:start', 'me:end', 'exams'])
  } finally { h.dispose() }
})
test('leaving an in-flight catalog aborts it and ignores a late result on every static page', async () => {
  for (const path of staticRoutes) {
    const h = harness('/practice/1/3', 'anonymous')
    try {
      assert.equal(h.requests.length, 1)
      h.go(path); assert.equal(h.requests[0]!.signal.aborted, true); assertStatic(h)
      h.requests[0]!.result.resolve({ data: sparseCatalog() }); await flush(); assertStatic(h)
      await h.sidebar.retryCatalog(); assert.equal(h.requests.length, 1)
      h.go('/practice/1/3'); await flush(); assert.equal(h.requests.length, 2)
      h.requests[1]!.result.resolve({ data: sparseCatalog() }); await flush()
      assert.equal(h.sidebar.exams.value[0].groupLinks[0].to, '/practice/1/3')
    } finally { h.dispose() }
  }
})
test('a delayed catalog error cannot replace static navigation with a retry panel', async () => {
  const h = harness('/practice/start', 'free')
  try {
    h.go('/privacy-policy'); h.requests[0]!.result.reject(new Error('Synthetic late error')); await flush()
    assertStatic(h); await h.sidebar.retryCatalog(); assert.equal(h.requests.length, 1)
  } finally { h.dispose() }
})
test('known entitlement hydration and logout update static links without querying the question API', async () => {
  const h = harness('/exam-overview', 'free')
  try {
    const exam = () => h.sidebar.exams.value.find((entry: catalog.ExamCatalogEntry) => entry.exam_number === catalog.FREE_EXAM_MAX + 1)
    h.user.value = member('premium'); await flush(); assert.equal(h.sidebar.isStaticExamLocked(exam()), false)
    h.accessToken.value = null; h.user.value = null; await flush(); assert.equal(h.sidebar.isStaticExamLocked(exam()), true)
    assert.equal(h.requests.length, 0); assert.equal(h.qualifications.length, 0)
  } finally { h.dispose() }
})


test('static accordion opens free and paid menus without requesting questions or qualification', async () => {
  for (const kind of ['anonymous', 'free', 'premium']) {
    const h = harness('/privacy-policy', kind)
    try {
      for (const number of [1, catalog.FREE_EXAM_MAX + 1]) {
        h.sidebar.toggleExam(number)
        assert.equal(h.sidebar.openExam.value, number)
        assert.equal(h.sidebar.exams.value.find((exam: catalog.ExamCatalogEntry) => exam.exam_number === number).groupLinks.length, 4)
        h.sidebar.toggleExam(number)
        assert.equal(h.sidebar.openExam.value, null)
      }
      await flush(); assert.equal(h.requests.length, 0); assert.equal(h.qualifications.length, 0)
    } finally { h.dispose() }
  }
})

test('a free member keeps locked paid accordions after the real free catalog loads', async () => {
  const h = harness('/practice/1/3', 'free')
  try {
    h.requests[0]!.result.resolve({ data: [...sparseCatalog(), { exam_number: 6, question_numbers: [99], access: 'paid_membership_required' }] })
    await flush()
    assert.deepEqual(h.sidebar.exams.value.map((exam: catalog.ExamCatalogEntry) => exam.exam_number), [1, 6, 7, 8, 9, 10])
    assert.equal(h.sidebar.examTarget(h.sidebar.exams.value[0]), '/practice/1/3')
    const paid = h.sidebar.exams.value.find((exam: catalog.ExamCatalogEntry) => exam.exam_number === 6)
    assert.equal(h.sidebar.isStaticExamLocked(paid), true)
    assert.deepEqual(paid.question_numbers, [])
    assert.equal(h.sidebar.examTarget(paid), '/premium')
    h.sidebar.toggleExam(6); assert.equal(h.sidebar.openExam.value, 6)
    await flush(); assert.equal(h.requests.length, 1)
  } finally { h.dispose() }
})

test('revocation immediately replaces an open real paid group with a static locked menu', async () => {
  const h = harness('/practice/6/9', 'premium')
  try {
    h.requests[0]!.result.resolve({ data: [{ exam_number: 6, question_numbers: [9, 16], groups: [{ id: 60, group_number: 1, title: 'Synthetic paid group', question_numbers: [9, 16] }] }] })
    await flush(); h.sidebar.toggleExam(6)
    assert.equal(h.sidebar.examTarget(h.sidebar.exams.value[0]), '/practice/6/9')
    h.user.value = member('free')
    const paid = h.sidebar.exams.value.find((exam: catalog.ExamCatalogEntry) => exam.exam_number === 6)
    assert.equal(h.sidebar.openExam.value, 6)
    assert.equal(h.sidebar.isStaticExamLocked(paid), true)
    assert.equal(h.sidebar.examTarget(paid), '/premium')
    assert.equal(paid.groupLinks.length, 4)
    assert.ok(paid.groupLinks.every((entry: { to: string }) => entry.to === '/premium'))
    h.user.value = null; h.accessToken.value = null
    assert.equal(h.sidebar.examTarget(h.sidebar.exams.value.find((exam: catalog.ExamCatalogEntry) => exam.exam_number === 6)), '/premium')
  } finally { h.dispose() }
})
