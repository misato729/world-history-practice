import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateBlocks } from '../server/services/learning-validation.ts'

const passage = (text: string, underline?: boolean) => [{ type: 'text', inlines: [
  { type: 'text', text: 'Before ' },
  { type: 'anchor', id: 'a', label: 'a', text, ...(underline === undefined ? {} : { underline }) },
  { type: 'text', text: ' after' },
] }]

test('published underlines must cover visible text, not an empty marker', () => {
  for (const text of ['', '  ', '\n']) assert.throws(() => validateBlocks(passage(text), 'question', true), /下線/)
  assert.throws(() => validateBlocks(passage('A phrase', false), 'question', true), /下線/)
})

test('drafts retain unfinished anchors so an editor can finish them', () => {
  assert.equal(validateBlocks(passage('', false), 'question', false)[0]!.inlines!.length, 3)
})

test('published paragraphs retain the actual underlined phrase and its surrounding text', () => {
  const blocks = validateBlocks(passage('A phrase'), 'question', true)
  assert.deepEqual(blocks[0]!.inlines, [
    { type: 'text', text: 'Before ' },
    { type: 'anchor', id: 'a', label: 'a', text: 'A phrase', underline: true },
    { type: 'text', text: ' after' },
  ])
  assert.doesNotThrow(() => validateBlocks([{ type: 'text', text: 'A full-passage reference needs no underline.' }], 'question', true))
})
