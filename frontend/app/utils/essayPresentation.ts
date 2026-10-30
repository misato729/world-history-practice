import type { EssayGrade } from '../../shared/types/essay.ts'

export type EssayConstraints = { max_characters: number; required_terms: string[] }

// Count confirmed criteria, independently of their point weights.
export const essayElementCountLabel = (result: Pick<EssayGrade, 'elements'>) => (
  `${result.elements.length}要素中${result.elements.filter(element => element.status === 'matched').length}要素を確認`
)

export const essayResultSummary = (result?: EssayGrade) => {
  if (!result) return '論述・判定保留'
  const reference = result.grading_status === 'invalid'
    ? '参考点未確定'
    : `参考${result.confirmed_points} / ${result.max_points}点`
  const pending = result.grading_status !== 'invalid' && result.pending_points > 0 ? `（${result.pending_points}点分は判定保留）` : ''
  return `${essayElementCountLabel(result)}・${reference}${pending}`
}

// The published word limit counts punctuation and digits, but excludes whitespace.
export const essayCharacterCount = (value: string) => Array.from(value.replace(/\s/gu, '')).length

export const essayAnswerIssue = (value: string, constraints?: EssayConstraints) => {
  if (!value.trim()) return '回答を入力してください。'
  if (value.length > 4000) return '入力が長すぎます。'
  const maximum = constraints?.max_characters ?? 1000
  if (essayCharacterCount(value) > maximum) return `${maximum}字以内で入力してください。`
  return ''
}
