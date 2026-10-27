import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const readJson = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'))
const config = readJson('config/exam.json')
const content = readJson('content/questions.json')
const integer = (value, minimum, label) => assert(Number.isSafeInteger(value) && value >= minimum, `${label} must be an integer >= ${minimum}`)
const unique = (values, label) => assert.equal(new Set(values).size, values.length, `${label} must be unique`)

assert.equal(config.schema_version, 1, 'Unsupported config schema_version')
assert(/^[a-z][a-z0-9-]{0,39}$/.test(config.site.id), 'site.id must be a unique service slug')
for (const field of ['name', 'short_name', 'exam_name', 'description', 'tagline']) assert.equal(typeof config.site[field], 'string', `site.${field} must be text`)
assert(config.site.name.trim() && config.site.exam_name.trim(), 'Service and exam names are required')
assert(/^#[0-9a-f]{6}$/i.test(config.site.primary_color), 'primary_color must be #RRGGBB')
assert(/^\/(?!\/)/.test(config.site.logo_path) && !config.site.logo_path.includes('..'), 'logo_path must be a local absolute URL')
assert(existsSync(new URL(`frontend/public${config.site.logo_path}`, root)), 'Configured logo must exist')
integer(config.exam.set_count, 1, 'set_count')
integer(config.exam.questions_per_exam, 1, 'questions_per_exam')
assert(config.exam.set_count <= 10000 && config.exam.questions_per_exam <= 10000, 'Exam counts exceed 10000')
assert(config.exam.choice_labels.length >= 2 && config.exam.choice_labels.length <= 10, 'At least two choices are required')
unique(config.exam.choice_labels, 'choice_labels')
assert(config.exam.choice_labels.every(label => typeof label === 'string' && label.trim() && label.length <= 10), 'choice labels must be 1..10 characters')
if (config.exam.formats !== undefined) {
  assert(config.exam.formats && typeof config.exam.formats === 'object' && !Array.isArray(config.exam.formats), 'exam.formats must be an object')
  const formats = { group_practice: { group_count: 1, allowed_group_question_counts: [7, 8] }, rekiken_mock: { group_count: 4, question_count: 30, allowed_group_question_counts: [7, 8] } }
  for (const [code, rule] of Object.entries(config.exam.formats)) assert.deepEqual(rule, formats[code], `Unsupported format: ${code}`)
}
assert.equal(typeof config.payments.enabled, 'boolean')
integer(config.payments.free_exam_count, 0, 'free_exam_count')
assert(config.payments.free_exam_count <= config.exam.set_count, 'free_exam_count exceeds set_count')
integer(config.payments.amount, 1, 'payments.amount')
assert.equal(config.payments.currency, 'jpy', 'The supplied one-time payment implementation supports JPY')
assert(config.categories.major.length && config.categories.minor.length, 'At least one major and minor category are required')
unique(config.categories.major.map(item => item.value), 'major category codes')
unique(config.categories.minor.map(item => item.value), 'minor category codes')
for (const item of config.categories.major) assert(typeof item.value === 'string' && /^[a-z][a-z0-9_]{0,49}$/.test(item.value) && item.label?.trim(), 'Invalid major category')
for (const item of config.categories.minor) {
  assert(typeof item.value === 'string' && /^[a-z][a-z0-9_]{0,49}$/.test(item.value) && item.label?.trim(), 'Invalid minor category')
  assert(config.categories.major.some(major => major.value === item.major_category_value), 'Minor category refers to unknown major category')
}
const cultureCodes = ['art_history', 'music_history', 'literature_history', 'other_cultural_history']
assert(Array.isArray(config.cultural_history_categories), 'Cultural history categories are required')
assert.deepEqual(config.cultural_history_categories.map(item => item.value).sort(), [...cultureCodes].sort(), 'Exactly four cultural history categories are required')
assert(config.cultural_history_categories.every(item => typeof item.label === 'string' && item.label.trim()), 'Cultural history category labels are required')
assert.equal(content.schema_version, 1, 'Unsupported content schema_version')
assert(Array.isArray(content.questions) && content.questions.length, 'At least one sample question is required')
unique(content.questions.map(item => `${item.exam_number}/${item.question_number}`), 'question coordinates')
for (const question of content.questions) {
  integer(question.exam_number, 1, 'exam_number')
  assert(question.exam_number <= config.exam.set_count, 'exam_number exceeds configured set_count')
  integer(question.question_number, 1, 'question_number')
  assert(question.question_number <= config.exam.questions_per_exam, 'question_number exceeds configured count')
  const category = config.categories.minor.find(item => item.value === question.category_code)
  assert(category && category.major_category_value === question.major_category_code, 'Question category mismatch')
  assert(['draft', 'published', 'private'].includes(question.publication_status), 'Invalid publication status')
  for (const flag of ['is_cultural_history', 'is_art_history']) assert.equal(typeof question[flag], 'boolean', `${flag} must be a boolean`)
  assert(!question.is_art_history || question.is_cultural_history, 'Art history must also be cultural history')
  assert(question.is_cultural_history ? cultureCodes.includes(question.cultural_history_category) : question.cultural_history_category === null, 'Culture requires exactly one category; non-culture requires null')
  assert.equal(question.is_art_history, question.cultural_history_category === 'art_history', 'Art history flag and cultural category must agree')
  assert(Array.isArray(question.content_blocks) && question.content_blocks.length, 'Question content is required')
  assert(Array.isArray(question.explanation_blocks) && question.explanation_blocks.length, 'Explanation is required')
  assert.equal(question.choices.length, config.exam.choice_labels.length, 'Choice count mismatch')
  assert.deepEqual(question.choices.map(choice => choice.choice_label), config.exam.choice_labels, 'Choice labels/order mismatch')
  assert.deepEqual(question.choices.map(choice => choice.display_order), config.exam.choice_labels.map((_, index) => index + 1), 'Choice display order mismatch')
  assert.equal(question.choices.filter(choice => choice.is_correct === true).length, 1, 'Exactly one correct choice is required')
  assert(question.choices.every(choice => Array.isArray(choice.content_blocks) && choice.content_blocks.length), 'Choice content is required')
  assert(typeof question.source_text === 'string' && question.source_text.trim(), 'Source attribution is required')
}
// This file is a synthetic legacy fixture, not the source of every DB material.
const sampleSets = [...new Set(content.questions.map(question => question.exam_number))]
for (const exam of sampleSets) {
  const questions = content.questions.filter(question => question.exam_number === exam)
  assert.equal(questions.length, config.exam.questions_per_exam, `Sample set ${exam} must be complete`)
}
console.log(`Template validated: ${config.exam.set_count} material slots; ${sampleSets.length} synthetic legacy set(s), ${content.questions.length} questions, ${config.exam.choice_labels.length} choices.`)
