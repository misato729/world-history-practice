import type { InputConstraints, SourceReference } from '../../shared/types/learning.ts'

export const passageAnchorId = (passageId: number, anchorId?: string | null) => (
  anchorId ? `passage-${passageId}-${anchorId}` : `passage-${passageId}`
)

export const shortAnswerIssue = (value: string, constraints: InputConstraints = {}) => {
  const text = value.normalize('NFKC').trim()
  if (!text) return '回答を入力してください。'
  const length = [...text].length
  if (constraints.exact_length && length !== constraints.exact_length) return `${constraints.exact_length}字で入力してください。`
  const maxLength = constraints.max_length ?? 1000
  if (length > maxLength) return `${maxLength}字以内で入力してください。`
  if (constraints.script === 'kanji' && !/^[\p{Script=Han}々〇]+$/u.test(text)) return '漢字で入力してください。'
  if (constraints.script === 'katakana' && !/^[\p{Script=Katakana}ー・＝=\s]+$/u.test(text)) return 'カタカナで入力してください。'
  return ''
}

export const inputConstraintLabel = (constraints: InputConstraints = {}) => (
  constraints.hint || [constraints.script === 'kanji' ? '漢字' : constraints.script === 'katakana' ? 'カタカナ' : '',
    constraints.exact_length ? `${constraints.exact_length}字` : constraints.max_length ? `${constraints.max_length}字以内` : ''].filter(Boolean).join('・')
)

const publicHttpsUrl = (value?: string) => {
  try {
    const url = new URL(value ?? '')
    return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? url.href : null
  } catch { return null }
}

export const presentSources = (references: SourceReference[] = [], legacy?: string | null): { label: string; url: string | null }[] => {
  if (references.length) return references.map(source => ({
    label: [source.title, source.publisher, source.edition, source.publication_year,
      source.section, source.locator].filter(Boolean).join('・'),
    url: publicHttpsUrl(source.url),
  }))
  return (legacy ?? '').split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const separator = line.lastIndexOf('|')
    if (separator === -1) return { label: line, url: null }
    const url = publicHttpsUrl(line.slice(separator + 1).trim())
    return { label: url ? line.slice(0, separator).trim() || url : line, url }
  })
}
