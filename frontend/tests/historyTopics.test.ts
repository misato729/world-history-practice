import assert from 'node:assert/strict'
import test from 'node:test'
import { changeHistoryFlag, HISTORY_TOPICS, isHistoryTopic } from '../app/utils/historyTopics.ts'
import { createEmptyQuestion } from '../app/types/adminQuestion.ts'
import { selectPracticePositions, shufflePracticeSequence } from '../app/utils/practiceSequence.ts'

test('art history selection includes culture and removing culture removes art', () => {
  const initial = { is_cultural_history: false, is_art_history: false }
  const art = changeHistoryFlag(initial, 'is_art_history', true)
  assert.deepEqual(art, { is_cultural_history: true, is_art_history: true })
  assert.deepEqual(initial, { is_cultural_history: false, is_art_history: false })
  assert.deepEqual(changeHistoryFlag(art, 'is_cultural_history', false), initial)
  assert.deepEqual(changeHistoryFlag(art, 'is_art_history', false), { is_cultural_history: true, is_art_history: false })
  assert.deepEqual(changeHistoryFlag(initial, 'is_cultural_history', true), { is_cultural_history: true, is_art_history: false })
})

test('new questions explicitly start without history topic flags', () => {
  const question = createEmptyQuestion()
  assert.equal(question.is_cultural_history, false)
  assert.equal(question.is_art_history, false)
  assert.deepEqual(HISTORY_TOPICS.map(item => item.value), ['all', 'cultural_history', 'art_history'])
  assert.equal(isHistoryTopic('art_history'), true)
  assert.equal(isHistoryTopic('unknown'), false)
})

test('filtered practice skips unmatched positions and intersects chosen sets and question numbers', () => {
  const catalog = [
    { exam_number: 3, question_numbers: [1, 4] },
    { exam_number: 1, question_numbers: [2, 5] },
    { exam_number: 2, question_numbers: [2, 3] },
  ]
  const positions = selectPracticePositions(catalog, [1, 3], [1, 2, 3, 4])
  assert.deepEqual(positions, [
    { examNumber: 1, questionNumber: 2 },
    { examNumber: 3, questionNumber: 1 },
    { examNumber: 3, questionNumber: 4 },
  ])
  assert.deepEqual(selectPracticePositions(catalog, [1], [1]), [])
  assert.deepEqual(catalog[0]!.question_numbers, [1, 4])
  const shuffled = shufflePracticeSequence(positions, 1234)
  assert.deepEqual(shuffled, shufflePracticeSequence(selectPracticePositions(catalog, [1, 3], [1, 2, 3, 4]), 1234))
  assert.deepEqual([...shuffled].sort((a, b) => a.examNumber - b.examNumber || a.questionNumber - b.questionNumber), positions)
})
