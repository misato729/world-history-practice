export type EssayConstraints = { max_characters: number; required_terms: string[] }

// The published word limit counts punctuation and digits, but excludes whitespace.
export const essayCharacterCount = (value: string) => Array.from(value.replace(/\s/gu, '')).length

export const essayAnswerIssue = (value: string, constraints?: EssayConstraints) => {
  if (!value.trim()) return '回答を入力してください。'
  if (value.length > 4000) return '入力が長すぎます。'
  const maximum = constraints?.max_characters ?? 1000
  if (essayCharacterCount(value) > maximum) return `${maximum}字以内で入力してください。`
  return ''
}
