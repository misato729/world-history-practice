import { EXAM_CONFIG, type ExamConfiguration } from './examConfig.ts'

export type ExamCatalogGroup = { id: number; group_number: number; title: string; question_numbers: number[] }

export type ExamCatalogEntry = {
  exam_number: number
  question_numbers: readonly number[]
  title?: string
  format_code?: 'legacy_practice' | 'group_practice' | 'rekiken_mock'
  question_count?: number
  published_question_count?: number
  access?: 'available' | 'paid_membership_required'
  groups?: ExamCatalogGroup[]
}

export const FREE_EXAM_MAX = EXAM_CONFIG.payments.enabled ? EXAM_CONFIG.payments.free_exam_count : EXAM_CONFIG.exam.set_count
export const EXAM_SET_COUNT = EXAM_CONFIG.exam.set_count
export const QUESTIONS_PER_EXAM = EXAM_CONFIG.exam.questions_per_exam

// Retained for configured-slot validation; public navigation uses the API catalog.
export const createExamCatalog = (config: ExamConfiguration = EXAM_CONFIG): readonly ExamCatalogEntry[] => Object.freeze(
  Array.from({ length: config.exam.set_count }, (_, index) => Object.freeze({
    exam_number: index + 1,
    question_numbers: Object.freeze(Array.from({ length: config.exam.questions_per_exam }, (_, questionIndex) => questionIndex + 1)),
  })),
)
export const EXAM_CATALOG = createExamCatalog()
export const FREE_EXAM_CATALOG = EXAM_CATALOG.filter(exam => exam.exam_number <= FREE_EXAM_MAX)

/** Config defines permitted slots; only the API catalog defines published positions. */
export const publishedQuestionNumbers = (catalog: readonly ExamCatalogEntry[]) => [...new Set(catalog.flatMap(exam => [...exam.question_numbers]))].sort((a, b) => a - b)

export const catalogExamLabel = (examNumber: number) => `模擬試験${examNumber}`
export const catalogGroupLabel = (group: Pick<ExamCatalogGroup, 'group_number' | 'title'>) => {
  const title = group.title.trim()
  return `大問${group.group_number}${title ? ` ${title}` : ''}`
}
export const catalogExamStartNumber = (exam: ExamCatalogEntry) => exam.question_numbers.find(number => Number.isSafeInteger(number) && number > 0)

/** A group is navigable only when its first child exists in the public catalog. */
export const catalogGroupLinks = (exam: ExamCatalogEntry) => {
  const published = new Set(exam.question_numbers)
  return [...(exam.groups ?? [])].sort((left, right) => left.group_number - right.group_number).flatMap(group => {
    const questionNumber = group.question_numbers.find(number => Number.isSafeInteger(number) && number > 0 && published.has(number))
    return questionNumber === undefined ? [] : [{ group, questionNumber, to: `/practice/${exam.exam_number}/${questionNumber}` }]
  })
}

export const isCatalogGroupActive = (exam: ExamCatalogEntry, group: ExamCatalogGroup, currentExamNumber: number, currentQuestionNumber: number) => (
  exam.exam_number === currentExamNumber && exam.question_numbers.includes(currentQuestionNumber) && group.question_numbers.includes(currentQuestionNumber)
)

export const catalogQuestionLabel = (exam: ExamCatalogEntry, questionNumber: number) => {
  const group = exam.groups?.find(item => item.question_numbers.includes(questionNumber))
  return group ? `大問${group.group_number}・問${group.question_numbers.indexOf(questionNumber) + 1}` : `問${questionNumber}`
}
