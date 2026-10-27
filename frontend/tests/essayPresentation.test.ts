import assert from 'node:assert/strict'
import test from 'node:test'
import { essayAnswerIssue, essayCharacterCount } from '../app/utils/essayPresentation.ts'
import { createEmptyQuestion } from '../app/types/adminQuestion.ts'
import { normalizeAdminQuestion, prepareAdminQuestion, selectEssayProfile, essayProfileKey } from '../app/utils/adminQuestionForm.ts'

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
