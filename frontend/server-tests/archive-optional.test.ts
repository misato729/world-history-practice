import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { configuration, setConfigurationForTesting } from '../server/core/config.ts'
import { closeDatabase, getDatabase } from '../server/core/db.ts'
import { migrate } from '../server/database/migrate.ts'
import { createArchive, exportArchive, importArchive, IMPORT_CONFIRMATION } from '../server/operations/content.ts'
import { sanitizeQuestionInput, validateQuestionInput, type QuestionInput } from '../server/services/learning-validation.ts'

process.env.APP_ENV = 'test'
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
const integration = { skip: !Boolean(process.env.DATABASE_URL || process.env.PGHOST) }
const originalConfiguration = structuredClone(configuration)
const testConfiguration = { ...originalConfiguration, exam: { ...originalConfiguration.exam, set_count: 1, questions_per_exam: 4 }, payments: { ...originalConfiguration.payments, enabled: false, free_exam_count: 1 } }
setConfigurationForTesting(testConfiguration)
after(async () => { setConfigurationForTesting(originalConfiguration); await closeDatabase() })

function questions(): QuestionInput[] {
  const category = configuration.categories.minor[0]!
  const categories = ['art_history', 'music_history', 'literature_history', 'other_cultural_history'] as const
  const rows: QuestionInput[] = [1, 2, 3, 4].map(number => ({
    exam_number: 1, question_number: number,
    major_category_code: category.major_category_value, category_code: category.value,
    is_cultural_history: true, is_art_history: number === 1, publication_status: 'published',
    cultural_history_category: categories[number - 1]!,
    content_blocks: [{ type: 'text', text: `Archive sample ${number}` }], explanation_blocks: [{ type: 'text', text: 'Explanation' }],
    source_text: 'Self-authored sample | https://example.com/archive',
    choices: configuration.exam.choice_labels.map((label, index) => ({ choice_label: label, display_order: index + 1,
      is_correct: index === 0, content_blocks: [{ type: 'text', text: label }] })),
  }))
  rows[0]!.content_blocks = [{ type: 'code', title: '', code: 'x = 1' }]
  rows[0]!.explanation_blocks = [{ type: 'quote', source: null, text: 'Quoted explanation' }]
  rows[1]!.content_blocks = [{ type: 'code_group', items: [{ title: '', code: 'x = 2' }, { title: null, code: 'x = 3' }] }]
  rows[1]!.explanation_blocks = [{ type: 'code', title: null, code: 'print(x)' }]
  rows[2]!.content_blocks = [{ type: 'quote', source: '', text: 'Quoted question' }]
  rows[2]!.explanation_blocks = [{ type: 'code', title: '  ', code: 'answer = 4' }]
  return rows
}

test('canonical validation retains empty/null optional metadata while admin form normalization stays unchanged', () => {
  for (const row of questions()) {
    const normalized = validateQuestionInput(row)
    for (const key of Object.keys(row)) assert.deepEqual(normalized[key as keyof QuestionInput], row[key as keyof QuestionInput])
  }
  const normalized = questions().map(row => sanitizeQuestionInput(row))
  assert.equal('title' in normalized[0]!.content_blocks[0]!, false)
  assert.equal('source' in normalized[0]!.explanation_blocks[0]!, false)
  assert.equal('title' in normalized[1]!.content_blocks[0]!.items![0]!, false)
  assert.equal('title' in normalized[1]!.content_blocks[0]!.items![1]!, false)
  assert.equal('title' in normalized[1]!.explanation_blocks[0]!, false)
  assert.equal('source' in normalized[2]!.content_blocks[0]!, false)
  assert.equal('title' in normalized[2]!.explanation_blocks[0]!, false)
})

test('PostgreSQL archive import/export keeps legacy optional metadata and its canonical checksum', integration, async () => {
  const client = await getDatabase().connect()
  const schema = `archive_optional_${randomUUID().replaceAll('-', '')}`
  const directory = await mkdtemp(join(tmpdir(), 'exam-archive-optional-'))
  const path = join(directory, 'export.json')
  await client.query('BEGIN')
  try {
    await client.query(`CREATE SCHEMA "${schema}"`)
    await client.query(`SET LOCAL search_path TO "${schema}"`)
    await client.query("SET LOCAL lock_timeout='10s'")
    await migrate(client)
    const archive = createArchive(questions())
    const imported = await importArchive(archive, IMPORT_CONFIRMATION, client)
    const exported = await exportArchive(path, client)
    const recovered = JSON.parse(await readFile(path, 'utf8'))
    assert.equal(recovered.version, 2)
    for (const [i, row] of archive.questions.entries()) for (const key of Object.keys(row)) assert.deepEqual(recovered.questions[i][key], row[key as keyof QuestionInput])
    assert.equal(imported.sha256, archive.sha256)
    assert.equal(exported.sha256, recovered.sha256)
    // A second export is stable after upgrading the legacy archive to v2.
    const again = await exportArchive(join(directory, 'again.json'), client)
    assert.equal(again.sha256, recovered.sha256)
  } finally {
    await client.query('ROLLBACK')
    client.release()
    await rm(directory, { recursive: true, force: true })
  }
})
