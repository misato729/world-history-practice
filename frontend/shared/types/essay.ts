/** Literal, bounded rules. No executable regular expression or model is stored here. */
export type EssayPattern = {
  sequence: string[][]
  max_gap?: number
  scope?: 'sentence' | 'answer'
}

export type EssayRuleElement = {
  id: string
  label: string
  points: number
  positive: EssayPattern[]
  negative?: EssayPattern[]
}

export type EssayScoringProfile = {
  id: string
  version: number
  title: string
  max_characters: number
  required_terms: string[]
  elements: EssayRuleElement[]
  /** Explicitly safe negative constructions, e.g. 「避けられない」. */
  allowed_negation_phrases?: string[]
  /** Question-specific ambiguity (including unsupported attribution): hold for review. */
  caution_patterns?: EssayPattern[]
}

export type EssayQuestionConfig = {
  profile_id: string
  profile_version: number
  model_answer: string
  /** Calculated by the server; omitted by old/new clients until the first save. */
  profile_digest?: string
}

export type EssayConstraints = {
  max_characters: number
  required_terms: string[]
}

export type EssayElementResult = {
  id: string
  label: string
  points: number
  awarded_points: number | null
  status: 'matched' | 'contradicted' | 'pending'
  evidence: string[]
  reason: string
}

export type EssayGrade = {
  engine_version: string
  profile_id: string
  profile_version: number
  max_points: number
  confirmed_points: number
  pending_points: number
  score: number | null
  grading_status: 'complete' | 'pending' | 'invalid'
  elements: EssayElementResult[]
  constraints: {
    character_count: number
    max_characters: number
    within_limit: boolean
    missing_required_terms: string[]
  }
  /** Always a learning reference, including when all registered rules match. */
  reference_only: true
}
