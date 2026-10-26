import assert from 'node:assert/strict'
import test from 'node:test'
import {
  changeCulturalHistory, culturalHistoryLabel, CULTURAL_HISTORY_CATEGORIES,
  HISTORY_TOPICS, isCulturalHistoryCategory, isHistoryTopic,
  normalizeHistoryFlags, selectCulturalHistoryCategory,
} from '../app/utils/historyTopics.ts'
import { EXAM_CONFIG } from '../app/utils/examConfig.ts'
import { createEmptyQuestion } from '../app/types/adminQuestion.ts'
import { selectPracticePositions, shufflePracticeSequence } from '../app/utils/practiceSequence.ts'

test('legacy art and cultural flags reopen as one category without inventing music or literature', () => {
  const initial = { is_cultural_history: false, is_art_history: false }
  assert.deepEqual(normalizeHistoryFlags(initial), { ...initial, cultural_history_category: null })
  assert.deepEqual(normalizeHistoryFlags({ is_cultural_history: true, is_art_history: true }), {
    is_cultural_history: true, is_art_history: true, cultural_history_category: 'art_history',
  })
  assert.deepEqual(normalizeHistoryFlags({ is_cultural_history: true, is_art_history: false }), {
    is_cultural_history: true, is_art_history: false, cultural_history_category: 'other_cultural_history',
  })
  assert.deepEqual(initial, { is_cultural_history: false, is_art_history: false })
})

test('category changes stay exclusive and removing culture clears the category and compatibility flag', () => {
  const initial = { is_cultural_history: false, is_art_history: false, cultural_history_category: null }
  assert.deepEqual(changeCulturalHistory(initial, true), {
    is_cultural_history: true, is_art_history: false, cultural_history_category: 'other_cultural_history',
  })
  for (const category of CULTURAL_HISTORY_CATEGORIES) {
    const selected = selectCulturalHistoryCategory(category.value)
    assert.equal(selected.is_cultural_history, true)
    assert.equal(selected.cultural_history_category, category.value)
    assert.equal(selected.is_art_history, category.value === 'art_history')
    assert.deepEqual(changeCulturalHistory(selected, false), initial)
    assert.deepEqual(changeCulturalHistory(selected, true), selected)
    assert.deepEqual(normalizeHistoryFlags(selected), selected)
  }
  assert.deepEqual(initial, { is_cultural_history: false, is_art_history: false, cultural_history_category: null })
})

test('topic options and badges use the configured four categories', () => {
  assert.deepEqual(CULTURAL_HISTORY_CATEGORIES, EXAM_CONFIG.cultural_history_categories)
  assert.deepEqual(HISTORY_TOPICS.map(item => item.value), [
    'all', 'cultural_history', 'art_history', 'music_history', 'literature_history', 'other_cultural_history',
  ])
  assert.deepEqual(HISTORY_TOPICS.map(item => item.label), [
    'すべて', '文化史のみ', '美術史のみ', '音楽史のみ', '文学史のみ', 'その他の文化史のみ',
  ])
  assert.deepEqual(HISTORY_TOPICS.map(item => item.filterLabel), [
    '絞り込まない', '文化史全般に絞る', '美術史に絞る', '音楽史に絞る', '文学史に絞る', 'その他の文化史に絞る',
  ])
  for (const category of CULTURAL_HISTORY_CATEGORIES) {
    assert.equal(isCulturalHistoryCategory(category.value), true)
    assert.equal(isHistoryTopic(category.value), true)
    assert.equal(culturalHistoryLabel(selectCulturalHistoryCategory(category.value)), `文化史・${category.label}`)
  }
  assert.equal(culturalHistoryLabel({ is_cultural_history: false, is_art_history: false }), '')
  assert.equal(culturalHistoryLabel({ is_cultural_history: true, is_art_history: true }), '文化史・美術史')
  assert.equal(culturalHistoryLabel({ is_cultural_history: true, is_art_history: false }), '文化史・その他')
  for (const value of ['unknown', '', null, undefined, [], ['music_history'], {}, true, 1]) {
    assert.equal(isHistoryTopic(value), false)
    assert.equal(isCulturalHistoryCategory(value), false)
    assert.throws(() => selectCulturalHistoryCategory(value as never))
  }
  assert.equal(isCulturalHistoryCategory('cultural_history'), false)
  assert.equal(isHistoryTopic('cultural_history'), true)
})

test('new questions explicitly start without history topic flags', () => {
  const question = createEmptyQuestion()
  assert.equal(question.is_cultural_history, false)
  assert.equal(question.is_art_history, false)
  assert.equal(question.cultural_history_category, null)
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
