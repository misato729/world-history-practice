export const HISTORY_TOPICS = [
  { value: 'all', label: 'すべて' },
  { value: 'cultural_history', label: '文化史のみ' },
  { value: 'art_history', label: '美術史のみ' },
] as const

export type HistoryTopic = typeof HISTORY_TOPICS[number]['value']
export type HistoryFlags = { is_cultural_history: boolean, is_art_history: boolean }

export const changeHistoryFlag = (
  flags: HistoryFlags,
  field: keyof HistoryFlags,
  checked: boolean,
): HistoryFlags => field === 'is_art_history'
  ? { is_cultural_history: checked || flags.is_cultural_history, is_art_history: checked }
  : { is_cultural_history: checked, is_art_history: checked && flags.is_art_history }

export const isHistoryTopic = (value: unknown): value is HistoryTopic => (
  HISTORY_TOPICS.some(item => item.value === value)
)
