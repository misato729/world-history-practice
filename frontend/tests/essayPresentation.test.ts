import assert from 'node:assert/strict'
import test from 'node:test'
import { essayAnswerIssue, essayCharacterCount, essayElementCountLabel, essayResultSummary } from '../app/utils/essayPresentation.ts'
import type { EssayGrade } from '../shared/types/essay.ts'
import { createEmptyQuestion } from '../app/types/adminQuestion.ts'
import { normalizeAdminQuestion, prepareAdminQuestion, selectEssayProfile, essayProfileKey } from '../app/utils/adminQuestionForm.ts'

const resultForPresentation = (): EssayGrade => ({
  engine_version: 'test', profile_id: 'test', profile_version: 1,
  max_points: 8, confirmed_points: 3, pending_points: 5, score: null,
  grading_status: 'pending', reference_only: true,
  constraints: { character_count: 20, max_characters: 80, within_limit: true, missing_required_terms: [] },
  elements: [
    { id: 'cause', label: '原因', points: 3, awarded_points: 3, status: 'matched', evidence: ['答案の一文'], reason: '確認' },
    { id: 'change', label: '変化', points: 3, awarded_points: null, status: 'pending', evidence: [], reason: '保留' },
    { id: 'result', label: '結果', points: 2, awarded_points: null, status: 'pending', evidence: [], reason: '保留' },
  ],
})

test('essay summaries show confirmed element count separately from weighted reference points', () => {
  const result = resultForPresentation()
  assert.equal(essayElementCountLabel(result), '3要素中1要素を確認')
  assert.equal(essayResultSummary(result), '3要素中1要素を確認・参考3 / 8点（5点分は判定保留）')
  assert.equal(result.score, null)
  assert.equal(result.elements[1]!.awarded_points, null)
  result.elements.forEach(element => { element.status = 'matched'; element.awarded_points = element.points })
  result.confirmed_points = result.score = 8
  result.pending_points = 0
  result.grading_status = 'complete'
  assert.equal(essayResultSummary(result), '3要素中3要素を確認・参考8 / 8点')
})

test('essay summaries keep invalid totals unconfirmed and missing results pending', () => {
  const result = resultForPresentation()
  result.grading_status = 'invalid'
  result.constraints.within_limit = false
  assert.equal(essayResultSummary(result), '3要素中1要素を確認・参考点未確定')
  assert.equal(essayResultSummary(undefined), '論述・判定保留')
})

test('explicit contradictions count as zero confirmed elements without counting pending criteria as incorrect', () => {
  const result = resultForPresentation()
  result.elements.forEach(element => { element.status = 'contradicted'; element.awarded_points = 0 })
  result.confirmed_points = result.score = 0
  result.pending_points = 0
  result.grading_status = 'complete'
  assert.equal(essayResultSummary(result), '3要素中0要素を確認・参考0 / 8点')
})

test('essay word limits count Unicode characters and punctuation, without whitespace or width conversion', () => {
  assert.equal(essayCharacterCount('人口は\n増加。　'), 6)
  assert.equal(essayCharacterCount('𠮷・ｶﾞ'), 4)
  assert.equal(essayAnswerIssue('   '), '回答を入力してください。')
  assert.equal(essayAnswerIssue('あいう', { max_characters: 3, required_terms: [] }), '')
  assert.match(essayAnswerIssue('あいうえ', { max_characters: 3, required_terms: [] }), /3字以内/)
  assert.match(essayAnswerIssue(' '.repeat(4001) + 'a'), /長すぎ/)
})

test('essay editor submits only the active grading config, preserving inactive draft data', () => {
  const input = createEmptyQuestion()
  input.answer_type = 'essay'
  input.choices[0]!.id = 77
  input.accepted_answers = ['非表示の語句']
  input.input_constraints = { exact_length: 3 }
  input.essay_config = { profile_id: 'mock-06-g03-q08', profile_version: 1, model_answer: ' 解答。 ' }
  const output = prepareAdminQuestion(input)
  assert.deepEqual(output.choices, [])
  assert.deepEqual(output.accepted_answers, [])
  assert.deepEqual(output.input_constraints, {})
  assert.deepEqual(output.essay_config, { profile_id: 'mock-06-g03-q08', profile_version: 1, model_answer: '解答。' })
  assert.equal(input.choices[0]!.id, 77)
  assert.equal(input.essay_config.model_answer, ' 解答。 ')
  const copy = normalizeAdminQuestion(input)
  copy.essay_config!.model_answer = '変更'
  assert.equal(input.essay_config.model_answer, ' 解答。 ')
  input.answer_type = 'single_choice'
  assert.deepEqual(prepareAdminQuestion(input).essay_config, {})
  assert.equal(input.essay_config.model_answer, ' 解答。 ')
})

test('selecting an essay profile preserves the exact version and the model draft', () => {
  const profiles = [{ id: 'same', version: 1 }, { id: 'same', version: 2 }]
  const draft = { profile_id: 'same', profile_version: 1, model_answer: '保存前の解答' }
  assert.equal(essayProfileKey(profiles[1]!), 'same:2')
  assert.deepEqual(selectEssayProfile(draft, profiles, 'same:2'), { ...draft, profile_version: 2 })
  assert.deepEqual(selectEssayProfile(draft, profiles, ''), { ...draft, profile_id: '' })
  assert.deepEqual(selectEssayProfile(draft, profiles, 'unknown:3'), draft)
  assert.equal(draft.profile_version, 1)
  const empty = createEmptyQuestion()
  empty.answer_type = 'essay'
  assert.deepEqual(prepareAdminQuestion(empty).essay_config, {})
})
