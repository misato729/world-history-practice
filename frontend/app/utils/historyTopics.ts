import { EXAM_CONFIG, type CulturalHistoryCategoryCode } from './examConfig.ts'

export const CULTURAL_HISTORY_CATEGORIES = EXAM_CONFIG.cultural_history_categories
export type HistoryTopic = 'all' | 'cultural_history' | CulturalHistoryCategoryCode
export const HISTORY_TOPICS: { value: HistoryTopic, label: string, filterLabel: string }[] = [
  { value: 'all', label: 'すべて', filterLabel: '絞り込まない' },
  { value: 'cultural_history', label: '文化史のみ', filterLabel: '文化史全般に絞る' },
  ...CULTURAL_HISTORY_CATEGORIES.map(item => ({
    value: item.value,
    label: item.value === 'other_cultural_history' ? `${item.label}の文化史のみ` : `${item.label}のみ`,
    filterLabel: item.value === 'other_cultural_history' ? `${item.label}の文化史に絞る` : `${item.label}に絞る`,
  })),
]

export type HistoryFlags = {
  is_cultural_history: boolean
  is_art_history: boolean
  cultural_history_category: CulturalHistoryCategoryCode | null
}
type HistoryFlagInput = Omit<HistoryFlags, 'cultural_history_category'> & {
  cultural_history_category?: CulturalHistoryCategoryCode | null
}

export const isCulturalHistoryCategory = (value: unknown): value is CulturalHistoryCategoryCode => (
  CULTURAL_HISTORY_CATEGORIES.some(item => item.value === value)
)

/** Old form snapshots keep their art/culture classification when reopened. */
export const normalizeHistoryFlags = (flags: HistoryFlagInput): HistoryFlags => {
  if (!flags.is_cultural_history) return { is_cultural_history: false, is_art_history: false, cultural_history_category: null }
  const category = isCulturalHistoryCategory(flags.cultural_history_category)
    ? flags.cultural_history_category
    : flags.is_art_history ? 'art_history' : 'other_cultural_history'
  return { is_cultural_history: true, is_art_history: category === 'art_history', cultural_history_category: category }
}

export const changeCulturalHistory = (flags: HistoryFlagInput, checked: boolean): HistoryFlags => (
  normalizeHistoryFlags({ ...flags, is_cultural_history: checked })
)

export const selectCulturalHistoryCategory = (category: CulturalHistoryCategoryCode): HistoryFlags => {
  if (!isCulturalHistoryCategory(category)) throw new Error('文化史の区分を正しく指定してください')
  return { is_cultural_history: true, is_art_history: category === 'art_history', cultural_history_category: category }
}

export const culturalHistoryLabel = (flags: HistoryFlagInput): string => {
  const normalized = normalizeHistoryFlags(flags)
  if (!normalized.is_cultural_history) return ''
  const category = CULTURAL_HISTORY_CATEGORIES.find(item => item.value === normalized.cultural_history_category)
  return `文化史・${category!.label}`
}

export const isHistoryTopic = (value: unknown): value is HistoryTopic => (
  HISTORY_TOPICS.some(item => item.value === value)
)

/** Checkbox selections use one stable URL form while preserving the existing single-topic URLs. */
export const serializeHistoryTopicSelection = (selected: readonly CulturalHistoryCategoryCode[]): string => {
  if (selected.some(value => !isCulturalHistoryCategory(value))) throw new Error('文化史の区分を正しく指定してください')
  const categories = CULTURAL_HISTORY_CATEGORIES.filter(item => selected.includes(item.value))
  if (!categories.length) return 'all'
  if (categories.length === CULTURAL_HISTORY_CATEGORIES.length) return 'cultural_history'
  return categories.map(item => item.value).join(',')
}

export const historyTopicFilterLabel = (value: unknown): string => {
  const single = HISTORY_TOPICS.find(item => item.value === value)
  if (single) return single.label
  if (typeof value !== 'string') return ''
  const selected = value.split(',')
  if (!selected.length || selected.some(item => !isCulturalHistoryCategory(item))) return ''
  const serialized = serializeHistoryTopicSelection(selected as CulturalHistoryCategoryCode[])
  const canonicalSingle = HISTORY_TOPICS.find(item => item.value === serialized)
  if (canonicalSingle) return canonicalSingle.label
  const labels = CULTURAL_HISTORY_CATEGORIES.filter(item => selected.includes(item.value)).map(item => (
    item.value === 'other_cultural_history' ? `${item.label}の文化史` : item.label
  ))
  return `${labels.join('・')}のみ`
}
