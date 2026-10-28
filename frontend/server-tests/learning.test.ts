import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, test } from 'node:test'
import type { ExamConfiguration } from '../app/utils/examConfig.ts'
import { configuration, setConfigurationForTesting } from '../server/core/config.ts'
import { ApiError } from '../server/core/errors.ts'
import { closeDatabase, getDatabase, query, type Database } from '../server/core/db.ts'
import type { User } from '../server/core/auth.ts'
import { excerptFrom, sanitizeQuestionInput, validateQuestionInput, type QuestionInput } from '../server/services/learning-validation.ts'
import { deleteQuestion, loadQuestion, materialDigest, saveQuestion, loadExamSet, publishExamSet } from '../server/services/learning-writer.ts'
import { answerQuestion, getHistory, getQuestion, listAdminQuestions, listExams, listFavorites, listHistory, nextQuestion, putFavorite, removeFavorite } from '../server/services/learning.ts'

process.env.APP_ENV = 'test'
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
const hasDatabase = Boolean(process.env.DATABASE_URL || process.env.PGHOST)
const originalConfiguration = structuredClone(configuration)
const configFor = (changes: Partial<ExamConfiguration> = {}): ExamConfiguration => ({ ...structuredClone(originalConfiguration), ...changes })
const apiError = (status: number) => (error: unknown) => error instanceof ApiError && error.status === status

function input(overrides: Partial<QuestionInput> = {}, config = configuration): QuestionInput {
  const category = config.categories.minor[0]!
  return {
    exam_number: 1, question_number: 1, major_category_code: category.major_category_value, category_code: category.value,
    is_cultural_history: false, is_art_history: false,
    cultural_history_category: overrides.is_cultural_history ? (overrides.is_art_history ? 'art_history' : 'other_cultural_history') : null,
    publication_status: 'published', content_blocks: [{ type: 'text', text: 'Sample question' }],
    explanation_blocks: [{ type: 'text', text: 'Explanation revealed only after answering' }], source_text: 'Self-authored sample | https://example.com/sample',
    choices: config.exam.choice_labels.map((label, index) => ({ choice_label: label, content_blocks: [{ type: 'text', text: `Choice ${label}` }], is_correct: index === 1, display_order: index + 1 })),
    ...overrides,
  }
}

async function isolated(action: (db: Database, exam: number) => Promise<void>) {
  const client = await getDatabase().connect()
  const testConfiguration = configFor({ exam: { ...configuration.exam, set_count: 10000, questions_per_exam: 3 }, payments: { ...configuration.payments, enabled: false, free_exam_count: 10000 } })
  setConfigurationForTesting(testConfiguration)
  await client.query('BEGIN')
  try {
    await client.query("SET LOCAL lock_timeout='10s'")
    await action(client, 100 + Math.floor(Math.random() * 9000))
  } finally {
    await client.query('ROLLBACK')
    client.release()
    setConfigurationForTesting(originalConfiguration)
  }
}
async function user(db: Database, role: 'user' | 'admin' = 'user'): Promise<User> {
  const [row] = await query<User>("INSERT INTO users(name,email,password_digest,role,created_at,updated_at) VALUES('Learning test',$1,'test-digest',$2,NOW(),NOW()) RETURNING *", [`learning-${randomUUID()}@example.invalid`, role], db)
  return row!
}
const integration = { skip: !hasDatabase }
after(async () => { setConfigurationForTesting(originalConfiguration); await closeDatabase() })

test('configuration-derived question and choice limits support three/five choices and 25 questions', () => {
  for (const labels of [['A', 'B', 'C'], ['A', 'B', 'C', 'D', 'E']]) {
    const config = configFor({ exam: { set_count: 2, questions_per_exam: 25, choice_labels: labels } })
    const attributes = input({ question_number: 25 }, config)
    assert.equal(validateQuestionInput(attributes, config).choices.length, labels.length)
    assert.throws(() => validateQuestionInput({ ...attributes, question_number: 26 }, config), apiError(422))
    assert.throws(() => validateQuestionInput({ ...attributes, exam_number: 3 }, config), apiError(422))
    const duplicateCorrect = structuredClone(attributes)
    duplicateCorrect.choices[0]!.is_correct = true
    assert.throws(() => validateQuestionInput(duplicateCorrect, config), apiError(422))
  }
})

test('publication validates six blanks, table widths, category ownership and HTTPS sources', () => {
  const attributes = input()
  const blanks = ['①', '②', '③', '④', '⑤', '⑥']
  attributes.content_blocks = [{ type: 'fill_in_quote', text: blanks.map(label => `{{${label}}}`).join('、') }]
  for (const choice of attributes.choices) choice.content_blocks = [{ type: 'fill_in_choice', cells: blanks.map(label => `Term ${label}`) }]
  assert.equal(validateQuestionInput(attributes).choices[0]!.content_blocks[0]!.cells!.length, 6)
  const invalidCells = structuredClone(attributes)
  invalidCells.choices[0]!.content_blocks[0]!.cells!.pop()
  assert.throws(() => validateQuestionInput(invalidCells), apiError(422))
  assert.throws(() => validateQuestionInput({ ...input(), source_text: 'Source | https://user:secret@example.com' }), apiError(422))
  assert.throws(() => validateQuestionInput({ ...input(), category_code: 'nonexistent' }), apiError(422))
  assert.throws(() => validateQuestionInput({ ...input(), content_blocks: [{ type: 'table', headers: ['A', 'B'], rows: [['only one']] }] }), apiError(422))
  assert.throws(() => validateQuestionInput({ ...input(), explanation_blocks: [] }), apiError(422))
  const draft = validateQuestionInput({ ...input(), publication_status: 'draft', content_blocks: [], explanation_blocks: [], source_text: null })
  assert.deepEqual(draft.content_blocks, [])
})

test('admin normalization handles form booleans, enforces all choice rows and ignores unrelated fields', () => {
  const raw = { ...input({ publication_status: 'draft' }), difficulty: 'ignored', choices: input().choices.map(choice => ({ ...choice, is_correct: choice.is_correct ? '1' : 'false' })) }
  const normalized = sanitizeQuestionInput(raw)
  assert.equal(normalized.choices.filter(choice => choice.is_correct).length, 1)
  assert.equal('difficulty' in normalized, false)
  assert.throws(() => sanitizeQuestionInput({ ...raw, choices: raw.choices.slice(1) }), apiError(422))
  assert.throws(() => sanitizeQuestionInput({ ...raw, content_blocks: [] }), apiError(422))
})

test('topic flags default for older input and reject non-booleans and art without culture', () => {
  const legacy = { ...input() } as Partial<QuestionInput>
  delete legacy.is_cultural_history
  delete legacy.is_art_history
  delete legacy.cultural_history_category
  assert.equal(validateQuestionInput(legacy).is_cultural_history, false)
  assert.equal(validateQuestionInput(legacy).is_art_history, false)
  assert.equal(validateQuestionInput(legacy).cultural_history_category, null)
  assert.equal(validateQuestionInput(input({ is_cultural_history: true, is_art_history: true })).is_art_history, true)
  assert.throws(() => validateQuestionInput(input({ is_art_history: true })), apiError(422))
  for (const value of ['false', 'true', 0, 1, null, [], {}]) {
    assert.throws(() => validateQuestionInput({ ...input(), is_cultural_history: value }), apiError(422))
    assert.throws(() => sanitizeQuestionInput({ ...input(), is_art_history: value }), apiError(422))
  }
  assert.equal(materialDigest(input()), materialDigest(input({ is_cultural_history: true, is_art_history: true })))
})

test('culture categories select exactly one branch while omitted categories retain legacy meaning', () => {
  for (const category of ['art_history', 'music_history', 'literature_history', 'other_cultural_history'] as const) {
    const raw = input({ is_cultural_history: true, is_art_history: category === 'art_history', cultural_history_category: category })
    const normalized = validateQuestionInput(raw)
    assert.equal(normalized.cultural_history_category, category)
    assert.equal(normalized.is_art_history, category === 'art_history')
    const withoutArt = { ...raw } as Partial<QuestionInput>
    delete withoutArt.is_art_history
    assert.equal(validateQuestionInput(withoutArt).is_art_history, category === 'art_history')
    assert.equal(sanitizeQuestionInput(raw).cultural_history_category, category)
    assert.equal(materialDigest(raw), materialDigest(input()))
  }
  for (const art of [true, false]) {
    const legacy = input({ is_cultural_history: true, is_art_history: art }) as Partial<QuestionInput>
    delete legacy.cultural_history_category
    assert.equal(validateQuestionInput(legacy).cultural_history_category, art ? 'art_history' : 'other_cultural_history')
  }
})

test('culture category validation rejects missing branches, multiple branches and inconsistent compatibility flags', () => {
  for (const category of ['', 'unknown', ['music_history'], ['music_history', 'literature_history'], {}, 0, false]) {
    const raw = { ...input({ is_cultural_history: true }), cultural_history_category: category }
    assert.throws(() => validateQuestionInput(raw), apiError(422))
    assert.throws(() => sanitizeQuestionInput(raw), apiError(422))
  }
  for (const raw of [
    input({ is_cultural_history: true, cultural_history_category: null }),
    input({ cultural_history_category: 'music_history' }),
    input({ is_cultural_history: true, is_art_history: true, cultural_history_category: 'music_history' }),
    input({ is_cultural_history: true, is_art_history: false, cultural_history_category: 'art_history' }),
  ]) assert.throws(() => validateQuestionInput(raw), apiError(422))
})

test('material comparison ignores visibility and IDs; excerpts remove blank markers and limit Unicode characters', () => {
  const attributes = input()
  assert.equal(materialDigest(attributes), materialDigest({ ...attributes, publication_status: 'private', choices: attributes.choices.map((choice, index) => ({ ...choice, id: index + 10 })) }))
  assert.notEqual(materialDigest(attributes), materialDigest({ ...attributes, content_blocks: [{ type: 'text', text: 'Changed' }] }))
  assert.equal(excerptFrom([{ type: 'text', text: ' A {{①}}\n B ' }]), 'A ① B')
  assert.equal(Array.from(excerptFrom([{ type: 'text', text: '情'.repeat(130) }])).length, 120)
})

test('PostgreSQL accepts configurable 25-position sets and 3/5 choices while enforcing one correct row', integration, async () => isolated(async (db, exam) => {
  for (const [offset, labels] of [['A', 'B', 'C'], ['A', 'B', 'C', 'D', 'E']].entries()) {
    setConfigurationForTesting({ ...configuration, exam: { ...configuration.exam, questions_per_exam: 25, choice_labels: labels } })
    const saved = await saveQuestion(input({ exam_number: exam + offset, question_number: 25 }), { db })
    assert.equal(saved.question_number, 25)
    assert.deepEqual(saved.choices.map(choice => choice.choice_label), labels)
    await query('SAVEPOINT correct_answer_constraint', [], db)
    await assert.rejects(query('UPDATE question_choices SET is_correct=true WHERE question_id=$1', [saved.id], db), (error: unknown) => (error as { code?: string }).code === '23505')
    await query('ROLLBACK TO SAVEPOINT correct_answer_constraint', [], db)
    await query('RELEASE SAVEPOINT correct_answer_constraint', [], db)
    assert.equal((await loadQuestion(saved.id, db)).choices.filter(choice => choice.is_correct).length, 1)
  }
}))

test('anonymous exercise never exposes answer fields until answering and rejects a foreign choice', integration, async () => isolated(async (db, exam) => {
  const question = await saveQuestion(input({ exam_number: exam }), { db })
  const other = await saveQuestion(input({ exam_number: exam, question_number: 2 }), { db })
  const response = await getQuestion(question.id, null, db)
  assert.equal('explanation_blocks' in response.data, false)
  assert.equal('source_text' in response.data, false)
  assert.equal('is_correct' in (response.data.choices as Record<string, unknown>[])[0]!, false)
  const answer = await answerQuestion(question.id, question.choices[1]!.id, null, db)
  assert.equal(answer.data.is_correct, true)
  assert.equal(answer.data.answer_history_id, null)
  assert.deepEqual(answer.data.explanation_blocks, question.explanation_blocks)
  await assert.rejects(answerQuestion(question.id, other.choices[0]!.id, null, db), apiError(422))
  const rows = await query<{ total: number }>('SELECT COUNT(*)::integer AS total FROM answer_histories WHERE question_id=$1', [question.id], db)
  assert.equal(rows[0]!.total, 0)
}))

test('next-question selection is ordered and validates parameters without returning private content', integration, async () => isolated(async (db, exam) => {
  const first = await saveQuestion(input({ exam_number: exam }), { db })
  await saveQuestion(input({ exam_number: exam, question_number: 2, publication_status: 'private' }), { db })
  const third = await saveQuestion(input({ exam_number: exam, question_number: 3 }), { db })
  assert.equal((await nextQuestion({ exam_number: exam, after_question_number: 0 }, null, db)).data.id, first.id)
  assert.equal((await nextQuestion({ exam_number: exam, after_question_number: 1 }, null, db)).data.id, third.id)
  await assert.rejects(nextQuestion({ after_question_number: 0 }, null, db), apiError(400))
  await assert.rejects(nextQuestion({ exam_number: 'invalid' }, null, db), apiError(400))
  await assert.rejects(nextQuestion({ exam_number: exam, after_question_number: 3 }, null, db), apiError(404))
  const exams = await listExams(null, db)
  assert.deepEqual(exams.data.find(item => item.exam_number === exam)?.question_numbers, [1, 3])
}))

test('chapter and topic filters intersect in catalogs, selection and administration without leaking answers', integration, async () => isolated(async (db, exam) => {
  setConfigurationForTesting({ ...configuration, exam: { ...configuration.exam, questions_per_exam: 6 } })
  const admin = await user(db, 'admin')
  const firstCategory = configuration.categories.minor[0]!
  const otherCategory = configuration.categories.minor.find(item => item.major_category_value !== firstCategory.major_category_value)!
  await saveQuestion(input({ exam_number: exam }), { db })
  const culture = await saveQuestion(input({ exam_number: exam, question_number: 2, is_cultural_history: true }), { db })
  const art = await saveQuestion(input({ exam_number: exam, question_number: 3, major_category_code: otherCategory.major_category_value,
    category_code: otherCategory.value, is_cultural_history: true, is_art_history: true }), { db })
  const music = await saveQuestion(input({ exam_number: exam, question_number: 4, is_cultural_history: true, cultural_history_category: 'music_history' }), { db })
  const literature = await saveQuestion(input({ exam_number: exam, question_number: 5, is_cultural_history: true, cultural_history_category: 'literature_history' }), { db })
  const privateMusic = await saveQuestion(input({ exam_number: exam, question_number: 6, is_cultural_history: true,
    cultural_history_category: 'music_history', publication_status: 'private' }), { db })
  const cultural = (await listExams(null, db, { history_topic: 'cultural_history' })).data.find(item => item.exam_number === exam)!
  assert.deepEqual(cultural.question_numbers, [2, 3, 4, 5])
  const arts = (await listExams(null, db, { history_topic: 'art_history' })).data.find(item => item.exam_number === exam)!
  assert.deepEqual(arts.question_numbers, [3])
  assert.equal(arts.published_question_count, 1)
  const artAndMusic = (await listExams(null, db, { history_topic: 'art_history,music_history' })).data.find(item => item.exam_number === exam)!
  assert.deepEqual(artAndMusic.question_numbers, [3, 4])
  assert.equal(artAndMusic.published_question_count, 2)
  assert.equal(artAndMusic.question_count, 2)
  const duplicateTopics = (await listExams(null, db, { history_topic: 'music_history,art_history,music_history' })).data.find(item => item.exam_number === exam)!
  assert.deepEqual(duplicateTopics.question_numbers, artAndMusic.question_numbers)
  const explicitCulture = (await listExams(null, db, { history_topic: configuration.cultural_history_categories.map(item => item.value).join(',') })).data.find(item => item.exam_number === exam)!
  assert.deepEqual(explicitCulture.question_numbers, cultural.question_numbers)
  const artFirst = await nextQuestion({ exam_number: exam, history_topic: 'art_history,music_history', after_question_number: 0 }, null, db)
  assert.equal(artFirst.data.id, art.id)
  const musicNext = await nextQuestion({ exam_number: exam, history_topic: 'art_history,music_history', after_question_number: 3 }, null, db)
  assert.equal(musicNext.data.id, music.id)
  assert.equal('explanation_blocks' in musicNext.data, false)
  assert.equal('source_references' in musicNext.data, false)
  assert((musicNext.data.choices as Record<string, unknown>[]).every(choice => !('is_correct' in choice)))
  await assert.rejects(nextQuestion({ exam_number: exam, history_topic: 'art_history,music_history', after_question_number: 4 }, null, db), apiError(404))
  const unionAndChapter = (await listExams(null, db, { history_topic: 'art_history,music_history', major_category_code: firstCategory.major_category_value,
    category_code: firstCategory.value })).data.find(item => item.exam_number === exam)!
  assert.deepEqual(unionAndChapter.question_numbers, [4])
  assert.equal(unionAndChapter.published_question_count, 1)
  assert.equal((await nextQuestion({ exam_number: exam, history_topic: 'art_history,music_history', major_category_code: firstCategory.major_category_value,
    category_code: firstCategory.value }, null, db)).data.id, music.id)
  const emptyUnion = await listExams(null, db, { history_topic: 'music_history,literature_history', major_category_code: otherCategory.major_category_value,
    category_code: otherCategory.value })
  assert.equal(emptyUnion.data.find(item => item.exam_number === exam), undefined)
  await assert.rejects(nextQuestion({ exam_number: exam, history_topic: 'music_history,literature_history', category_code: otherCategory.value }, null, db), apiError(404))
  const unionAdmin = await listAdminQuestions(admin, { exam_number: exam, history_topic: 'art_history,music_history' }, db)
  assert.equal(unionAdmin.meta.total_count, 3)
  assert.deepEqual(new Set(unionAdmin.data.map(question => question.id)), new Set([art.id, music.id, privateMusic.id]))
  const combined = await nextQuestion({ exam_number: exam, history_topic: 'cultural_history', major_category_code: firstCategory.major_category_value, category_code: firstCategory.value }, null, db)
  assert.equal(combined.data.id, culture.id)
  assert.equal(combined.data.is_cultural_history, true)
  assert.equal(combined.data.is_art_history, false)
  assert.equal(combined.data.cultural_history_category, 'other_cultural_history')
  assert.equal('explanation_blocks' in combined.data, false)
  assert.equal('is_correct' in (combined.data.choices as Record<string, unknown>[])[0]!, false)
  await assert.rejects(nextQuestion({ exam_number: exam, history_topic: 'art_history', category_code: firstCategory.value }, null, db), apiError(404))
  const filtered = await listAdminQuestions(admin, { exam_number: exam, history_topic: 'art_history' }, db)
  assert.equal(filtered.meta.total_count, 1)
  assert.equal(filtered.data[0]!.id, art.id)
  assert.equal(filtered.data[0]!.is_art_history, true)
  assert.equal(filtered.data[0]!.cultural_history_category, 'art_history')
  for (const [topic, question] of [['music_history', music], ['literature_history', literature], ['other_cultural_history', culture]] as const) {
    const catalog = (await listExams(null, db, { history_topic: topic })).data.find(item => item.exam_number === exam)!
    assert.deepEqual(catalog.question_numbers, [question.question_number])
    const next = await nextQuestion({ exam_number: exam, history_topic: topic, major_category_code: firstCategory.major_category_value,
      category_code: firstCategory.value }, null, db)
    assert.equal(next.data.id, question.id)
    assert.equal(next.data.cultural_history_category, topic)
    assert.equal('explanation_blocks' in next.data, false)
    assert.equal('source_text' in next.data, false)
    assert((next.data.choices as Record<string, unknown>[]).every(choice => !('is_correct' in choice)))
  }
  const musicAdmin = await listAdminQuestions(admin, { exam_number: exam, history_topic: 'music_history' }, db)
  assert.equal(musicAdmin.meta.total_count, 2)
  assert.deepEqual(new Set(musicAdmin.data.map(question => question.id)), new Set([music.id, privateMusic.id]))
  const all = (await listExams(null, db, { history_topic: 'all' })).data.find(item => item.exam_number === exam)!
  assert.deepEqual(all.question_numbers, [1, 2, 3, 4, 5])
  await assert.rejects(nextQuestion({ exam_number: exam, history_topic: 'music_history', after_question_number: 4 }, null, db), apiError(404))
  await assert.rejects(nextQuestion({ exam_number: exam, history_topic: 'music_history', category_code: otherCategory.value }, null, db), apiError(404))
  await assert.rejects(listAdminQuestions(null, { history_topic: 'music_history' }, db), apiError(401))
  for (const params of [{ history_topic: 'unknown' }, { history_topic: ['art_history'] }, { history_topic: ['music_history', 'literature_history'] },
    ...['', ',', 'music_history,', ',art_history', 'music_history,,art_history', 'art_history,unknown', ' art_history',
      'all,art_history', 'cultural_history,music_history', 'all,cultural_history', 'all,all'].map(history_topic => ({ history_topic })),
    { history_topic: {} }, { history_topic: "music_history' OR 1=1 --" }, { major_category_code: 'unknown' },
    { major_category_code: firstCategory.major_category_value, category_code: otherCategory.value }]) {
    await assert.rejects(nextQuestion(params, null, db), apiError(400))
    await assert.rejects(listExams(null, db, params), apiError(400))
    await assert.rejects(listAdminQuestions(admin, params, db), apiError(400))
  }
  await query('SAVEPOINT topic_constraint', [], db)
  await assert.rejects(query('UPDATE questions SET is_cultural_history=false WHERE id=$1', [art.id], db), error => (error as { code?: string }).code === '23514')
  await query('ROLLBACK TO SAVEPOINT topic_constraint', [], db)
  for (const statement of [
    'UPDATE questions SET cultural_history_category=NULL WHERE id=$1',
    "UPDATE questions SET cultural_history_category='music_history' WHERE id=$1",
    "UPDATE questions SET cultural_history_category='unknown' WHERE id=$1",
    'UPDATE questions SET is_art_history=false WHERE id=$1',
    "UPDATE questions SET is_cultural_history=false,is_art_history=false,cultural_history_category='music_history' WHERE id=$1",
  ]) {
    await query('SAVEPOINT culture_category_constraint', [], db)
    await assert.rejects(query(statement, [art.id], db), error => (error as { code?: string }).code === '23514')
    await query('ROLLBACK TO SAVEPOINT culture_category_constraint', [], db)
    await query('RELEASE SAVEPOINT culture_category_constraint', [], db)
  }
}))

test('topic-only edits retain answer histories, choice IDs and favorite links', integration, async () => isolated(async (db, exam) => {
  const owner = await user(db)
  const initial = input({ exam_number: exam })
  const question = await saveQuestion(initial, { db })
  const answer = await answerQuestion(question.id, question.choices[1]!.id, owner, db)
  await putFavorite(question.id, owner, db)
  const histories = await query('SELECT * FROM answer_histories WHERE id=$1', [answer.data.answer_history_id], db)
  const favorites = await query('SELECT * FROM favorites WHERE user_id=$1 AND question_id=$2', [owner.id, question.id], db)
  for (const category of ['art_history', 'music_history', 'literature_history', 'other_cultural_history', null] as const) {
    const value = { ...initial, is_cultural_history: category !== null, is_art_history: category === 'art_history', cultural_history_category: category }
    const saved = await saveQuestion(value, { id: question.id, db })
    const repeated = await saveQuestion(value, { id: question.id, db })
    assert.equal(saved.cultural_history_category, category)
    assert.equal(saved.is_cultural_history, category !== null)
    assert.equal(saved.is_art_history, category === 'art_history')
    assert.deepEqual(repeated, saved)
    assert.deepEqual((await loadQuestion(question.id, db)).choices.map(choice => choice.id), question.choices.map(choice => choice.id))
    assert.deepEqual(await query('SELECT * FROM answer_histories WHERE id=$1', [answer.data.answer_history_id], db), histories)
    assert.deepEqual(await query('SELECT * FROM favorites WHERE user_id=$1 AND question_id=$2', [owner.id, question.id], db), favorites)
  }
}))

test('signed-in answers, history ownership, favorite idempotency and pagination retain the API contract', integration, async () => isolated(async (db, exam) => {
  const owner = await user(db)
  const other = await user(db)
  const question = await saveQuestion(input({ exam_number: exam }), { db })
  await assert.rejects(listHistory(null, {}, db), apiError(401))
  await assert.rejects(putFavorite(question.id, null, db), apiError(401))
  const answer = await answerQuestion(question.id, question.choices[0]!.id, owner, db)
  assert.equal(answer.data.is_correct, false)
  const historyId = answer.data.answer_history_id!
  const newer = await answerQuestion(question.id, question.choices[1]!.id, owner, db)
  const page = await listHistory(owner, { per_page: 1 }, db)
  assert.equal(page.data[0]!.id, newer.data.answer_history_id)
  assert.equal(page.meta.total_count, 2)
  assert.equal(page.meta.total_pages, 2)
  assert.equal((await listHistory(owner, { per_page: 1, page: 2 }, db)).data[0]!.id, historyId)
  assert.equal((await listHistory(other, {}, db)).data.length, 0)
  await assert.rejects(getHistory(historyId, other, db), apiError(404))
  assert.deepEqual((await getHistory(historyId, owner, db)).data.explanation_blocks, question.explanation_blocks)
  const favorite = await putFavorite(question.id, owner, db)
  const repeated = await putFavorite(question.id, owner, db)
  assert.equal(favorite.created, true)
  assert.equal(repeated.created, false)
  assert.equal(favorite.data.id, repeated.data.id)
  assert.equal((await getQuestion(question.id, owner, db)).data.is_favorite, true)
  assert.equal((await listFavorites(owner, {}, db)).meta.total_count, 1)
  assert.equal((await listFavorites(other, {}, db)).meta.total_pages, 0)
  for (const params of [{ page: 0 }, { per_page: 101 }, { page: '1.5' }]) {
    await assert.rejects(listHistory(owner, params, db), apiError(400))
    await assert.rejects(listFavorites(owner, params, db), apiError(400))
  }
  await removeFavorite(question.id, owner, db)
  await removeFavorite(question.id, owner, db)
  assert.equal((await listFavorites(owner, {}, db)).data.length, 0)
}))

test('paid-mode authorization conceals restricted histories and preserves favorites when access is revoked', integration, async () => isolated(async (db, exam) => {
  setConfigurationForTesting({ ...configuration, payments: { ...configuration.payments, enabled: true, free_exam_count: 0 } })
  const owner = await user(db)
  const admin = await user(db, 'admin')
  const question = await saveQuestion(input({ exam_number: exam }), { db })
  await assert.rejects(getQuestion(question.id, null, db), apiError(401))
  await assert.rejects(getQuestion(question.id, owner, db), apiError(403))
  assert.equal((await getQuestion(question.id, admin, db)).data.id, question.id)
  const [payment] = await query<{ id: number }>("INSERT INTO payments(user_id,stripe_checkout_session_id,stripe_price_id,amount,currency,status,paid_at,created_at,updated_at) VALUES($1,$2,'price_learning',500,'jpy','paid',NOW(),NOW(),NOW()) RETURNING id", [owner.id, `cs_${randomUUID()}`], db)
  await query("INSERT INTO memberships(user_id,source_payment_id,status,activated_at,created_at,updated_at) VALUES($1,$2,'active',NOW(),NOW(),NOW())", [owner.id, payment!.id], db)
  const answer = await answerQuestion(question.id, question.choices[1]!.id, owner, db)
  await putFavorite(question.id, owner, db)
  await query("UPDATE memberships SET status='revoked' WHERE user_id=$1", [owner.id], db)
  await assert.rejects(getQuestion(question.id, owner, db), apiError(403))
  const history = (await listHistory(owner, {}, db)).data[0]!
  assert.equal(history.locked, true)
  assert.equal('selected_choice' in history, false)
  assert.equal('is_correct' in history, false)
  assert.equal('body_excerpt' in history.question, false)
  await assert.rejects(getHistory(answer.data.answer_history_id!, owner, db), apiError(403))
  await assert.rejects(listFavorites(owner, {}, db), apiError(403))
  assert.equal((await query('SELECT id FROM favorites WHERE user_id=$1', [owner.id], db)).length, 1)
}))

test('no-op and visibility-only saves preserve histories, identities and favorites; material edits invalidate histories', integration, async () => isolated(async (db, exam) => {
  const owner = await user(db)
  const initial = input({ exam_number: exam })
  const question = await saveQuestion(initial, { db })
  const answer = await answerQuestion(question.id, question.choices[1]!.id, owner, db)
  await putFavorite(question.id, owner, db)
  const ids = question.choices.map(choice => choice.id)
  const before = await loadQuestion(question.id, db)
  await saveQuestion(initial, { id: question.id, db })
  assert.deepEqual(await loadQuestion(question.id, db), before)
  await saveQuestion({ ...initial, publication_status: 'private' }, { id: question.id, db })
  assert.equal((await query('SELECT id FROM answer_histories WHERE id=$1', [answer.data.answer_history_id], db)).length, 1)
  const changed = await saveQuestion({ ...initial, content_blocks: [{ type: 'text', text: 'Changed question' }] }, { id: question.id, db })
  assert.deepEqual(changed.choices.map(choice => choice.id), ids)
  assert.equal((await query('SELECT id FROM answer_histories WHERE id=$1', [answer.data.answer_history_id], db)).length, 0)
  assert.equal((await query('SELECT id FROM favorites WHERE user_id=$1 AND question_id=$2', [owner.id, question.id], db)).length, 1)
}))

test('legacy publication requires complete public peers or an atomic set publication', integration, async () => isolated(async (db, exam) => {
  await assert.rejects(saveQuestion(input({ exam_number: exam }), { db, requireCompleteExam: true }), apiError(422))
  assert.equal((await query('SELECT id FROM questions WHERE exam_number=$1', [exam], db)).length, 0)
  await saveQuestion(input({ exam_number: exam, publication_status: 'draft' }), { db })
  const privatePeer = await saveQuestion(input({ exam_number: exam, question_number: 2, publication_status: 'private' }), { db })
  await assert.rejects(saveQuestion(input({ exam_number: exam, question_number: 3 }), { db, requireCompleteExam: true }), apiError(422))
  assert.equal((await loadExamSet(exam, db)).publication_status, 'draft')
  assert.equal((await listExams(null, db)).data.some(set => set.exam_number === exam), false)
  const draftLast = await saveQuestion(input({ exam_number: exam, question_number: 3, publication_status: 'draft' }), { db })
  const incomplete = await loadExamSet(exam, db)
  await assert.rejects(publishExamSet(exam, incomplete.lock_version, { db }), apiError(422))
  await saveQuestion({ ...privatePeer, publication_status: 'draft' }, { id: privatePeer.id, db })
  const ready = await loadExamSet(exam, db)
  await publishExamSet(exam, ready.lock_version, { db })
  const last = await loadQuestion(draftLast.id, db)
  assert.equal(last.publication_status, 'published')
  assert.equal(last.answer_type_locked, true)
  assert.equal((await listExams(null, db)).data.find(set => set.exam_number === exam)!.published_question_count, 3)
  await saveQuestion(last, { id: last.id, db, requireCompleteExam: true })
  const invalid = input({ exam_number: exam, question_number: 3, explanation_blocks: [] })
  await assert.rejects(saveQuestion(invalid, { id: last.id, db }), apiError(422))
  assert.deepEqual((await loadQuestion(last.id, db)).explanation_blocks, last.explanation_blocks)
  // A no-op publication still checks every existing public peer's contents.
  await query("UPDATE questions SET explanation_blocks='[]'::jsonb WHERE exam_number=$1 AND question_number=1", [exam], db)
  await assert.rejects(saveQuestion(last, { id: last.id, db, requireCompleteExam: true }), apiError(422))
}))

test('changing the correct answer preserves choice IDs and enforces choice-ID ownership', integration, async () => isolated(async (db, exam) => {
  const owner = await user(db)
  const question = await saveQuestion(input({ exam_number: exam }), { db })
  const other = await saveQuestion(input({ exam_number: exam, question_number: 2 }), { db })
  await answerQuestion(question.id, question.choices[1]!.id, owner, db)
  const changed = input({ exam_number: exam })
  changed.choices.forEach((choice, index) => { choice.is_correct = index === 0; choice.id = question.choices[index]!.id })
  const saved = await saveQuestion(changed, { id: question.id, db })
  assert.deepEqual(saved.choices.map(choice => choice.id), question.choices.map(choice => choice.id))
  assert.equal(saved.choices.filter(choice => choice.is_correct).length, 1)
  assert.equal((await query('SELECT id FROM answer_histories WHERE question_id=$1', [question.id], db)).length, 0)
  changed.choices[0]!.id = other.choices[0]!.id
  await assert.rejects(saveQuestion(changed, { id: question.id, db }), apiError(422))
  assert.deepEqual(await loadQuestion(question.id, db), saved)
}))

test('question deletion cascades only its own learning records and admin filtering remains scoped', integration, async () => isolated(async (db, exam) => {
  const owner = await user(db)
  const admin = await user(db, 'admin')
  const first = await saveQuestion(input({ exam_number: exam }), { db })
  const other = await saveQuestion(input({ exam_number: exam, question_number: 2 }), { db })
  await answerQuestion(first.id, first.choices[1]!.id, owner, db)
  await answerQuestion(other.id, other.choices[1]!.id, owner, db)
  await putFavorite(first.id, owner, db)
  await putFavorite(other.id, owner, db)
  await assert.rejects(listAdminQuestions(owner, {}, db), apiError(403))
  await assert.rejects(listAdminQuestions(null, {}, db), apiError(401))
  const result = await listAdminQuestions(admin, { exam_number: exam, per_page: 1, page: 999 }, db)
  assert.equal(result.meta.current_page, 2)
  assert.equal(result.meta.total_count, 2)
  await deleteQuestion(first.id, db)
  assert.equal((await query('SELECT id FROM question_choices WHERE question_id=$1', [first.id], db)).length, 0)
  assert.equal((await query('SELECT id FROM answer_histories WHERE question_id=$1', [first.id], db)).length, 0)
  assert.equal((await listFavorites(owner, {}, db)).data.length, 1)
  assert.equal((await listHistory(owner, {}, db)).data.length, 1)
  await assert.rejects(getQuestion(first.id, owner, db), apiError(404))
}))
