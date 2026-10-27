import assert from 'node:assert/strict'
import test from 'node:test'
import { createEmptyQuestion } from '../app/types/adminQuestion.ts'
import { normalizeAdminQuestion, prepareAdminQuestion, setPassageReference } from '../app/utils/adminQuestionForm.ts'

test('legacy editor values reopen with independent defaults for grouped authoring', () => {
  const legacy = createEmptyQuestion()
  delete legacy.answer_type
  delete legacy.related_topics
  delete legacy.input_constraints
  const normalized = normalizeAdminQuestion(legacy)
  assert.equal(normalized.answer_type, 'single_choice')
  assert.deepEqual(normalized.related_topics, [])
  assert.deepEqual(normalized.input_constraints, { script: 'any' })
  normalized.content_blocks[0]!.text = '編集中'
  assert.equal(legacy.content_blocks[0]!.text, '')
})

test('short-answer submission preserves inactive choice IDs in the editable draft', () => {
  const input = createEmptyQuestion()
  input.choices[0]!.id = 42
  input.answer_type = 'short_text'
  input.accepted_answers = [' 正答 ', '許容表記', '']
  input.input_constraints = { script: 'kanji', exact_length: 3, max_length: undefined }
  const submitted = prepareAdminQuestion(input)
  assert.deepEqual(submitted.choices, [])
  assert.deepEqual(submitted.accepted_answers, ['正答', '許容表記'])
  assert.equal(submitted.input_constraints?.exact_length, 3)
  assert.equal(Object.hasOwn(submitted.input_constraints!, 'max_length'), false)
  assert.equal(input.choices[0]!.id, 42)
  assert.equal(input.choices.length, 4)
})

test('single-choice submission clears inactive grading fields and keeps stable choice IDs', () => {
  const input = createEmptyQuestion()
  input.choices[1]!.id = 51
  input.accepted_answers = ['非表示の下書き']
  input.input_constraints = { script: 'katakana' }
  const submitted = prepareAdminQuestion(input)
  assert.deepEqual(submitted.accepted_answers, [])
  assert.deepEqual(submitted.input_constraints, {})
  assert.equal(submitted.choices[1]!.id, 51)
  assert.deepEqual(submitted.choices.map(choice => choice.display_order), [1, 2, 3, 4])
  assert.deepEqual(input.accepted_answers, ['非表示の下書き'])
})

test('structured book sources replace legacy source text without inventing a URL', () => {
  const input = createEmptyQuestion()
  input.source_text = '旧資料 | https://example.test/source'
  input.source_references = [{ kind: 'book', title: '合成資料', publisher: '合成出版社', url: '', edition: '' }]
  const submitted = prepareAdminQuestion(input)
  assert.equal(submitted.source_text, '')
  assert.deepEqual(submitted.source_references, [{ kind: 'book', title: '合成資料', publisher: '合成出版社' }])
  assert.equal(input.source_text, '旧資料 | https://example.test/source')
})

test('clearing group membership removes its child coordinate and passage links', () => {
  const input = createEmptyQuestion()
  input.group_id = null
  input.group_question_number = 3
  input.passage_references = [{ passage_id: 12, anchor_id: null }]
  const submitted = prepareAdminQuestion(input)
  assert.equal(submitted.group_question_number, null)
  assert.deepEqual(submitted.passage_references, [])
  assert.equal(input.passage_references.length, 1)
})

test('whole-passage and anchor references can be selected independently without duplicates', () => {
  const whole = { passage_id: 12, anchor_id: null }
  const anchor = { passage_id: 12, anchor_id: 'ref-a' }
  let references = setPassageReference([], whole, true)
  references = setPassageReference(references, anchor, true)
  references = setPassageReference(references, whole, true)
  assert.equal(references.length, 2)
  references = setPassageReference(references, whole, false)
  assert.deepEqual(references, [anchor])
})
