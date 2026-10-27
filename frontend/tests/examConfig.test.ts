import assert from 'node:assert/strict'
import test from 'node:test'
import { EXAM_CONFIG, parseExamConfig, hasFullExamAccess, canUseFavoriteFeature, themeVariables } from '../app/utils/examConfig.ts'
import { createExamCatalog } from '../app/utils/examCatalog.ts'
import { createEmptyQuestion } from '../app/types/adminQuestion.ts'
import { getExamFormat } from '../shared/examConfig.ts'

const variant = () => structuredClone(EXAM_CONFIG)

test('grouped formats coexist with the five-question legacy material', () => {
  const config = variant()
  assert.equal(getExamFormat(config, 'legacy_practice').question_count, 5)
  assert.deepEqual(getExamFormat(config, 'group_practice'), { group_count: 1, allowed_group_question_counts: [7, 8] })
  assert.deepEqual(getExamFormat(config, 'rekiken_mock'), { group_count: 4, question_count: 30, allowed_group_question_counts: [7, 8] })
  delete config.exam.formats
  assert.equal(getExamFormat(parseExamConfig(config), 'rekiken_mock').question_count, 30)
  config.exam.formats = { rekiken_mock: { group_count: 4, question_count: 29, allowed_group_question_counts: [7, 8] } }
  assert.throws(() => parseExamConfig(config), /invalid grouped exam structure/)
})

test('a different exam configuration drives catalog dimensions, category defaults and five-choice authoring', () => {
  const input = variant()
  input.exam = { set_count: 3, questions_per_exam: 7, choice_labels: ['A', 'B', 'C', 'D', 'E'] }
  input.categories = { major: [{ value: 'other', label: '別の分野' }], minor: [{ value: 'topic', label: '単元', major_category_value: 'other' }] }
  input.site.name = '別の資格サービス'
  const config = parseExamConfig(input)
  const catalog = createExamCatalog(config)
  assert.equal(catalog.length, 3)
  assert.deepEqual(catalog[2], { exam_number: 3, question_numbers: [1, 2, 3, 4, 5, 6, 7] })
  const question = createEmptyQuestion(config)
  assert.equal(question.major_category_code, 'other')
  assert.equal(question.category_code, 'topic')
  assert.deepEqual(question.choices.map(item => item.choice_label), ['A', 'B', 'C', 'D', 'E'])
  assert.equal(question.choices.filter(item => item.is_correct).length, 1)
  question.choices[0]!.content_blocks[0]!.text = 'changed'
  assert.equal(createEmptyQuestion(config).choices[0]!.content_blocks[0]!.text, '')
})

test('free service mode permits every catalog set and signed-in favorites', () => {
  const config = variant()
  config.payments.enabled = false
  config.payments.free_exam_count = 0
  assert.equal(hasFullExamAccess(null, config), true)
  assert.equal(canUseFavoriteFeature(false, null, config), false)
  assert.equal(canUseFavoriteFeature(true, null, config), false)
  assert.equal(canUseFavoriteFeature(true, { role: 'user', paid_content_access: false }, config), true)
})

test('paid service mode preserves server-issued membership and administrator access', () => {
  const config = variant()
  config.payments.enabled = true
  assert.equal(hasFullExamAccess(null, config), false)
  assert.equal(hasFullExamAccess({ paid_content_access: false }, config), false)
  assert.equal(hasFullExamAccess({ paid_content_access: true }, config), true)
  assert.equal(hasFullExamAccess({ role: 'admin' }, config), true)
  assert.equal(canUseFavoriteFeature(true, { paid_content_access: false }, config), false)
})

test('invalid catalog counts, duplicate choice labels and orphan categories fail before rendering', () => {
  const invalid = [
    (c: ReturnType<typeof variant>) => { c.site.id = 'invalid identifier' },
    (c: ReturnType<typeof variant>) => { c.exam.questions_per_exam = 0 },
    (c: ReturnType<typeof variant>) => { c.exam.set_count = 1.5 },
    (c: ReturnType<typeof variant>) => { c.exam.choice_labels = ['A', 'A'] },
    (c: ReturnType<typeof variant>) => { c.exam.choice_labels = ['A'] },
    (c: ReturnType<typeof variant>) => { c.categories.minor[0]!.major_category_value = 'missing' },
    (c: ReturnType<typeof variant>) => { c.payments.free_exam_count = c.exam.set_count + 1 },
  ]
  for (const change of invalid) {
    const config = variant()
    change(config)
    assert.throws(() => parseExamConfig(config), /Invalid exam configuration/)
  }
})

test('theme and logo configuration cannot inject markup or external asset URLs', () => {
  for (const color of ['red', '#fff', '#123456;}</style><script>alert(1)</script>']) {
    const config = variant()
    config.site.primary_color = color
    assert.throws(() => parseExamConfig(config), /primary_color/)
  }
  for (const path of ['https://example.invalid/logo.svg', '//example.invalid/logo.svg', '/images/../secrets', '/logo.svg" onerror="alert(1)']) {
    const config = variant()
    config.site.logo_path = path
    assert.throws(() => parseExamConfig(config), /logo_path/)
  }
  const config = variant()
  config.site.primary_color = '#0088CC'
  assert.match(themeVariables(parseExamConfig(config)), /--brand-primary:#0088CC/)
})

test('cultural history configuration keeps exactly four distinct categories with labels', () => {
  const config = variant()
  assert.deepEqual(parseExamConfig(config).cultural_history_categories.map(item => item.label), ['美術史', '音楽史', '文学史', 'その他'])
  const invalid = [
    (c: ReturnType<typeof variant>) => { c.cultural_history_categories.pop() },
    (c: ReturnType<typeof variant>) => { c.cultural_history_categories[1]!.value = 'art_history' },
    (c: ReturnType<typeof variant>) => { c.cultural_history_categories[0]!.label = ' ' },
    (c: ReturnType<typeof variant>) => { (c.cultural_history_categories[0] as { value: string }).value = 'unknown' },
  ]
  for (const change of invalid) {
    const changed = variant(); change(changed)
    assert.throws(() => parseExamConfig(changed), /cultural_history_categories/)
  }
  assert.deepEqual(config.cultural_history_categories, variant().cultural_history_categories)
})
