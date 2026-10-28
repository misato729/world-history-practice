import assert from 'node:assert/strict'
import test from 'node:test'
import type { ExamCatalogEntry } from '../app/utils/examCatalog.ts'
import { CULTURAL_HISTORY_CATEGORIES, historyTopicFilterLabel, serializeHistoryTopicSelection } from '../app/utils/historyTopics.ts'
import { createPracticeFilterCatalogLoader, practiceFilterScopeKey, type PracticeFilterCatalogState } from '../app/utils/practiceFilterCatalog.ts'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

const catalog = (exam: number): ExamCatalogEntry[] => [{ exam_number: exam, question_numbers: [7, 3] }]
function harness() {
  let currentScope: string | null = 'A'
  const states: PracticeFilterCatalogState[] = []
  const requests: { signal: AbortSignal, result: ReturnType<typeof deferred<ExamCatalogEntry[]>>, query: Record<string, string> }[] = []
  const loader = createPracticeFilterCatalogLoader({
    scope: () => currentScope,
    fetchCatalog: (query, _headers, signal) => {
      const result = deferred<ExamCatalogEntry[]>()
      requests.push({ query, signal, result })
      return result.promise // Deliberately ignores aborts to exercise late responses.
    },
    onState: value => { states.push(value) },
  })
  return { loader, requests, states, setScope: (value: string | null) => { currentScope = value }, state: () => states.at(-1)! }
}

test('checkbox selection serializes canonical unions and retains single-topic labels', () => {
  assert.equal(serializeHistoryTopicSelection([]), 'all')
  assert.equal(serializeHistoryTopicSelection(['music_history']), 'music_history')
  assert.equal(serializeHistoryTopicSelection(['music_history', 'art_history', 'music_history']), 'art_history,music_history')
  assert.equal(serializeHistoryTopicSelection(CULTURAL_HISTORY_CATEGORIES.map(item => item.value).reverse()), 'cultural_history')
  assert.equal(historyTopicFilterLabel('music_history,art_history'), '美術史・音楽史のみ')
  assert.equal(historyTopicFilterLabel('art_history,other_cultural_history'), '美術史・その他の文化史のみ')
  assert.equal(historyTopicFilterLabel('music_history'), '音楽史のみ')
  assert.equal(historyTopicFilterLabel('cultural_history'), '文化史のみ')
  for (const value of [undefined, [], 'all,art_history', 'art_history,', 'unknown']) assert.equal(historyTopicFilterLabel(value), '')
  assert.throws(() => serializeHistoryTopicSelection(['unknown' as never]))
})

test('filter request keys are canonical and change with the local authentication generation', () => {
  const a = practiceFilterScopeKey({ history_topic: 'art_history', category_code: 'section' }, 0)
  assert.equal(a, practiceFilterScopeKey({ category_code: 'section', history_topic: 'art_history' }, 0))
  assert.notEqual(a, practiceFilterScopeKey({ category_code: 'section', history_topic: 'art_history' }, 1))
  assert.notEqual(a, practiceFilterScopeKey({ category_code: 'section', history_topic: 'music_history' }, 0))
})

test('a confirmed empty catalog is distinct from pending and failed counts, and can be retried', async () => {
  const h = harness()
  const empty = h.loader.refresh({}, {})
  assert.equal(h.state().status, 'pending')
  assert.equal(h.state().data, null)
  h.requests[0]!.result.resolve([])
  assert.deepEqual(await empty, [])
  assert.equal(h.state().status, 'success')
  assert.deepEqual(h.state().data, [])

  const failed = h.loader.refresh({}, {})
  assert.equal(h.state().data, null)
  const failure = new Error('Synthetic unavailable response')
  h.requests[1]!.result.reject(failure)
  assert.equal(await failed, null)
  assert.equal(h.state().status, 'error')
  assert.equal(h.state().error, failure)
  assert.equal(h.state().data, null)

  const retry = h.loader.refresh({}, {})
  assert.equal(h.state().error, null)
  h.requests[2]!.result.resolve(catalog(2))
  assert.deepEqual(await retry, catalog(2))
  assert.equal(h.state().status, 'success')
})

test('an older response cannot replace the newer filtered sequence even when abort is ignored', async () => {
  const h = harness()
  const a = h.loader.refresh({ history_topic: 'art_history' }, {})
  h.setScope('B')
  h.loader.invalidate()
  const b = h.loader.refresh({ history_topic: 'music_history' }, {})
  assert.equal(h.requests[0]!.signal.aborted, true)
  h.requests[1]!.result.resolve(catalog(2))
  assert.deepEqual(await b, catalog(2))
  h.requests[0]!.result.resolve(catalog(1))
  assert.equal(await a, null)
  assert.deepEqual(h.state().data, catalog(2))
})

test('A to B to A changes reject the first A and a late B failure', async () => {
  const h = harness()
  const firstA = h.loader.refresh({}, {})
  h.setScope('B'); h.loader.invalidate()
  const b = h.loader.refresh({}, {})
  h.setScope('A'); h.loader.invalidate()
  const lastA = h.loader.refresh({}, {})
  h.requests[0]!.result.resolve(catalog(1))
  assert.equal(await firstA, null)
  assert.equal(h.state().status, 'pending')
  h.requests[2]!.result.resolve(catalog(3))
  assert.deepEqual(await lastA, catalog(3))
  h.requests[1]!.result.reject(new Error('Synthetic late failure'))
  assert.equal(await b, null)
  assert.equal(h.state().status, 'success')
  assert.deepEqual(h.state().data, catalog(3))
})

test('changed authentication or disabled conditions reject a result before a watcher runs', async () => {
  const h = harness()
  const oldIdentity = h.loader.refresh({}, {})
  h.setScope('new-auth-generation')
  h.requests[0]!.result.resolve(catalog(1))
  assert.equal(await oldIdentity, null)
  assert.equal(h.state().data, null)
  h.setScope(null)
  assert.equal(await h.loader.refresh({}, {}), null)
  assert.equal(h.state().status, 'idle')
  assert.equal(h.requests.length, 1)
})

test('disposing an active loader aborts and prevents later state updates or new requests', async () => {
  const h = harness()
  const active = h.loader.refresh({}, {})
  h.loader.dispose()
  assert.equal(h.requests[0]!.signal.aborted, true)
  const stateCount = h.states.length
  h.requests[0]!.result.resolve(catalog(1))
  assert.equal(await active, null)
  assert.equal(h.states.length, stateCount)
  assert.equal(await h.loader.refresh({}, {}), null)
  assert.equal(h.requests.length, 1)
})
