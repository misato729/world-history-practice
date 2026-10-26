import type { ExamConfiguration } from '../../app/utils/examConfig.ts'
import type { CulturalHistoryCategoryCode } from '../../shared/examConfig.ts'
import { configuration } from '../core/config.ts'
import { fail } from '../core/errors.ts'

export type Block = {
  type: string
  text?: string
  source?: string | null
  title?: string | null
  code?: string
  headers?: string[]
  rows?: string[][]
  items?: { title?: string | null, code: string }[]
  cells?: string[]
}
export type ChoiceInput = {
  id?: number
  choice_label: string
  content_blocks: Block[]
  is_correct: boolean
  display_order: number
}
export type QuestionInput = {
  exam_number: number
  question_number: number
  major_category_code: string
  category_code: string
  is_cultural_history: boolean
  is_art_history: boolean
  cultural_history_category: CulturalHistoryCategoryCode | null
  publication_status: string
  content_blocks: Block[]
  explanation_blocks: Block[]
  source_text: string | null
  choices: ChoiceInput[]
}
export type BlockContext = 'question' | 'explanation' | 'choice'

const allowedTypes: Record<BlockContext, readonly string[]> = {
  question: ['text', 'quote', 'table', 'code', 'code_group', 'fill_in_text', 'fill_in_quote'],
  explanation: ['text', 'quote', 'table', 'code'],
  choice: ['text', 'table', 'fill_in_choice'],
}
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const nonblank = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string')
const invalid = (message: string, details: Record<string, string[]> = {}): never => fail(422, 'validation_error', message, details)

export function integer(value: unknown): number | undefined {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^[+-]?\d+$/.test(value.trim()))) return undefined
  const number = Number(value)
  return Number.isSafeInteger(number) ? number : undefined
}

function parseBlock(value: unknown, context: BlockContext, preserveOptionalAttributes: boolean): Block {
  if (!record(value) || typeof value.type !== 'string' || !allowedTypes[context].includes(value.type)) {
    return invalid('表示ブロックの種類が正しくありません', { content_blocks: ['使用できない表示ブロックです'] })
  }
  const block: Block = { type: value.type }
  switch (block.type) {
    case 'text': case 'quote': case 'fill_in_text': case 'fill_in_quote': {
      if (typeof value.text !== 'string' || (value.source !== undefined && value.source !== null && typeof value.source !== 'string')) return invalid('表示ブロックの内容の形式が不正です')
      block.text = value.text
      if (block.type === 'quote' && (preserveOptionalAttributes ? value.source !== undefined : nonblank(value.source))) block.source = value.source as string | null
      break
    }
    case 'code': {
      if (typeof value.code !== 'string' || (value.title !== undefined && value.title !== null && typeof value.title !== 'string')) return invalid('表示ブロックの内容の形式が不正です')
      block.code = value.code
      if (preserveOptionalAttributes ? value.title !== undefined : nonblank(value.title)) block.title = value.title as string | null
      break
    }
    case 'table': {
      if (!strings(value.headers) || !Array.isArray(value.rows) || !value.rows.every(row => strings(row) && row.length === (value.headers as string[]).length)) return invalid('表の列数を確認してください', { content_blocks: ['見出しと各行の列数を揃えてください'] })
      block.headers = [...value.headers]
      block.rows = value.rows.map(row => [...row as string[]])
      break
    }
    case 'fill_in_choice': {
      if (!strings(value.cells)) return invalid('表示ブロックの内容の形式が不正です')
      block.cells = [...value.cells]
      break
    }
    case 'code_group': {
      if (!Array.isArray(value.items) || !value.items.every(item => record(item) && typeof item.code === 'string' && (item.title === undefined || item.title === null || typeof item.title === 'string'))) return invalid('表示ブロックの内容の形式が不正です')
      block.items = value.items.map(item => ({ ...((preserveOptionalAttributes ? item.title !== undefined : nonblank(item.title)) ? { title: item.title as string | null } : {}), code: item.code as string }))
      break
    }
  }
  return block
}

export function validateBlocks(value: unknown, context: BlockContext, published = false, preserveOptionalAttributes = true): Block[] {
  if (!Array.isArray(value)) return invalid('表示ブロックは配列で指定してください')
  const blocks = value.map(block => parseBlock(block, context, preserveOptionalAttributes))
  if (!published) return blocks
  const complete = blocks.length > 0 && blocks.every(block => {
    switch (block.type) {
      case 'text': case 'quote': case 'fill_in_text': case 'fill_in_quote': return nonblank(block.text)
      case 'code': return nonblank(block.code)
      case 'fill_in_choice': return Boolean(block.cells?.length && block.cells.every(nonblank))
      case 'code_group': return Boolean(block.items && block.items.length >= 2 && block.items.every(item => nonblank(item.code)))
      case 'table': return Boolean(block.headers?.length && block.rows?.length && block.headers.some(nonblank) && block.rows.flat().some(nonblank))
      default: return false
    }
  })
  if (!complete) return invalid('公開する問題の本文・解説・選択肢に空または不正な表示ブロックがあります')
  return blocks
}

export function validSource(line: string): boolean {
  const match = /^.+\s\|\s(https:\/\/\S+)$/.exec(line)
  if (!match?.[1]) return false
  try {
    const url = new URL(match[1])
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
  } catch { return false }
}

/** Validate canonical content from either an admin request or a content archive. */
export function validateQuestionInput(value: unknown, config: ExamConfiguration = configuration, preserveOptionalAttributes = true): QuestionInput {
  if (!record(value)) return invalid('問題の入力内容を確認してください')
  const examNumber = integer(value.exam_number)
  const questionNumber = integer(value.question_number)
  if (examNumber === undefined || examNumber < 1 || examNumber > config.exam.set_count) return invalid('入力内容を確認してください', { exam_number: [`は1〜${config.exam.set_count}の整数で指定してください`] })
  if (questionNumber === undefined || questionNumber < 1 || questionNumber > config.exam.questions_per_exam) return invalid('入力内容を確認してください', { question_number: [`は1〜${config.exam.questions_per_exam}の整数で指定してください`] })
  const major = config.categories.major.find(item => item.value === value.major_category_code)
  const category = config.categories.minor.find(item => item.value === value.category_code)
  if (!major || !category || category.major_category_value !== major.value) return invalid('入力内容を確認してください', { category_code: ['は有効な大分類・小分類の組合せを指定してください'] })
  for (const key of ['is_cultural_history', 'is_art_history']) {
    if (value[key] !== undefined && typeof value[key] !== 'boolean') return invalid('文化史・美術史の指定を確認してください', { [key]: ['は真偽値で指定してください'] })
  }
  const isCulturalHistory = value.is_cultural_history ?? false
  if (value.is_art_history && !isCulturalHistory) return invalid('美術史の問題は文化史にも指定してください', { is_cultural_history: ['美術史を指定するときは文化史も指定してください'] })
  // Older forms/archives have only the two flags. Retain their meaning without
  // guessing music or literature classifications from question text.
  const culturalHistoryCategory = value.cultural_history_category === undefined
    ? isCulturalHistory ? value.is_art_history ? 'art_history' : 'other_cultural_history' : null
    : value.cultural_history_category
  if (culturalHistoryCategory !== null && (typeof culturalHistoryCategory !== 'string' || !config.cultural_history_categories.some(item => item.value === culturalHistoryCategory))) {
    return invalid('文化史の区分を確認してください', { cultural_history_category: ['は美術史・音楽史・文学史・その他から1つ指定してください'] })
  }
  if (isCulturalHistory !== (culturalHistoryCategory !== null)) return invalid('文化史と区分の組合せを確認してください', { cultural_history_category: ['文化史には区分を1つ指定し、文化史以外は区分を指定しないでください'] })
  const isArtHistory = culturalHistoryCategory === 'art_history'
  if (value.is_art_history !== undefined && value.is_art_history !== isArtHistory) return invalid('美術史と文化史の区分が一致しません', { is_art_history: ['文化史の区分に合わせて指定してください'] })
  if (typeof value.publication_status !== 'string' || !['draft', 'published', 'private'].includes(value.publication_status)) return invalid('入力内容を確認してください', { publication_status: ['は下書き・公開・非公開から指定してください'] })
  if (value.source_text !== null && typeof value.source_text !== 'string') return invalid('出典の形式を確認してください')
  const published = value.publication_status === 'published'
  const contentBlocks = validateBlocks(value.content_blocks, 'question', published, preserveOptionalAttributes)
  const explanationBlocks = validateBlocks(value.explanation_blocks, 'explanation', published, preserveOptionalAttributes)
  const labels = config.exam.choice_labels
  if (!Array.isArray(value.choices) || value.choices.length !== labels.length) return invalid(`選択肢は${labels.length}件入力してください`, { choices: [`は${labels.length}件必要です`] })
  const choices: ChoiceInput[] = value.choices.map((raw, index) => {
    if (!record(raw)) return invalid('選択肢の形式を確認してください')
    const order = integer(raw.display_order)
    const id = raw.id === undefined || raw.id === null || raw.id === '' ? undefined : integer(raw.id)
    if (raw.choice_label !== labels[index] || order !== index + 1 || typeof raw.is_correct !== 'boolean' || (id !== undefined && id < 1) || (raw.id !== undefined && raw.id !== null && raw.id !== '' && id === undefined)) {
      return invalid(`選択肢は${labels.join('・')}の順で各1件、正答は1件必要です`)
    }
    return { ...(id === undefined ? {} : { id }), choice_label: raw.choice_label as string,
      content_blocks: validateBlocks(raw.content_blocks, 'choice', published, preserveOptionalAttributes), is_correct: raw.is_correct, display_order: order }
  })
  const ids = choices.filter(choice => choice.id !== undefined).map(choice => choice.id)
  if (new Set(ids).size !== ids.length) return invalid('選択肢IDが重複しています')
  if (choices.filter(choice => choice.is_correct).length !== 1) return invalid('正答を1件選択してください', { choices: ['正答は1件必要です'] })
  if (published) {
    const sources = (value.source_text ?? '').split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    if (sources.length === 0 || sources.some(line => !validSource(line))) return invalid('公開する問題には「資料名 | https://...」形式の出典が必要です')
    const blanks = [...new Set(contentBlocks.flatMap(block => [...(block.text ?? '').matchAll(/\{\{([^}]+)\}\}/g)].map(match => match[1]!)))].sort()
    const fillChoices = choices.map(choice => choice.content_blocks.filter(block => block.type === 'fill_in_choice'))
    if (blanks.length || fillChoices.some(blocks => blocks.length)) {
      const expected = ['①', '②', '③', '④', '⑤', '⑥'].slice(0, blanks.length)
      if (blanks.length === 0 || JSON.stringify(blanks) !== JSON.stringify(expected) || fillChoices.some(blocks => blocks.length !== 1 || blocks[0]?.cells?.length !== blanks.length)) return invalid('空欄ラベルと全選択肢のセル数を一致させてください')
    }
  }
  return { exam_number: examNumber, question_number: questionNumber, major_category_code: major.value,
    category_code: category.value, publication_status: value.publication_status,
    is_cultural_history: isCulturalHistory as boolean, is_art_history: isArtHistory as boolean,
    cultural_history_category: culturalHistoryCategory as CulturalHistoryCategoryCode | null,
    content_blocks: contentBlocks, explanation_blocks: explanationBlocks, source_text: value.source_text as string | null, choices }
}

/** Match the admin endpoint's complete form payload and ignore unrelated attributes. */
export function sanitizeQuestionInput(value: unknown, config: ExamConfiguration = configuration): QuestionInput {
  if (!record(value)) return fail(400, 'bad_request', 'questionを指定してください')
  const raw = structuredClone(value)
  for (const key of ['content_blocks', 'explanation_blocks']) {
    if (!Array.isArray(raw[key]) || raw[key].length === 0) return invalid('表示ブロックを1件以上入力してください', { content_blocks: ['は1件以上必要です'] })
  }
  raw.source_text = nonblank(raw.source_text) ? raw.source_text : null
  if (Array.isArray(raw.choices)) raw.choices = raw.choices.map((value, index) => {
    if (!record(value)) return invalid('選択肢の形式を確認してください')
    if (!Array.isArray(value.content_blocks) || value.content_blocks.length === 0) return invalid('表示ブロックを1件以上入力してください', { content_blocks: ['は1件以上必要です'] })
    const falseValues = new Set<unknown>([false, 0, '0', 'f', 'F', 'false', 'FALSE', 'off', 'OFF', '', null, undefined])
    return { ...value, is_correct: !falseValues.has(value.is_correct), display_order: index + 1 }
  })
  // Form saves keep the existing normalization; archive/writer validation keeps
  // optional empty/null attributes so a transfer preserves its exact payload.
  const input = validateQuestionInput(raw, config, false)
  for (const blocks of [input.content_blocks, input.explanation_blocks, ...input.choices.map(choice => choice.content_blocks)]) {
    for (const block of blocks) {
      if (block.type === 'table' && (!block.headers?.length || !block.rows?.length)) return invalid('表の列数を確認してください')
      if (block.type === 'code_group' && (!block.items || block.items.length < 2)) return invalid('比較するプログラムを2件以上入力してください')
    }
  }
  return input
}

export function excerptFrom(blocks: Block[]): string {
  const text = blocks.find(block => ['text', 'quote', 'fill_in_text', 'fill_in_quote'].includes(block.type))?.text
  const value = nonblank(text)
    ? text.replace(/\{\{([^{}]+)\}\}/g, '$1').replace(/\s+/g, ' ').trim()
    : (blocks.find(block => block.type === 'fill_in_choice')?.cells ?? []).join(' / ')
  const characters = Array.from(value)
  return characters.length > 120 ? `${characters.slice(0, 117).join('')}...` : value
}
