import type { AdminQuestionInput } from '../types/adminQuestion.ts'
import type { PassageReference, SourceReference } from '../../shared/types/learning.ts'
import type { EssayQuestionConfig } from '../../shared/types/essay.ts'

export const essayProfileKey = (profile: { id: string; version: number }) => `${profile.id}:${profile.version}`
export const selectEssayProfile = (config: Partial<EssayQuestionConfig>, profiles: { id: string; version: number }[], key: string): Partial<EssayQuestionConfig> => {
  if (!key) return { ...config, profile_id: '', profile_version: 1 }
  const profile = profiles.find(item => essayProfileKey(item) === key)
  return profile ? { ...config, profile_id: profile.id, profile_version: profile.version } : { ...config }
}

export const normalizeAdminQuestion = (input: AdminQuestionInput): AdminQuestionInput => ({
  ...JSON.parse(JSON.stringify(input)),
  source_text: input.source_text ?? '',
  group_id: input.group_id ?? null,
  group_question_number: input.group_question_number ?? null,
  answer_type: input.answer_type ?? 'single_choice',
  accepted_answers: [...(input.accepted_answers ?? [])],
  essay_config: { ...(input.essay_config ?? {}) },
  input_constraints: { script: 'any', ...(input.input_constraints ?? {}) },
  related_topics: (input.related_topics ?? []).map(topic => ({ ...topic })),
  source_references: (input.source_references ?? []).map(source => ({ ...source })),
  passage_references: (input.passage_references ?? []).map(reference => ({ ...reference })),
})

/** Only the active answer form is submitted; switching tabs never erases the editor's other draft. */
export const prepareAdminQuestion = (input: AdminQuestionInput): AdminQuestionInput => {
  const output = normalizeAdminQuestion(input)
  if (output.answer_type === 'essay') {
    output.choices = []
    output.accepted_answers = []
    output.input_constraints = {}
    output.essay_config = output.essay_config?.profile_id?.trim() ? { profile_id: output.essay_config.profile_id, profile_version: Number(output.essay_config.profile_version ?? 1), model_answer: output.essay_config.model_answer?.trim() ?? '' } : {}
  } else if (output.answer_type === 'short_text') {
    output.choices = []
    output.accepted_answers = (output.accepted_answers ?? []).map(answer => answer.trim()).filter(Boolean)
  } else {
    output.accepted_answers = []
    output.input_constraints = {}
    output.choices.forEach((choice, index) => { choice.display_order = index + 1 })
  }
  if (output.answer_type !== 'essay') output.essay_config = {}
  for (const key of ['exact_length', 'max_length'] as const) {
    if (!Number.isInteger(output.input_constraints?.[key]) || Number(output.input_constraints?.[key]) < 1) delete output.input_constraints?.[key]
  }
  if (output.source_references?.length) output.source_text = ''
  output.source_references = output.source_references?.map(source => Object.fromEntries(Object.entries(source).filter(([key, value]) => key === 'kind' || key === 'title' || (typeof value === 'string' && value.trim() !== ''))) as SourceReference)
  if (!output.group_id) {
    output.group_id = null
    output.group_question_number = null
    output.passage_references = []
  }
  return output
}

export const referenceKey = (reference: PassageReference) => JSON.stringify([reference.passage_id, reference.anchor_id])

export const setPassageReference = (references: PassageReference[], reference: PassageReference, selected: boolean): PassageReference[] => {
  const key = referenceKey(reference)
  const remaining = references.filter(item => referenceKey(item) !== key)
  return selected ? [...remaining, { ...reference }] : remaining
}
