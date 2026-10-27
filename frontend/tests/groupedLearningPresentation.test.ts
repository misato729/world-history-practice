import assert from 'node:assert/strict'
import test from 'node:test'
import { presentSources, shortAnswerIssue, inputConstraintLabel, passageAnchorId } from '../app/utils/learningPresentation.ts'
import { publishedQuestionNumbers, catalogQuestionLabel } from '../app/utils/examCatalog.ts'
import { selectPracticePositions } from '../app/utils/practiceSequence.ts'

test('catalog-based navigation preserves group display order and never invents missing positions', () => {
  const catalog = [{ exam_number: 1, question_numbers: [1, 3, 2] }, { exam_number: 2, question_numbers: [8] }]
  assert.deepEqual(selectPracticePositions(catalog, [1, 2], [1, 2, 3, 8, 30]), [
    { examNumber: 1, questionNumber: 1 }, { examNumber: 1, questionNumber: 3 },
    { examNumber: 1, questionNumber: 2 }, { examNumber: 2, questionNumber: 8 },
  ])
  assert.deepEqual(publishedQuestionNumbers(catalog), [1, 2, 3, 8])
  assert.deepEqual(selectPracticePositions(catalog, [2], [1]), [])
})

test('omitting the old question filter includes all published groups through the thirtieth question', () => {
  const groups = [8, 7, 8, 7].map((count, index, counts) => Array.from({ length: count }, (_, offset) => counts.slice(0, index).reduce((sum, value) => sum + value, 0) + offset + 1))
  const catalog = [{ exam_number: 1, question_numbers: groups.flat() }, { exam_number: 2, question_numbers: [1, 3, 2] }]
  const sequence = selectPracticePositions(catalog, [1, 2])
  assert.equal(sequence.length, 33)
  for (const number of [8, 15, 23]) {
    const index = sequence.findIndex(position => position.examNumber === 1 && position.questionNumber === number)
    assert.deepEqual(sequence[index + 1], { examNumber: 1, questionNumber: number + 1 })
  }
  assert.deepEqual(sequence[29], { examNumber: 1, questionNumber: 30 })
  assert.deepEqual(sequence.slice(30), [{ examNumber: 2, questionNumber: 1 }, { examNumber: 2, questionNumber: 3 }, { examNumber: 2, questionNumber: 2 }])
})

test('an omitted question filter uses actual published positions while explicit old filters stay narrow', () => {
  const catalog = [{ exam_number: 1, question_numbers: [1, 3, 2, 4, 5, 6, 7, 8] }]
  assert.equal(selectPracticePositions(catalog, [1]).length, 8)
  assert.deepEqual(selectPracticePositions(catalog, [1], []), [])
  assert.deepEqual(selectPracticePositions(catalog, [1], [2, 3, 30]), [{ examNumber: 1, questionNumber: 3 }, { examNumber: 1, questionNumber: 2 }])
  assert.deepEqual(selectPracticePositions(catalog, [2]), [])
})

test('group labels use actual group-local order while URLs retain the stable number', () => {
  const exam = { exam_number: 2, question_numbers: [8, 5], groups: [{ id: 9, group_number: 1, title: '合成大問', question_numbers: [8, 5] }] }
  assert.equal(catalogQuestionLabel(exam, 5), '大問1・問2')
  assert.equal(catalogQuestionLabel({ exam_number: 1, question_numbers: [1] }, 1), '問1')
  assert.equal(passageAnchorId(8, 'term-a'), 'passage-8-term-a')
  assert.notEqual(passageAnchorId(9, 'term-a'), passageAnchorId(8, 'term-a'))
})

test('short answer constraints normalize compatibility width but do not permit arbitrary fuzzy text', () => {
  assert.equal(shortAnswerIssue('　合成語　', { script: 'kanji', exact_length: 3 }), '')
  assert.equal(shortAnswerIssue('ｶﾀｶﾅ', { script: 'katakana', exact_length: 4 }), '')
  assert.equal(shortAnswerIssue('カタカナ＝カタカナ', { script: 'katakana' }), '')
  assert.equal(shortAnswerIssue('一〇〇', { script: 'kanji' }), '')
  assert.match(shortAnswerIssue('合成', { exact_length: 3 }), /3字/)
  assert.match(shortAnswerIssue('合成あ', { script: 'kanji' }), /漢字/)
  assert.match(shortAnswerIssue('合成語', { script: 'katakana' }), /カタカナ/)
  assert.match(shortAnswerIssue('', {}), /入力/)
  assert.match(shortAnswerIssue('語'.repeat(1001), {}), /1000字/)
  assert.equal(inputConstraintLabel({ script: 'kanji', exact_length: 3 }), '漢字・3字')
})

test('book-only sources are displayed without a fabricated URL and unsafe links stay text', () => {
  assert.deepEqual(presentSources([{ kind: 'book', title: '合成資料', publisher: '合成出版社', edition: '第2版', locator: 'p.10' }]), [{ label: '合成資料・合成出版社・第2版・p.10', url: null }])
  assert.equal(presentSources([{ kind: 'web', title: '合成資料', url: 'https://user:secret@example.test/path' }])[0]?.url, null)
  assert.equal(presentSources([{ kind: 'web', title: '合成資料', url: 'javascript:alert(1)' }])[0]?.url, null)
  assert.deepEqual(presentSources([], '既存資料 | https://example.test/reference'), [{ label: '既存資料', url: 'https://example.test/reference' }])
})
