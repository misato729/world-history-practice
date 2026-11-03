import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { after, before, test } from 'node:test'
import { createApp, defineEventHandler, toNodeListener } from 'h3'
import { apiHandler } from '../server/api/v1/[...path].ts'
import { issueToken, type User } from '../server/core/auth.ts'
import { configuration, setConfigurationForTesting } from '../server/core/config.ts'
import { getDatabase, query, closeDatabase, type Database } from '../server/core/db.ts'
import { migrate } from '../server/database/migrate.ts'
import { getAchievementReport } from '../server/services/achievement.ts'
import { saveQuestion } from '../server/services/learning-writer.ts'

process.env.APP_ENV = 'test'
process.env.SECRET_KEY_BASE = 'synthetic-achievement-test-' + randomUUID() + randomUUID()
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
const enabled = Boolean(process.env.TEST_DATABASE_URL)
const original = structuredClone(configuration)
before(async () => {
  if (!enabled) return
  assert.match(new URL(process.env.TEST_DATABASE_URL!).pathname, /_test$/)
  await migrate()
})
after(async () => { setConfigurationForTesting(original); await closeDatabase() })
const fixtureUser = async (db: Database, role = 'user') => (await query<User>("INSERT INTO users(name,email,password_digest,role,created_at,updated_at) VALUES('Synthetic report user',$1,'synthetic',$2,NOW(),NOW()) RETURNING *", [randomUUID() + '@example.invalid', role], db))[0]!
async function fixtureQuestion(db: Database, n: number, extra: Record<string, unknown> = {}) {
  const category = configuration.categories.minor[0]!
  return saveQuestion({ exam_number: 1, question_number: n, major_category_code: category.major_category_value, category_code: category.value,
    is_cultural_history: false, is_art_history: false, cultural_history_category: null, publication_status: 'published',
    content_blocks: [{ type: 'text', text: 'Synthetic report question' }], explanation_blocks: [{ type: 'text', text: 'Private explanation' }],
    source_text: null, source_references: [{ kind: 'book', title: 'Synthetic source', edition: 'Test edition' }], choices: configuration.exam.choice_labels.map((choice_label, i) => ({ choice_label, display_order: i + 1, is_correct: i === 0, content_blocks: [{ type: 'text', text: 'Synthetic choice' }] })), ...extra,
  }, { db, requireCompleteExam: false })
}
async function isolated(action: (db: Database) => Promise<void>) {
  const db = await getDatabase().connect()
  setConfigurationForTesting({ ...structuredClone(original), exam: { ...original.exam, questions_per_exam: 30 }, payments: { ...original.payments, enabled: true, free_exam_count: 5 } })
  await db.query('BEGIN')
  try { await action(db) } finally { await db.query('ROLLBACK'); db.release(); setConfigurationForTesting(original) }
}

test('report aggregates only own current-version results with a deterministic latest-two order', { skip: !enabled }, async () => isolated(async db => {
  const user = await fixtureUser(db), other = await fixtureUser(db)
  const qs = []
  for (let n = 1; n <= 7; n++) qs.push(await fixtureQuestion(db, n))
  const insert = async (index: number, values: boolean[], owner = user.id, version = 1) => {
    for (const correct of values) await query(`INSERT INTO answer_histories(user_id,question_id,selected_choice_id,is_correct,answer_type,question_version,created_at,updated_at) VALUES($1,$2,$3,$4,'single_choice',$5,'2026-01-01','2026-01-01')`, [owner, qs[index]!.id, qs[index]!.choices[0]!.id, correct, version], db)
  }
  await insert(0, [false, true, true]); await insert(1, [false, true]); await insert(2, [true, false]); await insert(3, [false, false])
  await insert(4, [true], other.id); await insert(5, [true], user.id, 2)
  await query("UPDATE questions SET answer_type='essay' WHERE id=$1", [qs[6]!.id], db)
  await query("INSERT INTO answer_histories(user_id,question_id,is_correct,answer_type,submitted_text,question_version,essay_result,created_at,updated_at) VALUES($1,$2,NULL,'essay','Synthetic essay',1,'{\"grading_status\":\"pending\"}'::jsonb,NOW(),NOW())", [user.id, qs[6]!.id], db)
  const { data } = await getAchievementReport(user, db)
  assert.equal(data.total_count, 7); assert.equal(data.answered_count, 5)
  assert.deepEqual(data.exams[0]!.questions.map(q => q.status), ['mastered', 'correct', 'incorrect', 'struggling', 'unanswered', 'unanswered', 'reference'])
  assert.deepEqual(data.exams[0]!.questions[0]!.recent_results, [true, true])
  for (const forbidden of ['content_blocks', 'explanation', 'submitted_text', 'selected_choice', 'accepted_answers', 'source_text', 'password_digest', 'email']) assert.equal(JSON.stringify(data).includes(forbidden), false)
  const same = await getAchievementReport(user, db)
  assert.deepEqual(same.data, data)
}))

test('report respects question, set and group publication and server-side paid access', { skip: !enabled }, async () => isolated(async db => {
  const user = await fixtureUser(db), admin = await fixtureUser(db, 'admin')
  await fixtureQuestion(db, 1)
  await fixtureQuestion(db, 2, { publication_status: 'draft' })
  await fixtureQuestion(db, 3, { publication_status: 'private' })
  await fixtureQuestion(db, 1, { exam_number: 6 })
  await query("INSERT INTO exam_sets(exam_number,title,format_code,publication_status) VALUES(2,'Synthetic set','legacy_practice','draft'),(3,'Synthetic groups','group_practice','published')", [], db)
  await fixtureQuestion(db, 1, { exam_number: 2 })
  // Saving a published legacy question intentionally publishes its legacy set.
  await query("UPDATE exam_sets SET publication_status='draft' WHERE exam_number=2", [], db)
  const [group] = await query<any>("INSERT INTO question_groups(exam_number,group_number,title,planned_question_count,publication_status) VALUES(3,1,'Synthetic group',7,'draft') RETURNING id", [], db)
  await fixtureQuestion(db, 8, { exam_number: 3, group_id: group.id, group_question_number: 1 })
  assert.equal((await getAchievementReport(user, db)).data.total_count, 1)
  assert.equal((await getAchievementReport(admin, db)).data.total_count, 2)
  assert.equal((await getAchievementReport(user, db)).data.full_access, false)
  await query("INSERT INTO verification_access_grants(user_id,expires_at,reason,granted_by,created_at,updated_at) VALUES($1,NOW()+INTERVAL '1 hour','Synthetic report test','test',NOW(),NOW())", [user.id], db)
  assert.equal((await getAchievementReport(user, db)).data.total_count, 2)
  await query("UPDATE verification_access_grants SET revoked_at=NOW() WHERE user_id=$1", [user.id], db)
  assert.equal((await getAchievementReport(user, db)).data.total_count, 1)
  await query("UPDATE question_groups SET publication_status='published' WHERE id=$1", [group.id], db)
  const report = (await getAchievementReport(user, db)).data
  assert.equal(report.total_count, 2)
  assert.equal(report.exams[1]!.questions[0]!.group_number, 1)
  assert.equal(report.exams[1]!.questions[0]!.group_question_number, 1)
  await assert.rejects(getAchievementReport(null, db), (e: any) => e.status === 401)
}))

test('HTTP report requires authentication, is not cached, and never uses a supplied user id', { skip: !enabled }, async () => {
  const user = await fixtureUser(getDatabase())
  const server: Server = createServer(toNodeListener(createApp().use(defineEventHandler(apiHandler))))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/v1/me/achievement`
  try {
    assert.equal((await fetch(url)).status, 401)
    assert.equal((await fetch(url, { headers: { Authorization: 'Bearer invalid' } })).status, 401)
    const response = await fetch(url + '?user_id=9999', { headers: { Authorization: `Bearer ${issueToken(user)}` } })
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store')
    const data = (await response.json()).data
    assert.equal(data.answered_count, 0)
    assert.equal((await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${issueToken(user)}` } })).status, 404)
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); await query('DELETE FROM users WHERE id=$1', [user.id]) }
})
