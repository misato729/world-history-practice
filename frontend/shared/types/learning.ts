export type AnswerType = 'single_choice' | 'short_text' | 'essay'
export type ExamFormatCode = 'legacy_practice' | 'group_practice' | 'rekiken_mock'
export type PassageInline =
  | { type: 'text'; text: string }
  | { type: 'anchor'; id: string; label: string; text: string; underline?: boolean }
  | { type: 'blank'; id: string; label: string }
export type LearningBlock = {
  type: string; id?: string; text?: string; inlines?: PassageInline[]; source?: string | null
  title?: string | null; code?: string; headers?: string[]; rows?: string[][]
  items?: { title?: string | null; code: string }[]; cells?: string[]
}
export type SourceReference = {
  kind: 'book' | 'web'; title: string; publisher?: string; edition?: string
  publication_year?: string; section?: string; locator?: string; url?: string; checked_at?: string
}
export type InputConstraints = { script?: 'any' | 'kanji' | 'katakana'; exact_length?: number; max_length?: number; hint?: string }
export type TopicLink = { major_category_code: string; category_code: string }
export type PassageReference = { passage_id: number; anchor_id: string | null }
export type GroupPassage = { id: number; group_id?: number; label: string; display_order: number; content_blocks: LearningBlock[] }
export type QuestionGroup = {
  id: number; exam_number: number; group_number: number; title: string; planned_question_count: number
  publication_status: string; lock_version: number; passages: GroupPassage[]; questions?: any[]
}
export type ExamSet = {
  exam_number: number; title: string; format_code: ExamFormatCode; publication_status: string
  lock_version: number; groups: QuestionGroup[]
}
export type AnswerInput =
  | { answer_type: 'single_choice'; selected_choice_id: number; question_version: number; submission_key: string }
  | { answer_type: 'short_text'; submitted_text: string; question_version: number; submission_key: string }
  | { answer_type: 'essay'; submitted_text: string; question_version: number; submission_key: string }
