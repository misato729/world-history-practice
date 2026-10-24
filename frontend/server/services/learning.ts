import { getMethod, getQuery, readBody, setResponseStatus, type H3Event } from 'h3'
import { hasPaidAccess, type User } from '../core/auth.ts'
import { configuration, freeExamMax, paymentsEnabled } from '../core/config.ts'
import { getDatabase, query, transaction, type Database } from '../core/db.ts'
import { fail } from '../core/errors.ts'
import { excerptFrom, integer, sanitizeQuestionInput } from './learning-validation.ts'
import { deleteQuestion, loadQuestion, saveQuestion, type ChoiceRecord, type QuestionRecord } from './learning-writer.ts'

export { saveQuestion, deleteQuestion, validateCompleteExam } from './learning-writer.ts'
export { validateQuestionInput } from './learning-validation.ts'
export type { QuestionInput } from './learning-validation.ts'

const notFound = (): never => fail(404, 'not_found', '対象が見つかりません')
const iso = (value: Date | string) => new Date(value).toISOString()
const present = (value: unknown) => value !== undefined && value !== null && value !== ''
function requireUser(user: User | null): User {
  if (!user) return fail(401, 'unauthorized', 'ログインが必要です')
  return user
}
function checkAdmin(user: User | null): User {
  const current = requireUser(user)
  if (current.role !== 'admin') fail(403, 'forbidden', '管理者権限が必要です')
  return current
}
function idFrom(value: unknown): number {
  const id = integer(value)
  if (id === undefined || id < 1) return notFound()
  return id
}
function integerParam(value: unknown, name: string, minimum = 1, maximum = Number.MAX_SAFE_INTEGER): number {
  const parsed = integer(value)
  if (parsed === undefined || parsed < minimum || parsed > maximum) return fail(400, 'bad_request', `${name}を正しく指定してください`)
  return parsed
}
function pagination(params: Record<string, unknown>) {
  return { page: integerParam(present(params.page) ? params.page : 1, 'page'),
    perPage: integerParam(present(params.per_page) ? params.per_page : 20, 'per_page', 1, 100) }
}
function meta(page: number, perPage: number, total: number, atLeastOne = false) {
  return { current_page: page, per_page: perPage, total_count: total,
    total_pages: Math.max(atLeastOne ? 1 : 0, Math.ceil(total / perPage)) }
}
const serializeChoice = (choice: ChoiceRecord) => ({ id: Number(choice.id), choice_label: choice.choice_label,
  content_blocks: choice.content_blocks, display_order: Number(choice.display_order) })

export async function authorizeExam(examNumber: number, user: User | null, db?: Database): Promise<void> {
  if (!paymentsEnabled || examNumber <= freeExamMax || await hasPaidAccess(user, db)) return
  if (user) fail(403, 'paid_membership_required', 'この模擬試験の利用にはプレミアム会員資格が必要です')
  fail(401, 'unauthorized', 'この模擬試験を利用するにはログインが必要です')
}

async function serializePublicQuestion(question: QuestionRecord, user: User | null, db: Database) {
  const payload: Record<string, unknown> = { id: question.id, exam_number: question.exam_number,
    question_number: question.question_number, content_blocks: question.content_blocks,
    major_category_code: question.major_category_code, category_code: question.category_code,
    choices: question.choices.map(serializeChoice) }
  if (user) {
    const allowed = await hasPaidAccess(user, db)
    const rows = allowed ? await query('SELECT 1 FROM favorites WHERE user_id=$1 AND question_id=$2', [user.id, question.id], db) : []
    payload.is_favorite = allowed && rows.length > 0
  }
  return payload
}

export async function getQuestion(id: number, user: User | null, db: Database = getDatabase()) {
  const question = await loadQuestion(id, db, { published: true })
  await authorizeExam(question.exam_number, user, db)
  return { data: await serializePublicQuestion(question, user, db) }
}

export async function nextQuestion(params: Record<string, unknown>, user: User | null, db: Database = getDatabase()) {
  const values: unknown[] = []
  const conditions = ["publication_status='published'"]
  let order = 'exam_number,question_number'
  if (present(params.exam_number)) {
    const exam = integerParam(params.exam_number, 'exam_number')
    await authorizeExam(exam, user, db)
    values.push(exam)
    conditions.push(`exam_number=$${values.length}`)
    if (present(params.after_question_number)) {
      values.push(integerParam(params.after_question_number, 'after_question_number', 0))
      conditions.push(`question_number>$${values.length}`)
    }
    order = 'question_number'
  } else {
    if (present(params.after_question_number)) fail(400, 'bad_request', 'exam_numberを指定してください')
    if (!await hasPaidAccess(user, db)) {
      values.push(freeExamMax)
      conditions.push(`exam_number<=$${values.length}`)
    }
  }
  const base = `SELECT id FROM questions WHERE ${conditions.join(' AND ')}`
  let rows: { id: number }[] = []
  if (!present(params.exam_number) && present(params.exclude_question_id)) {
    const exclude = integerParam(params.exclude_question_id, 'exclude_question_id')
    rows = await query<{ id: number }>(`${base} AND id<>$${values.length + 1} ORDER BY ${order} LIMIT 1`, [...values, exclude], db)
  }
  if (!rows[0]) rows = await query<{ id: number }>(`${base} ORDER BY ${order} LIMIT 1`, values, db)
  if (!rows[0]) return notFound()
  return getQuestion(Number(rows[0].id), user, db)
}

export async function answerQuestion(id: number, selectedChoiceId: unknown, user: User | null, db?: Database) {
  return transaction(async connection => {
    // The same row lock is held by edits/deletes, so grade and history agree.
    const question = await loadQuestion(id, connection, { published: true, lock: true })
    await authorizeExam(question.exam_number, user, connection)
    const choiceId = integer(selectedChoiceId)
    const selected = question.choices.find(choice => choice.id === choiceId)
    if (!selected) fail(422, 'validation_error', '選択肢を確認してください', { selected_choice_id: ['この問題の選択肢を指定してください'] })
    const correct = question.choices.find(choice => choice.is_correct)
    if (!correct) return notFound()
    const isCorrect = selected.id === correct.id
    const histories = user ? await query<{ id: number }>('INSERT INTO answer_histories (user_id,question_id,selected_choice_id,is_correct,created_at,updated_at) VALUES ($1,$2,$3,$4,NOW(),NOW()) RETURNING id', [user.id, question.id, selected.id, isCorrect], connection) : []
    return { data: { question_id: question.id, selected_choice_id: selected.id, is_correct: isCorrect,
      correct_choice: serializeChoice(correct), explanation_blocks: question.explanation_blocks,
      source_text: question.source_text, answer_history_id: histories[0] ? Number(histories[0].id) : null } }
  }, db)
}

export async function listExams(user: User | null, db: Database = getDatabase()) {
  const rows = await query<{ exam_number: number, question_numbers: number[], published_question_count: number }>("SELECT exam_number,array_agg(question_number ORDER BY question_number) AS question_numbers,COUNT(*)::integer AS published_question_count FROM questions WHERE publication_status='published' GROUP BY exam_number ORDER BY exam_number", [], db)
  const fullAccess = await hasPaidAccess(user, db)
  return { data: rows.map(row => ({ exam_number: Number(row.exam_number), question_numbers: row.question_numbers.map(Number),
    published_question_count: Number(row.published_question_count),
    access: !paymentsEnabled || row.exam_number <= freeExamMax || fullAccess ? 'available' : 'paid_membership_required' })) }
}

type HistoryRow = { id: number, is_correct: boolean, answered_at: Date | string,
  question: QuestionRecord, selected_choice: ChoiceRecord }
const historySelect = 'SELECT ah.id,ah.is_correct,ah.created_at AS answered_at,row_to_json(q) AS question,row_to_json(c) AS selected_choice FROM answer_histories ah JOIN questions q ON q.id=ah.question_id JOIN question_choices c ON c.id=ah.selected_choice_id'
function serializeHistory(row: HistoryRow, fullAccess: boolean) {
  const question = row.question
  const base = { id: Number(row.id), question: { id: Number(question.id), exam_number: Number(question.exam_number), question_number: Number(question.question_number) }, answered_at: iso(row.answered_at) }
  if (question.exam_number > freeExamMax && !fullAccess) return { ...base, locked: true }
  return { ...base, locked: false, question: { ...base.question, body_excerpt: excerptFrom(question.content_blocks),
    major_category_code: question.major_category_code, category_code: question.category_code },
  selected_choice: { id: Number(row.selected_choice.id), choice_label: row.selected_choice.choice_label, body_excerpt: excerptFrom(row.selected_choice.content_blocks) }, is_correct: row.is_correct }
}

export async function listHistory(user: User | null, params: Record<string, unknown>, db: Database = getDatabase()) {
  const current = requireUser(user)
  const { page, perPage } = pagination(params)
  const [count] = await query<{ total: number }>('SELECT COUNT(*)::integer AS total FROM answer_histories WHERE user_id=$1', [current.id], db)
  const rows = await query<HistoryRow>(`${historySelect} WHERE ah.user_id=$1 ORDER BY ah.created_at DESC,ah.id DESC LIMIT $2 OFFSET $3`, [current.id, perPage, (page - 1) * perPage], db)
  const fullAccess = await hasPaidAccess(current, db)
  return { data: rows.map(row => serializeHistory(row, fullAccess)), meta: meta(page, perPage, Number(count!.total)) }
}

export async function getHistory(id: number, user: User | null, db: Database = getDatabase()) {
  const current = requireUser(user)
  const [row] = await query<HistoryRow>(`${historySelect} WHERE ah.user_id=$1 AND ah.id=$2`, [current.id, id], db)
  if (!row) return notFound()
  await authorizeExam(Number(row.question.exam_number), current, db)
  const choices = await query<ChoiceRecord>('SELECT * FROM question_choices WHERE question_id=$1 AND is_correct=true', [row.question.id], db)
  if (!choices[0]) return notFound()
  return { data: { ...serializeHistory(row, await hasPaidAccess(current, db)), correct_choice: serializeChoice(choices[0]),
    explanation_blocks: row.question.explanation_blocks, source_text: row.question.source_text } }
}

type FavoriteRow = { id: number, created_at: Date | string, question: QuestionRecord }
function serializeFavorite(row: FavoriteRow, fullAccess: boolean) {
  const base = { id: Number(row.id), question: { id: Number(row.question.id), exam_number: Number(row.question.exam_number), question_number: Number(row.question.question_number) }, created_at: iso(row.created_at) }
  if (row.question.exam_number > freeExamMax && !fullAccess) return { ...base, locked: true }
  return { ...base, locked: false, question: { ...base.question, body_excerpt: excerptFrom(row.question.content_blocks), major_category_code: row.question.major_category_code, category_code: row.question.category_code } }
}
async function authorizeFavorites(user: User | null, db: Database): Promise<User> {
  const current = requireUser(user)
  if (!await hasPaidAccess(current, db)) fail(403, 'paid_membership_required', 'お気に入りの利用にはプレミアム会員資格が必要です')
  return current
}

export async function listFavorites(user: User | null, params: Record<string, unknown>, db: Database = getDatabase()) {
  const current = await authorizeFavorites(user, db)
  const { page, perPage } = pagination(params)
  const [count] = await query<{ total: number }>("SELECT COUNT(*)::integer AS total FROM favorites f JOIN questions q ON q.id=f.question_id WHERE f.user_id=$1 AND q.publication_status='published'", [current.id], db)
  const rows = await query<FavoriteRow>("SELECT f.id,f.created_at,row_to_json(q) AS question FROM favorites f JOIN questions q ON q.id=f.question_id WHERE f.user_id=$1 AND q.publication_status='published' ORDER BY f.created_at DESC,f.id DESC LIMIT $2 OFFSET $3", [current.id, perPage, (page - 1) * perPage], db)
  return { data: rows.map(row => serializeFavorite(row, true)), meta: meta(page, perPage, Number(count!.total)) }
}

export async function putFavorite(questionId: number, user: User | null, db?: Database) {
  return transaction(async connection => {
    const current = await authorizeFavorites(user, connection)
    const question = await loadQuestion(questionId, connection, { published: true, lock: true })
    await authorizeExam(question.exam_number, current, connection)
    const inserted = await query<{ id: number, created_at: Date | string }>('INSERT INTO favorites (user_id,question_id,created_at,updated_at) VALUES ($1,$2,NOW(),NOW()) ON CONFLICT (user_id,question_id) DO NOTHING RETURNING id,created_at', [current.id, questionId], connection)
    const favorite = inserted[0] ?? (await query<{ id: number, created_at: Date | string }>('SELECT id,created_at FROM favorites WHERE user_id=$1 AND question_id=$2', [current.id, questionId], connection))[0]!
    return { created: Boolean(inserted[0]), data: serializeFavorite({ ...favorite, question }, true) }
  }, db)
}

export async function removeFavorite(questionId: number, user: User | null, db?: Database): Promise<void> {
  await transaction(async connection => {
    const current = await authorizeFavorites(user, connection)
    await loadQuestion(questionId, connection, { published: true, lock: true })
    await query('DELETE FROM favorites WHERE user_id=$1 AND question_id=$2', [current.id, questionId], connection)
  }, db)
}

function serializeAdmin(question: QuestionRecord) {
  return { ...question, choices: question.choices.map(choice => ({ ...serializeChoice(choice), is_correct: choice.is_correct })),
    created_at: iso(question.created_at), updated_at: iso(question.updated_at) }
}

export async function listAdminQuestions(user: User | null, params: Record<string, unknown>, db: Database = getDatabase()) {
  checkAdmin(user)
  const conditions: string[] = []
  const values: unknown[] = []
  for (const key of ['exam_number', 'major_category_code', 'category_code', 'publication_status']) {
    if (!present(params[key])) continue
    if (typeof params[key] !== 'string' && typeof params[key] !== 'number') fail(400, 'bad_request', `${key}を正しく指定してください`)
    if (key === 'exam_number' && integer(params[key]) === undefined) fail(400, 'bad_request', `${key}を正しく指定してください`)
    values.push(params[key]); conditions.push(`${key}=$${values.length}`)
  }
  if (present(params.keyword)) {
    if (typeof params.keyword !== 'string') fail(400, 'bad_request', 'keywordを正しく指定してください')
    values.push(`%${params.keyword.trim().replace(/[\\%_]/g, '\\$&')}%`)
    conditions.push(`content_blocks::text ILIKE $${values.length}`)
  }
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''
  const [count] = await query<{ total: number }>(`SELECT COUNT(*)::integer AS total FROM questions${where}`, values, db)
  const total = Number(count!.total)
  const requestedPage = integer(params.page)
  const requestedPerPage = integer(params.per_page)
  const perPage = Math.min(requestedPerPage && requestedPerPage > 0 ? requestedPerPage : 20, 100)
  const page = Math.min(requestedPage && requestedPage > 0 ? requestedPage : 1, Math.max(1, Math.ceil(total / perPage)))
  const rows = await query<QuestionRecord>(`SELECT * FROM questions${where} ORDER BY exam_number,question_number,id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, perPage, (page - 1) * perPage], db)
  return { data: rows.map(question => ({ id: Number(question.id), exam_number: Number(question.exam_number), question_number: Number(question.question_number),
    summary: question.content_blocks.filter(block => ['text', 'quote', 'fill_in_text', 'fill_in_quote'].includes(block.type)).map(block => block.text ?? '').join(' ').replace(/\s+/g, ' ').trim() || '表・プログラムを含む問題',
    major_category_code: question.major_category_code, category_code: question.category_code, publication_status: question.publication_status, updated_at: iso(question.updated_at) })),
  meta: meta(page, perPage, total, true) }
}

/** Dispatch only this service's endpoints; the root router owns auth and throttling. */
export async function handleLearning(event: H3Event, parts: string[], user: User | null): Promise<unknown | undefined> {
  const method = getMethod(event)
  if (parts.length === 1 && parts[0] === 'exams' && method === 'GET') return listExams(user)
  if (parts[0] === 'questions') {
    if (parts.length === 2 && parts[1] === 'next' && method === 'GET') return nextQuestion(getQuery(event), user)
    if (parts.length === 2 && method === 'GET') return getQuestion(idFrom(parts[1]), user)
    if (parts.length === 3 && parts[2] === 'answer' && method === 'POST') {
      const body = await readBody<Record<string, unknown>>(event)
      return answerQuestion(idFrom(parts[1]), body?.selected_choice_id, user)
    }
    if (parts.length === 3 && parts[2] === 'favorite' && method === 'PUT') {
      const result = await putFavorite(idFrom(parts[1]), user)
      setResponseStatus(event, result.created ? 201 : 200)
      return { data: result.data }
    }
    if (parts.length === 3 && parts[2] === 'favorite' && method === 'DELETE') {
      await removeFavorite(idFrom(parts[1]), user); setResponseStatus(event, 204); return null
    }
  }
  if (parts[0] === 'answer_histories') {
    if (parts.length === 1 && method === 'GET') return listHistory(user, getQuery(event))
    if (parts.length === 2 && method === 'GET') return getHistory(idFrom(parts[1]), user)
  }
  if (parts.length === 1 && parts[0] === 'favorites' && method === 'GET') return listFavorites(user, getQuery(event))
  if (parts[0] === 'admin' && parts[1] === 'questions') {
    checkAdmin(user)
    if (parts.length === 2 && method === 'GET') return listAdminQuestions(user, getQuery(event))
    if (parts.length === 3 && method === 'GET') return { data: serializeAdmin(await loadQuestion(idFrom(parts[2]), getDatabase())) }
    if ((parts.length === 2 && method === 'POST') || (parts.length === 3 && ['PATCH', 'PUT'].includes(method))) {
      const body = await readBody<Record<string, unknown>>(event)
      const input = sanitizeQuestionInput(body?.question)
      const question = await saveQuestion(input, { id: parts.length === 3 ? idFrom(parts[2]) : undefined, requireCompleteExam: true })
      setResponseStatus(event, parts.length === 2 ? 201 : 200)
      return { data: serializeAdmin(question) }
    }
    if (parts.length === 3 && method === 'DELETE') {
      await deleteQuestion(idFrom(parts[2])); setResponseStatus(event, 204); return null
    }
  }
  return undefined
}
