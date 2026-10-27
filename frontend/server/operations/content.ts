import { lstat, readFile, mkdtemp, writeFile, link, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { query, transaction, type Database } from '../core/db.ts'
import { environment } from '../core/config.ts'
import { validateQuestionInput, type QuestionInput } from '../services/learning-validation.ts'
import { saveQuestion, validateCompleteExam } from '../services/learning-writer.ts'
import { canonical, digest, OperationError, ARCHIVE_FORMAT } from './archive-common.ts'
import { validateArchiveV2, importArchiveV2, exportArchiveV2, type ArchiveV2 } from './content-v2.ts'
export { canonical, digest, OperationError, ARCHIVE_FORMAT } from './archive-common.ts'
export { createArchiveV2, validateArchiveV2 } from './content-v2.ts'

export const IMPORT_CONFIRMATION = 'IMPORT_INTO_EMPTY_DATABASE'
export const MAX_CONTENT_BYTES = 64 * 1024 * 1024
export const QUESTION_LOCK = 71514345
export const defaultContentPath = fileURLToPath(new URL('../../../content/questions.json', import.meta.url))
const QUESTION_KEYS = ['exam_number', 'question_number', 'major_category_code', 'category_code', 'content_blocks', 'explanation_blocks', 'source_text', 'publication_status', 'choices']
const OPTIONAL_QUESTION_KEYS = ['is_cultural_history', 'is_art_history', 'cultural_history_category']
const CHOICE_KEYS = ['choice_label', 'content_blocks', 'is_correct', 'display_order']
const BLOCK_KEYS: Record<string, string[]> = {
  text: ['type', 'text'], quote: ['type', 'text', 'source'], fill_in_text: ['type', 'text'],
  fill_in_quote: ['type', 'text'], table: ['type', 'headers', 'rows'], code: ['type', 'title', 'code'],
  code_group: ['type', 'items'], fill_in_choice: ['type', 'cells'],
}

const object = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const exactKeys = (value: unknown, keys: string[]): value is Record<string, any> => object(value) && Object.keys(value).sort().join('\0') === [...keys].sort().join('\0')

function validateBlocks(blocks: unknown): void {
  if (!Array.isArray(blocks)) throw new OperationError('表示ブロックは配列で指定してください')
  for (const block of blocks) {
    if (!object(block) || !BLOCK_KEYS[block.type] || Object.keys(block).some(key => !BLOCK_KEYS[block.type]!.includes(key))) throw new OperationError('表示ブロックに未対応の属性があります')
    if (block.type === 'code_group' && (!Array.isArray(block.items) || block.items.some((item: unknown) => !object(item) || Object.keys(item).some(key => !['title', 'code'].includes(key))))) throw new OperationError('プログラム比較の形式を確認してください')
  }
}

export function validateQuestions(value: unknown): QuestionInput[] {
  if (!Array.isArray(value)) throw new OperationError('問題は配列で指定してください')
  const coordinates = new Set<string>()
  return value.map(raw => {
    if (!object(raw) || QUESTION_KEYS.some(key => !Object.hasOwn(raw, key)) || Object.keys(raw).some(key => !QUESTION_KEYS.includes(key) && !OPTIONAL_QUESTION_KEYS.includes(key)) || !Array.isArray(raw.choices) || raw.choices.some((choice: unknown) => !exactKeys(choice, CHOICE_KEYS))) throw new OperationError('問題データの属性が不足しているか未対応の属性があります')
    if (!Number.isSafeInteger(raw.exam_number) || !Number.isSafeInteger(raw.question_number) || raw.choices.some((choice: any) => !Number.isSafeInteger(choice.display_order))) throw new OperationError('問題の番号と選択肢の表示順は整数で指定してください')
    validateBlocks(raw.content_blocks)
    validateBlocks(raw.explanation_blocks)
    raw.choices.forEach((choice: any) => validateBlocks(choice.content_blocks))
    const input = validateQuestionInput(raw)
    const coordinate = `${input.exam_number}/${input.question_number}`
    if (coordinates.has(coordinate)) throw new OperationError('試験ナンバーと問番号が重複しています')
    coordinates.add(coordinate)
    // Preserve optional fields exactly, including omitted topic flags, so legacy v1 checksums remain valid.
    return structuredClone(raw) as QuestionInput
  })
}

export type LegacyArchiveDocument = {
  format: string, version: 1, question_count: number, choice_count: number,
  sha256: string, questions: QuestionInput[]
}
export type ArchiveDocument = LegacyArchiveDocument | ArchiveV2
export function createArchive(questions: unknown): LegacyArchiveDocument {
  const validated = validateQuestions(questions)
  const body = { format: ARCHIVE_FORMAT, version: 1 as const, question_count: validated.length,
    choice_count: validated.reduce((count, question) => count + question.choices.length, 0), questions: validated }
  return { ...body, sha256: digest(body) }
}
export function validateArchive(value: unknown): ArchiveDocument {
  if (object(value) && value.version === 2) return validateArchiveV2(value)
  if (!exactKeys(value, ['format', 'version', 'question_count', 'choice_count', 'sha256', 'questions']) || value.format !== ARCHIVE_FORMAT || value.version !== 1) throw new OperationError('未対応のアーカイブ形式です')
  const archive = createArchive(value.questions)
  if (!Number.isSafeInteger(value.question_count) || !Number.isSafeInteger(value.choice_count) || value.question_count !== archive.question_count || value.choice_count !== archive.choice_count || typeof value.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(value.sha256) || value.sha256 !== archive.sha256) throw new OperationError('アーカイブの件数又は照合値が一致しません')
  return archive
}
const summary = (archive: ArchiveDocument) => ({ format: archive.format, version: archive.version, question_count: archive.question_count, choice_count: archive.choice_count, sha256: archive.sha256 })

async function readJson(path: string): Promise<unknown> {
  try {
    if (!path || path.includes('\0') || !(await lstat(path)).isFile()) throw new OperationError('取込元には通常のJSONファイルを指定してください')
    if ((await lstat(path)).size > MAX_CONTENT_BYTES) throw new OperationError('問題データのサイズ上限を超えています')
    const bytes = await readFile(path)
    if (bytes.length > MAX_CONTENT_BYTES) throw new OperationError('問題データのサイズ上限を超えています')
    return JSON.parse(bytes.toString('utf8'))
  } catch (error) {
    if (error instanceof OperationError) throw error
    throw new OperationError('問題データを読み取れません。配置とJSON形式を確認してください')
  }
}

export async function importArchive(document: unknown, confirmation: string | undefined, db?: Database) {
  if (confirmation !== IMPORT_CONFIRMATION) throw new OperationError('空のDBへ取り込む明示的な確認が必要です')
  const archive = validateArchive(document)
  if (archive.version === 2) return importArchiveV2(archive, db)
  return transaction(async connection => {
    await query('SELECT pg_advisory_xact_lock($1)', [QUESTION_LOCK], connection)
    await query('LOCK TABLE questions, question_choices IN SHARE ROW EXCLUSIVE MODE', [], connection)
    const [count] = await query<{ total: number }>('SELECT (SELECT count(*) FROM questions) + (SELECT count(*) FROM question_choices) + (SELECT count(*) FROM question_groups) + (SELECT count(*) FROM group_passages) AS total', [], connection)
    if (Number(count?.total) !== 0) throw new OperationError('問題・選択肢・大問・共通本文が空のDBだけに取り込めます。既存データは上書きしません')
    for (const question of archive.questions) await saveQuestion(question, { db: connection, requireCompleteExam: false })
    const publishedSets = new Set(archive.questions.filter(question => question.publication_status === 'published').map(question => question.exam_number))
    for (const exam of publishedSets) await validateCompleteExam(exam, connection)
    return summary(archive)
  }, db)
}
export async function importContent(path = defaultContentPath, confirmation?: string, db?: Database) {
  const document = await readJson(path)
  if (!exactKeys(document, ['schema_version', 'questions']) || document.schema_version !== 1 || !Array.isArray(document.questions) || document.questions.length === 0) throw new OperationError('問題データはschema_version: 1と空でないquestions配列で指定してください')
  return importArchive(createArchive(document.questions), confirmation, db)
}
export async function importArchiveFile(path: string, confirmation?: string, db?: Database) {
  return importArchive(await readJson(path), confirmation, db)
}
export async function seedContent(options: { path?: string, db?: Database, mode?: string } = {}) {
  if ((options.mode ?? environment()) !== 'development') return { status: 'skipped' as const }
  return transaction(async connection => {
    await query('SELECT pg_advisory_xact_lock($1)', [QUESTION_LOCK], connection)
    await query('LOCK TABLE questions, question_choices IN SHARE ROW EXCLUSIVE MODE', [], connection)
    const [count] = await query<{ total: number }>('SELECT (SELECT count(*) FROM questions) + (SELECT count(*) FROM question_choices) AS total', [], connection)
    if (Number(count?.total) !== 0) return { status: 'skipped' as const }
    const report = await importContent(options.path, IMPORT_CONFIRMATION, connection)
    return { status: 'imported' as const, ...report }
  }, options.db)
}

export async function exportArchive(path: string, db?: Database) {
  if (!path || path.includes('\0')) throw new OperationError('出力先のパスを明示してください')
  const archive = await transaction(async connection => {
    if (!db) await query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY', [], connection)
    const rows = await query<QuestionInput>(`SELECT q.exam_number, q.question_number, q.major_category_code, q.category_code,
      q.content_blocks, q.explanation_blocks, q.source_text, q.publication_status, q.is_cultural_history, q.is_art_history, q.cultural_history_category,
      q.group_id,q.group_question_number,q.answer_type,q.accepted_answers,q.input_constraints,q.source_references,q.essay_config,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('major_category_code',t.major_category_code,'category_code',t.category_code) ORDER BY t.major_category_code,t.category_code) FROM question_topic_links t WHERE t.question_id=q.id AND NOT (t.major_category_code=q.major_category_code AND t.category_code=q.category_code)), '[]'::jsonb) AS related_topics,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('passage_id',r.passage_id,'anchor_id',r.anchor_id) ORDER BY r.passage_id,r.anchor_id) FROM question_passage_references r WHERE r.question_id=q.id), '[]'::jsonb) AS passage_references,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('choice_label', c.choice_label, 'content_blocks', c.content_blocks,
        'is_correct', c.is_correct, 'display_order', c.display_order) ORDER BY c.display_order)
        FROM question_choices c WHERE c.question_id = q.id), '[]'::jsonb) AS choices
      FROM questions q ORDER BY q.exam_number, q.question_number`, [], connection)
    return exportArchiveV2(rows, connection)
  }, db)
  const encoded = JSON.stringify(archive, null, 2) + '\n'
  if (Buffer.byteLength(encoded) > MAX_CONTENT_BYTES) throw new OperationError('アーカイブのサイズ上限を超えています')
  let temporary: string | undefined
  try {
    const destination = resolve(path)
    temporary = await mkdtemp(join(dirname(destination), '.exam-questions-'))
    const file = join(temporary, 'archive.json')
    await writeFile(file, encoded, { mode: 0o600, flag: 'wx' })
    await link(file, destination)
  } catch {
    throw new OperationError('書き出せません。出力先が未使用であることと権限を確認してください')
  } finally { if (temporary) await rm(temporary, { recursive: true, force: true }) }
  return summary(archive)
}
