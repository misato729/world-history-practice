import rawConfiguration from '../../config/exam.json' with { type: 'json' }

export type CulturalHistoryCategoryCode = 'art_history' | 'music_history' | 'literature_history' | 'other_cultural_history'
export type ExamFormatRules = { group_count: number; question_count?: number; allowed_group_question_counts: number[] }

export type ExamConfiguration = {
  schema_version: number
  site: {
    id: string
    name: string
    short_name: string
    exam_name: string
    description: string
    tagline: string
    logo_path: string
    primary_color: string
    contact_email: string
    overview: { title: string, body: string }[]
  }
  exam: { set_count: number, questions_per_exam: number, choice_labels: string[], formats?: Record<string, ExamFormatRules> }
  categories: {
    major: { value: string, label: string }[]
    minor: { value: string, label: string, major_category_value: string }[]
  }
  cultural_history_categories: { value: CulturalHistoryCategoryCode, label: string }[]
  payments: { enabled: boolean, free_exam_count: number, amount: number, currency: string }
}

/** Validate the shared configuration before either rendering or building a catalog. */
export const parseExamConfig = (input: unknown): ExamConfiguration => {
  const config = structuredClone(input) as ExamConfiguration
  const requireValue = (condition: unknown, message: string) => {
    if (!condition) throw new Error(`Invalid exam configuration: ${message}`)
  }
  const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
  const positive = (value: unknown) => Number.isSafeInteger(value) && Number(value) > 0
  requireValue(config && typeof config === 'object', 'configuration must be an object')
  requireValue(config.schema_version === 1, 'schema_version must be 1')
  const site = config.site
  requireValue(site && typeof site.id === 'string' && /^[a-z][a-z0-9-]{0,39}$/.test(site.id), 'site.id must be a slug of at most 40 characters')
  requireValue(site && ['name', 'short_name', 'exam_name', 'description', 'tagline'].every(key => nonempty(site[key as keyof typeof site])), 'site text fields are required')
  requireValue(/^#[0-9a-f]{6}$/i.test(site.primary_color), 'primary_color must be #RRGGBB')
  requireValue(typeof site.logo_path === 'string' && /^\/(?!\/)[A-Za-z0-9_./-]+$/.test(site.logo_path) && !site.logo_path.split('/').includes('..'), 'logo_path must be a local absolute asset path')
  requireValue(typeof site.contact_email === 'string' && (site.contact_email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.contact_email)), 'contact_email must be empty or a valid email')
  requireValue(Array.isArray(site.overview) && site.overview.every(item => item && nonempty(item.title) && nonempty(item.body)), 'overview must contain title and body entries')
  requireValue(config.exam && positive(config.exam.set_count) && config.exam.set_count <= 10000 && positive(config.exam.questions_per_exam) && config.exam.questions_per_exam <= 10000, 'exam counts must be positive integers')
  if (config.exam.formats !== undefined) {
    requireValue(config.exam.formats && typeof config.exam.formats === 'object' && !Array.isArray(config.exam.formats), 'formats must be an object')
    for (const [code, rules] of Object.entries(config.exam.formats)) {
      requireValue(['group_practice', 'rekiken_mock'].includes(code), 'unsupported exam format')
      requireValue(rules && positive(rules.group_count) && Array.isArray(rules.allowed_group_question_counts) && rules.allowed_group_question_counts.length === 2 && new Set(rules.allowed_group_question_counts).size === 2 && rules.allowed_group_question_counts.every(count => count === 7 || count === 8), 'group formats require seven or eight questions')
      requireValue(code === 'group_practice' ? rules.group_count === 1 && rules.question_count === undefined : rules.group_count === 4 && rules.question_count === 30, 'invalid grouped exam structure')
    }
  }
  const labels = config.exam.choice_labels
  requireValue(Array.isArray(labels) && labels.length >= 2 && labels.length <= 10 && labels.every(value => nonempty(value) && value.length <= 10) && new Set(labels).size === labels.length, 'choice_labels must contain at least two distinct labels')
  const categories = config.categories
  requireValue(categories && Array.isArray(categories.major) && categories.major.length > 0 && Array.isArray(categories.minor) && categories.minor.length > 0, 'major and minor categories are required')
  const validItems = (items: { value: string, label: string }[]) => items.every(item => item && nonempty(item.value) && /^[a-z][a-z0-9_]{0,49}$/.test(item.value) && nonempty(item.label)) && new Set(items.map(item => item.value)).size === items.length
  requireValue(validItems(categories.major) && validItems(categories.minor), 'category codes must be unique and labels nonempty')
  requireValue(categories.minor.every(item => categories.major.some(major => major.value === item.major_category_value)), 'minor category must reference an existing major category')
  const culture = config.cultural_history_categories
  const cultureCodes: CulturalHistoryCategoryCode[] = ['art_history', 'music_history', 'literature_history', 'other_cultural_history']
  requireValue(Array.isArray(culture) && culture.length === cultureCodes.length && validItems(culture) && cultureCodes.every(code => culture.some(item => item.value === code)), 'cultural_history_categories must contain the four distinct supported categories')
  const payment = config.payments
  requireValue(payment && typeof payment.enabled === 'boolean' && Number.isSafeInteger(payment.free_exam_count) && payment.free_exam_count >= 0 && payment.free_exam_count <= config.exam.set_count, 'free_exam_count must be between zero and set_count')
  requireValue(positive(payment.amount) && payment.currency === 'jpy', 'payments require a positive amount and jpy currency')
  return config
}

export const EXAM_CONFIG = parseExamConfig(rawConfiguration)
export function getExamFormat(config: ExamConfiguration, code: string): ExamFormatRules {
  if (code === 'legacy_practice') return { group_count: 0, question_count: config.exam.questions_per_exam, allowed_group_question_counts: [] }
  if (code === 'group_practice') return config.exam.formats?.group_practice ?? { group_count: 1, allowed_group_question_counts: [7, 8] }
  if (code === 'rekiken_mock') return config.exam.formats?.rekiken_mock ?? { group_count: 4, question_count: 30, allowed_group_question_counts: [7, 8] }
  throw new Error('Unsupported exam format')
}
export const SITE = EXAM_CONFIG.site
export const authCookieName = (config = EXAM_CONFIG) => `exam-${config.site.id}-access-token`
export const PAYMENTS_ENABLED = EXAM_CONFIG.payments.enabled
export const CHOICE_LABELS = EXAM_CONFIG.exam.choice_labels
export const PRICE_LABEL = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(EXAM_CONFIG.payments.amount)

export type AccessUser = { role?: string, paid_content_access?: boolean } | null | undefined
export const hasFullExamAccess = (user: AccessUser, config = EXAM_CONFIG) => (
  !config.payments.enabled || user?.role === 'admin' || user?.paid_content_access === true
)
export const canUseFavoriteFeature = (loggedIn: boolean, user: AccessUser, config = EXAM_CONFIG) => (
  loggedIn && Boolean(user) && hasFullExamAccess(user, config)
)

export const themeVariables = (config = EXAM_CONFIG) => {
  const primary = config.site.primary_color
  const dark = '#' + [1, 3, 5].map(index => Math.round(parseInt(primary.slice(index, index + 2), 16) * 0.72).toString(16).padStart(2, '0')).join('')
  const pale = '#' + [1, 3, 5].map(index => Math.round(parseInt(primary.slice(index, index + 2), 16) * 0.15 + 255 * 0.85).toString(16).padStart(2, '0')).join('')
  return `:root{--brand-primary:${primary};--brand-primary-dark:${dark};--brand-header:${pale}}`
}
