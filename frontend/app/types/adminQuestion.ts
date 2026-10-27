import { EXAM_CONFIG, type CulturalHistoryCategoryCode, type ExamConfiguration } from '../utils/examConfig.ts'
import type { EssayQuestionConfig } from '../../shared/types/essay.ts'
import type { AnswerType, InputConstraints, PassageInline, PassageReference, SourceReference, TopicLink, GroupPassage } from '../../shared/types/learning.ts'

export type ContentBlockType =
  | 'text'
  | 'quote'
  | 'table'
  | 'code'
  | 'code_group'
  | 'fill_in_text'
  | 'fill_in_quote'
  | 'fill_in_choice'

export type ContentBlock = {
  type: ContentBlockType
  id?: string
  text?: string
  inlines?: PassageInline[]
  source?: string | null
  title?: string | null
  code?: string
  headers?: string[]
  rows?: string[][]
  items?: { title?: string | null, code: string }[]
  cells?: string[]
}

export type AdminChoice = {
  id?: number
  choice_label: string
  content_blocks: ContentBlock[]
  is_correct: boolean
  display_order: number
}

export type AdminQuestionInput = {
  exam_number: number
  question_number: number
  content_blocks: ContentBlock[]
  major_category_code: string
  category_code: string
  is_cultural_history: boolean
  is_art_history: boolean
  cultural_history_category: CulturalHistoryCategoryCode | null
  explanation_blocks: ContentBlock[]
  source_text: string
  publication_status: string
  choices: AdminChoice[]
  group_id?: number | null
  group_question_number?: number | null
  answer_type?: AnswerType
  answer_type_locked?: boolean
  essay_config?: Partial<EssayQuestionConfig>
  accepted_answers?: string[]
  input_constraints?: InputConstraints
  related_topics?: TopicLink[]
  source_references?: SourceReference[]
  passage_references?: PassageReference[]
  lock_version?: number
}

export type AdminQuestion = AdminQuestionInput & {
  id: number
  created_at: string
  updated_at: string
  content_version?: number
  answer_history_count?: number
  shared_passages?: GroupPassage[]
}

export type AdminQuestionSummary = {
  id: number
  exam_number: number
  question_number: number
  summary: string
  major_category_code: string
  category_code: string
  is_cultural_history: boolean
  is_art_history: boolean
  cultural_history_category: CulturalHistoryCategoryCode | null
  publication_status: string
  updated_at: string
  answer_type?: AnswerType
  group_id?: number | null
  group_question_number?: number | null
}

export type ApiResponse<T> = { data: T }

export type PaginatedApiResponse<T> = {
  data: T[]
  meta: {
    current_page: number
    per_page: number
    total_count: number
    total_pages: number
  }
}

export const createEmptyQuestion = (config: ExamConfiguration = EXAM_CONFIG): AdminQuestionInput => ({
  exam_number: 1,
  question_number: 1,
  content_blocks: [{ type: 'text', text: '' }],
  major_category_code: config.categories.minor[0]!.major_category_value,
  category_code: config.categories.minor[0]!.value,
  is_cultural_history: false,
  is_art_history: false,
  cultural_history_category: null,
  explanation_blocks: [{ type: 'text', text: '' }],
  source_text: '',
  publication_status: 'draft',
  group_id: null,
  group_question_number: null,
  answer_type: 'single_choice',
  essay_config: {},
  accepted_answers: [],
  input_constraints: {},
  related_topics: [],
  source_references: [],
  passage_references: [],
  choices: config.exam.choice_labels.map((label, index) => ({
    choice_label: label,
    content_blocks: [{ type: 'text', text: '' }],
    is_correct: index === 0,
    display_order: index + 1,
  })),
})
