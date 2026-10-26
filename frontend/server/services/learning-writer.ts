import { createHash } from 'node:crypto'
import type { ExamConfiguration } from '../../app/utils/examConfig.ts'
import { configuration } from '../core/config.ts'
import { query, transaction, type Database } from '../core/db.ts'
import { fail } from '../core/errors.ts'
import { validateQuestionInput, type ChoiceInput, type QuestionInput } from './learning-validation.ts'

export type { QuestionInput, ChoiceInput } from './learning-validation.ts'
export type ChoiceRecord = ChoiceInput & { id: number, question_id: number }
export type QuestionRecord = Omit<QuestionInput, 'choices'> & {
  id: number
  created_at: Date | string
  updated_at: Date | string
  choices: ChoiceRecord[]
}
export const QUESTION_WRITE_LOCK = 71514345
const notFound = (): never => fail(404, 'not_found', '対象が見つかりません')

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)]))
  return value
}

/** Visibility, topic flags and record IDs do not change the meaning of an answer. */
export function materialDigest(question: QuestionInput | QuestionRecord): string {
  return createHash('sha256').update(JSON.stringify(canonical({
    exam_number: question.exam_number, question_number: question.question_number,
    major_category_code: question.major_category_code, category_code: question.category_code,
    content_blocks: question.content_blocks, explanation_blocks: question.explanation_blocks,
    source_text: question.source_text,
    choices: question.choices.map(choice => ({ choice_label: choice.choice_label,
      content_blocks: choice.content_blocks, is_correct: choice.is_correct, display_order: choice.display_order })),
  }))).digest('hex')
}

export async function loadQuestion(id: number, db: Database, options: { published?: boolean, lock?: boolean } = {}): Promise<QuestionRecord> {
  const rows = await query<Omit<QuestionRecord, 'choices'>>(`SELECT * FROM questions WHERE id = $1${options.published ? " AND publication_status = 'published'" : ''}${options.lock ? ' FOR UPDATE' : ''}`, [id], db)
  const row = rows[0]
  if (!row) return notFound()
  const choices = await query<ChoiceRecord>('SELECT id, question_id, choice_label, content_blocks, is_correct, display_order FROM question_choices WHERE question_id = $1 ORDER BY display_order', [id], db)
  return { ...row, id: Number(row.id), exam_number: Number(row.exam_number), question_number: Number(row.question_number), choices: choices.map(choice => ({ ...choice, id: Number(choice.id), question_id: Number(choice.question_id), display_order: Number(choice.display_order) })) }
}

export async function validateCompleteExam(examNumber: number, db: Database, config: ExamConfiguration = configuration, current?: { id?: number, question_number: number }): Promise<void> {
  const values: unknown[] = [examNumber]
  if (current?.id !== undefined) values.push(current.id)
  const existing = await query<{ question_number: number }>(`SELECT question_number FROM questions WHERE exam_number = $1${current?.id === undefined ? '' : ' AND id <> $2'}`, values, db)
  const registered = new Set(existing.map(row => Number(row.question_number)))
  if (current) registered.add(current.question_number)
  const missing = Array.from({ length: config.exam.questions_per_exam }, (_, index) => index + 1).filter(number => !registered.has(number))
  if (missing.length) fail(422, 'validation_error', `模擬試験${examNumber}を公開するには問1〜${config.exam.questions_per_exam}の登録が必要です。不足：${missing.map(number => `問${number}`).join('、')}`, { base: ['公開する試験セットの問題数が不足しています'] })
}

type SaveOptions = { id?: number, db?: Database, requireCompleteExam?: boolean, config?: ExamConfiguration }

/** Shared writer for the admin API and explicit empty-database content import. */
export async function saveQuestion(raw: QuestionInput, options: SaveOptions = {}): Promise<QuestionRecord> {
  const config = options.config ?? configuration
  const input = validateQuestionInput(raw, config)
  try {
    return await transaction(async db => {
      await query('SELECT pg_advisory_xact_lock($1)', [QUESTION_WRITE_LOCK], db)
      const before = options.id === undefined ? undefined : await loadQuestion(options.id, db, { lock: true })
      for (const choice of input.choices) {
        if (choice.id !== undefined && !before?.choices.some(previous => previous.id === choice.id && previous.choice_label === choice.choice_label)) {
          fail(422, 'validation_error', '選択肢IDと問題・ラベルが一致しません')
        }
      }
      if (input.publication_status === 'published' && options.requireCompleteExam) {
        await validateCompleteExam(input.exam_number, db, config, { id: options.id, question_number: input.question_number })
      }
      const values: unknown[] = [input.exam_number, input.question_number, input.major_category_code, input.category_code,
        JSON.stringify(input.content_blocks), JSON.stringify(input.explanation_blocks), input.source_text, input.publication_status,
        input.is_cultural_history, input.is_art_history]
      let id: number
      if (before) {
        values.push(before.id)
        const changed = materialDigest(before) !== materialDigest(input)
        if (changed || before.publication_status !== input.publication_status || before.is_cultural_history !== input.is_cultural_history || before.is_art_history !== input.is_art_history) {
          await query('UPDATE questions SET exam_number=$1, question_number=$2, major_category_code=$3, category_code=$4, content_blocks=$5::jsonb, explanation_blocks=$6::jsonb, source_text=$7, publication_status=$8, is_cultural_history=$9, is_art_history=$10, updated_at=NOW() WHERE id=$11', values, db)
        }
        id = before.id
        if (changed) await query('DELETE FROM answer_histories WHERE question_id=$1', [id], db)
      } else {
        const rows = await query<{ id: number }>('INSERT INTO questions (exam_number,question_number,major_category_code,category_code,content_blocks,explanation_blocks,source_text,publication_status,is_cultural_history,is_art_history,created_at,updated_at) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10,NOW(),NOW()) RETURNING id', values, db)
        id = Number(rows[0]!.id)
      }
      const choicePayload = (choices: ChoiceInput[]) => JSON.stringify(canonical(choices.map(choice => ({
        choice_label: choice.choice_label, content_blocks: choice.content_blocks,
        is_correct: choice.is_correct, display_order: choice.display_order,
      }))))
      if (!before || choicePayload(before.choices) !== choicePayload(input.choices)) {
        // Clear the partial unique index before changing which answer is correct.
        await query('UPDATE question_choices SET is_correct=false WHERE question_id=$1', [id], db)
        for (const choice of input.choices) {
        await query('INSERT INTO question_choices (question_id,choice_label,content_blocks,is_correct,display_order,created_at,updated_at) VALUES ($1,$2,$3::jsonb,$4,$5,NOW(),NOW()) ON CONFLICT (question_id,choice_label) DO UPDATE SET content_blocks=EXCLUDED.content_blocks,is_correct=EXCLUDED.is_correct,display_order=EXCLUDED.display_order,updated_at=NOW()',
          [id, choice.choice_label, JSON.stringify(choice.content_blocks), choice.is_correct, choice.display_order], db)
        }
      }
      const saved = await loadQuestion(id, db)
      if (saved.choices.length !== config.exam.choice_labels.length || saved.choices.filter(choice => choice.is_correct).length !== 1) {
        fail(422, 'validation_error', `選択肢は${config.exam.choice_labels.length}件、正答は1件必要です`)
      }
      return saved
    }, options.db)
  } catch (error) {
    if ((error as { code?: string }).code === '23505') fail(422, 'validation_error', '入力内容を確認してください', { question_number: ['は同じ試験セット内で既に使用されています'] })
    throw error
  }
}

export async function deleteQuestion(id: number, db?: Database): Promise<void> {
  await transaction(async connection => {
    await query('SELECT pg_advisory_xact_lock($1)', [QUESTION_WRITE_LOCK], connection)
    await loadQuestion(id, connection, { lock: true })
    // Histories reference choices without ON DELETE CASCADE, so remove them first.
    await query('DELETE FROM answer_histories WHERE question_id=$1', [id], connection)
    await query('DELETE FROM questions WHERE id=$1', [id], connection)
  }, db)
}
