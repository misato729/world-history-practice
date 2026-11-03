import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, test } from 'node:test'
import { configuration } from '../server/core/config.ts'
import { getDatabase, closeDatabase, query, type Database } from '../server/core/db.ts'
import { ApiError } from '../server/core/errors.ts'
import { migrate } from '../server/database/migrate.ts'
import { saveExamSet, createQuestionGroup, saveQuestionGroup, saveQuestion, publishExamSet, loadExamSet,
  examSetContentsFingerprint, swapExamSetContents } from '../server/services/learning-writer.ts'

process.env.APP_ENV = 'test'
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
const enabled = Boolean(process.env.TEST_DATABASE_URL)
after(closeDatabase)
const pairs: [number, number][] = [[4, 6], [5, 7]]
const numbers = pairs.flat()
const destination = (n: number) => ({ 4: 6, 6: 4, 5: 7, 7: 5 }[n] ?? n)
const error = (code: string) => (e: unknown) => e instanceof ApiError && e.code === code
async function rows(table: string, db: Database) {
  return query<any>(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY to_jsonb(t)::text`, [], db).then(r => r.map(v => v.row))
}

test('atomic mock swaps preserve IDs/content/history and reject stale retries or unsafe moves', { skip: !enabled }, async t => {
  assert.match(new URL(process.env.TEST_DATABASE_URL!).pathname, /_test$/)
  await migrate()
  const db = await getDatabase().connect()
  await db.query('BEGIN')
  try {
    const category = configuration.categories.minor[0]!
    for (const n of [1, 4, 5, 6, 7]) {
      const set = await loadExamSet(n, db)
      await saveExamSet({ exam_number: n, title: `Synthetic mock ${n}`, format_code: 'rekiken_mock', publication_status: 'draft', lock_version: set.lock_version }, { db })
      let questionNumber = 0
      for (const [index, count] of [8, 7, 8, 7].entries()) {
        const group = await createQuestionGroup(n, { group_number: index + 1, title: `Synthetic ${n}/${index + 1}`, planned_question_count: count }, { db })
        const saved = await saveQuestionGroup(group.id, { lock_version: group.lock_version, passages: [{ label: 'A', content_blocks: [{ type: 'text', text: `Synthetic passage ${n}/${index + 1}` }] }] }, { db })
        for (let i = 1; i <= count; i++) {
          await saveQuestion({ exam_number: n, question_number: ++questionNumber, group_id: group.id, group_question_number: i,
            major_category_code: category.major_category_value, category_code: category.value,
            is_cultural_history: false, is_art_history: false, cultural_history_category: null, source_text: null,
            publication_status: 'draft', answer_type: 'single_choice',
            content_blocks: [{ type: 'text', text: `Synthetic question ${n}/${questionNumber}` }],
            explanation_blocks: [{ type: 'text', text: 'Synthetic explanation' }],
            source_references: [{ kind: 'book', title: 'Synthetic reference', edition: 'Test edition' }],
            passage_references: [{ passage_id: saved.passages[0]!.id, anchor_id: null }],
            choices: configuration.exam.choice_labels.map((choice_label, j) => ({ choice_label, display_order: j + 1, is_correct: j === 0, content_blocks: [{ type: 'text', text: `Synthetic choice ${j}` }] })),
          }, { db, requireCompleteExam: false })
        }
      }
      if (n <= 5) {
        const ready = await loadExamSet(n, db)
        await publishExamSet(n, ready.lock_version, { db })
      }
    }
    const [user] = await query<any>("INSERT INTO users(name,email,password_digest,role,created_at,updated_at) VALUES('Synthetic swap',$1,'synthetic','user',NOW(),NOW()) RETURNING id", [`swap-${randomUUID()}@example.invalid`], db)
    const [q] = await query<any>('SELECT q.id,c.id AS choice_id,q.content_version FROM questions q JOIN question_choices c ON c.question_id=q.id AND c.is_correct WHERE q.exam_number=4 ORDER BY q.question_number LIMIT 1', [], db)
    await query("INSERT INTO answer_histories(user_id,question_id,selected_choice_id,is_correct,question_version,created_at,updated_at) VALUES($1,$2,$3,true,$4,NOW(),NOW())", [user.id, q.id, q.choice_id, q.content_version], db)
    await query('INSERT INTO favorites(user_id,question_id,created_at,updated_at) VALUES($1,$2,NOW(),NOW())', [user.id, q.id], db)
    const token = await examSetContentsFingerprint(numbers, db)
    const preservedTables = ['group_passages', 'question_choices', 'question_topic_links', 'question_passage_references', 'answer_histories', 'favorites', 'users']
    const preserved: Record<string, any[]> = {}
    for (const name of preservedTables) preserved[name] = await rows(name, db)
    const beforeQuestions = await rows('questions', db), beforeGroups = await rows('question_groups', db), beforeSets = await rows('exam_sets', db)

    await t.test('overlapping/out-of-range pairs and stale fingerprints fail before changes', async () => {
      await assert.rejects(swapExamSetContents({ pairs: [[4, 6], [6, 7]], expected_fingerprint: token }, { db }), error('validation_error'))
      await assert.rejects(swapExamSetContents({ pairs: [[4, configuration.exam.set_count + 1]], expected_fingerprint: token }, { db }), error('validation_error'))
      await assert.rejects(swapExamSetContents({ pairs, expected_fingerprint: '0'.repeat(32) }, { db }), error('content_conflict'))
      assert.equal(await examSetContentsFingerprint(numbers, db), token)
    })
    await t.test('completed sessions cannot silently lose stored answers', async () => {
      const id = randomUUID()
      await query("INSERT INTO practice_attempts(id,user_id,status,exams,manifest,answers) VALUES($1,$2,'completed',ARRAY[4],$3::jsonb,$4::jsonb)", [id, user.id, JSON.stringify({ items: [{ id: q.id }], full_exams: [4] }), JSON.stringify({ [q.id]: { correct: true } })], db)
      const before = await rows('practice_attempts', db)
      await assert.rejects(swapExamSetContents({ pairs, expected_fingerprint: token }, { db }), error('exam_attempts_exist'))
      assert.deepEqual(await rows('practice_attempts', db), before)
      assert.equal(await examSetContentsFingerprint(numbers, db), token)
      await query('DELETE FROM practice_attempts WHERE id=$1', [id], db)
    })
    await t.test('a failure after moving both FK sides rolls back the whole operation', async () => {
      await db.query('SAVEPOINT swap_failure')
      let moved = false
      const failing: Database = { query: (async (sql: any, params: any) => {
        if (moved) throw new Error('synthetic injected failure')
        const result = await db.query(sql, params)
        if (typeof sql === 'string' && sql.includes('moved_groups AS')) moved = true
        return result
      }) as Database['query'] }
      await assert.rejects(swapExamSetContents({ pairs, expected_fingerprint: token }, { db: failing }), /synthetic injected failure/)
      assert.equal(moved, true)
      await db.query('ROLLBACK TO SAVEPOINT swap_failure')
      assert.equal(await examSetContentsFingerprint(numbers, db), token)
    })
    await t.test('4↔6 and 5↔7 move atomically with slot publication and immutable IDs', async () => {
      assert.deepEqual(await swapExamSetContents({ pairs, expected_fingerprint: token }, { db }), { moved_questions: 120, moved_groups: 16 })
      for (const table of preservedTables) assert.deepEqual(await rows(table, db), preserved[table], table)
      const ignore = ({ updated_at, lock_version, ...rest }: any) => rest
      const statuses = new Map(beforeSets.map(s => [s.exam_number, s.publication_status]))
      const byId = (items: any[]) => items.sort((a, b) => a.id - b.id)
      assert.deepEqual(byId((await rows('questions', db)).map(ignore)), byId(beforeQuestions.map(row => {
        const next = ignore(row)
        if (numbers.includes(row.exam_number)) {
          next.exam_number = destination(row.exam_number)
          next.publication_status = statuses.get(next.exam_number)
          next.answer_type_locked ||= next.publication_status === 'published'
        }
        return next
      })))
      assert.deepEqual(byId((await rows('question_groups', db)).map(ignore)), byId(beforeGroups.map(row => {
        const next = ignore(row)
        if (numbers.includes(row.exam_number)) {
          next.exam_number = destination(row.exam_number)
          next.publication_status = statuses.get(next.exam_number)
        }
        return next
      })))
      assert.deepEqual((await rows('exam_sets', db)).map(ignore), beforeSets.map(ignore))
      for (const table of ['questions', 'question_groups', 'exam_sets']) {
        const before = table === 'questions' ? beforeQuestions : table === 'question_groups' ? beforeGroups : beforeSets
        for (const row of await rows(table, db)) {
          const old = before.find(v => table === 'exam_sets' ? v.exam_number === row.exam_number : v.id === row.id)!
          if (numbers.includes(old.exam_number)) assert.equal(row.lock_version, old.lock_version + 1)
          else assert.deepEqual(row, old)
        }
      }
      await assert.rejects(swapExamSetContents({ pairs, expected_fingerprint: token }, { db }), error('content_conflict'))
    })
    await t.test('all published slots remain published and a different slot session is preserved', async () => {
      for (const n of [6, 7]) {
        const set = await loadExamSet(n, db)
        await publishExamSet(n, set.lock_version, { db })
      }
      const id = randomUUID()
      const [other] = await query<any>('SELECT id FROM questions WHERE exam_number=1 LIMIT 1', [], db)
      await query("INSERT INTO practice_attempts(id,user_id,status,exams,manifest,answers) VALUES($1,$2,'completed',ARRAY[1],$3::jsonb,$4::jsonb)", [id, user.id, JSON.stringify({ items: [{ id: other.id }], full_exams: [1] }), JSON.stringify({ [other.id]: { correct: true } })], db)
      const attempts = await rows('practice_attempts', db)
      const allPublishedToken = await examSetContentsFingerprint(numbers, db)
      await swapExamSetContents({ pairs, expected_fingerprint: allPublishedToken }, { db })
      assert.deepEqual(await rows('practice_attempts', db), attempts)
      assert.equal((await query<any>("SELECT count(*)::int n FROM questions WHERE exam_number=ANY($1::int[]) AND publication_status='published'", [numbers], db))[0].n, 120)
      assert.deepEqual((await rows('exam_sets', db)).map(row => row.publication_status), ['published', 'published', 'published', 'published', 'published'])
    })
  } finally {
    await db.query('ROLLBACK')
    db.release()
  }
})
