import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, readdir, writeFile, lstat, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import bcrypt from 'bcryptjs'
import { configuration } from '../server/core/config.ts'
import { ApiError } from '../server/core/errors.ts'
import { getDatabase, query, closeDatabase, type Database } from '../server/core/db.ts'
import { migrate } from '../server/database/migrate.ts'
import { createArchive, validateArchive, validateQuestions, digest, importArchive, importContent, exportArchive, seedContent, defaultContentPath, IMPORT_CONFIRMATION, OperationError } from '../server/operations/content.ts'
import { createAdmin, grantVerification, revokeVerification } from '../server/operations/accounts.ts'
import { auditOperations, expirePendingForUser } from '../server/operations/audit.ts'
import { restoreDrillConnection, normalizeConstraintDefinition } from '../server/operations/restore-drill.ts'
import { runCommand, safeOperationFailure } from '../server/operations/cli.ts'
import type { PaymentStripeClient } from '../server/services/payment-client.ts'

process.env.APP_ENV = 'test'
process.env.SECRET_KEY_BASE ||= 'test-secret-for-operations-'.repeat(4)
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
const integration = { skip: !Boolean(process.env.DATABASE_URL || process.env.PGHOST) }
const content = JSON.parse(await readFile(defaultContentPath, 'utf8'))
const archive = () => createArchive(structuredClone(content.questions))
after(async () => closeDatabase())

async function migrateThrough(db: Database, through: string) {
  const directory = await mkdtemp(join(tmpdir(), 'exam-migrations-through-'))
  const previous = process.env.MIGRATIONS_DIR
  try {
    const source = new URL('../server/database/migrations/', import.meta.url)
    for (const name of (await readdir(source)).filter(name => /^\d+_[a-z0-9_]+\.sql$/.test(name) && name <= through)) {
      await writeFile(join(directory, name), await readFile(new URL(name, source)))
    }
    process.env.MIGRATIONS_DIR = directory
    return await migrate(db)
  } finally {
    if (previous === undefined) delete process.env.MIGRATIONS_DIR; else process.env.MIGRATIONS_DIR = previous
    await rm(directory, { recursive: true, force: true })
  }
}

async function isolated(action: (db: Database) => Promise<void>, through?: string) {
  const client = await getDatabase().connect()
  const schema = `operations_test_${randomUUID().replaceAll('-', '')}`
  await client.query('BEGIN')
  try {
    await client.query(`CREATE SCHEMA "${schema}"`)
    await client.query(`SET LOCAL search_path TO "${schema}"`)
    await client.query("SET LOCAL lock_timeout='10s'")
    if (through) await migrateThrough(client, through)
    else await migrate(client)
    await action(client)
  } finally { await client.query('ROLLBACK'); client.release() }
}
const countQuestions = async (db: Database) => Number((await query<{ total: number }>('SELECT count(*) AS total FROM questions', [], db))[0]!.total)
async function user(db: Database) {
  const email = `operations-${randomUUID()}@example.invalid`
  const [row] = await query<{ id: number }>("INSERT INTO users(name,email,password_digest,role,created_at,updated_at) VALUES('Operations test',$1,'synthetic-digest','user',NOW(),NOW()) RETURNING id", [email], db)
  return { id: row!.id, email }
}

/** Insert a pre-category fixture using only columns available before migration 004. */
async function insertLegacySamples(db: Database) {
  for (const question of content.questions) {
    const [saved] = await query<{ id: number }>(`INSERT INTO questions(exam_number,question_number,major_category_code,category_code,
      content_blocks,explanation_blocks,source_text,publication_status,is_cultural_history,is_art_history,created_at,updated_at)
      VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,false,false,NOW(),NOW()) RETURNING id`,
    [question.exam_number, question.question_number, question.major_category_code, question.category_code,
      JSON.stringify(question.content_blocks), JSON.stringify(question.explanation_blocks), question.source_text, question.publication_status], db)
    for (const choice of question.choices) await query(`INSERT INTO question_choices(question_id,choice_label,content_blocks,is_correct,display_order,created_at,updated_at)
      VALUES($1,$2,$3::jsonb,$4,$5,NOW(),NOW())`,
    [saved!.id, choice.choice_label, JSON.stringify(choice.content_blocks), choice.is_correct, choice.display_order], db)
  }
}

test('archives preserve Rails canonical checksums regardless of object attribute order', () => {
  assert.equal(digest({ b: 2, a: { d: 4, c: 3 } }), digest({ a: { c: 3, d: 4 }, b: 2 }))
  const document = archive()
  assert.equal(document.question_count, content.questions.length)
  assert.equal(document.choice_count, content.questions.length * configuration.exam.choice_labels.length)
  assert.deepEqual(validateArchive(document), document)
  const optional = structuredClone(content.questions)
  optional[0].content_blocks = [{ type: 'code', title: '', code: 'value = 1' }]
  assert.equal(validateQuestions(optional)[0]!.content_blocks[0]!.title, '')
})

test('v1 archives retain omitted legacy flags and preserve explicit culture/art flags', () => {
  const legacy = structuredClone(content.questions)
  for (const question of legacy) { delete question.is_cultural_history; delete question.is_art_history; delete question.cultural_history_category }
  const archivedLegacy = createArchive(legacy)
  assert.deepEqual(archivedLegacy.questions, legacy)
  assert.deepEqual(validateArchive(archivedLegacy), archivedLegacy)
  const flagged = structuredClone(legacy)
  flagged[0].is_cultural_history = true
  flagged[0].is_art_history = true
  const document = createArchive(flagged)
  assert.equal(validateArchive(document).questions[0]!.is_art_history, true)
  assert.notEqual(document.sha256, archivedLegacy.sha256)
  flagged[0].is_cultural_history = false
  assert.throws(() => createArchive(flagged), error => error instanceof ApiError && error.status === 422)
})

test('v1 archives retain explicit single culture categories and legacy omissions without rewriting checksums', () => {
  const rows = structuredClone(content.questions)
  const categories = ['art_history', 'music_history', 'literature_history', 'other_cultural_history'] as const
  for (const [index, category] of categories.entries()) Object.assign(rows[index], {
    is_cultural_history: true, is_art_history: category === 'art_history', cultural_history_category: category,
  })
  const checksumFor = (questions: { choices: unknown[] }[]) => digest({
    format: 'exam-practice-question-archive', version: 1,
    question_count: questions.length,
    choice_count: questions.reduce((count, question) => count + question.choices.length, 0),
    questions,
  })
  const document = createArchive(rows)
  assert.deepEqual(validateArchive(document).questions, rows)
  assert.equal(document.sha256, checksumFor(rows))
  const oldFlagsOnly = structuredClone(rows)
  for (const row of oldFlagsOnly) delete row.cultural_history_category
  const legacy = createArchive(oldFlagsOnly)
  assert.deepEqual(validateArchive(legacy).questions, oldFlagsOnly)
  assert.equal(legacy.sha256, checksumFor(oldFlagsOnly))
  assert.notEqual(document.sha256, legacy.sha256)
  const changed = structuredClone(document)
  changed.questions[0]!.cultural_history_category = 'music_history'
  assert.throws(() => validateArchive(changed))
})

test('archive integrity rejects modified content, counts, unknown fields and duplicate coordinates before DB access', async () => {
  const changed = archive(); changed.questions[0]!.content_blocks = [{ type: 'text', text: 'changed' }]
  assert.throws(() => validateArchive(changed), OperationError)
  assert.throws(() => validateArchive({ ...archive(), choice_count: 1 }), OperationError)
  assert.throws(() => validateArchive({ ...archive(), secret: 'never-accepted' }), OperationError)
  assert.throws(() => createArchive([...content.questions, content.questions[0]]), OperationError)
  const unexpected = structuredClone(content.questions); unexpected[0].choices[0].secret = true
  assert.throws(() => createArchive(unexpected), OperationError)
  const db = { query: async () => { throw new Error('DB must not be reached') } } as unknown as Database
  await assert.rejects(importArchive(archive(), undefined, db), OperationError)
  await assert.rejects(importArchive(changed, IMPORT_CONFIRMATION, db), OperationError)
})

test('automatic sample seeding is disabled in production and test without touching the DB', async () => {
  const db = { query: async () => { throw new Error('DB must not be reached') } } as unknown as Database
  for (const mode of ['production', 'test']) assert.deepEqual(await seedContent({ mode, db }), { status: 'skipped' })
})

test('restore drills reject remote DBs and enabled sales/notifications before connecting', () => {
  assert.throws(() => restoreDrillConnection({ PGHOST: 'db' }, 'production'), OperationError)
  assert.throws(() => restoreDrillConnection({ PGHOST: 'remote.example.test' }, 'test'), OperationError)
  assert.throws(() => restoreDrillConnection({ DATABASE_URL: 'postgres://user:password@remote.example.test/database' }, 'test'), OperationError)
  assert.throws(() => restoreDrillConnection({ PGHOST: 'db', PAID_MEMBERSHIP_ENABLED: 'true' }, 'test'), OperationError)
  assert.throws(() => restoreDrillConnection({ PGHOST: 'db', ERROR_NOTIFICATIONS_ENABLED: '1' }, 'test'), OperationError)
  assert.deepEqual(restoreDrillConnection({ DATABASE_URL: 'postgres://local:password@127.0.0.1:55432/ignored' }, 'test'), { host: '127.0.0.1', port: 55432, user: 'local', password: 'password' })
})

test('restore comparison tolerates only redundant enum varchar/text casts and preserves literals and other checks', () => {
  const source = "CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying])::text[])))"
  const reparsed = "CHECK (((role)::text = ANY (ARRAY[('user'::character varying)::text, ('admin'::character varying)::text])))"
  const normalize = (value: string) => normalizeConstraintDefinition('users', 'users_role_valid', value)
  assert.equal(normalize(source), normalize(reparsed))
  assert.notEqual(normalize(source), normalize(reparsed.replace("'admin'", "'owner'")))
  assert.notEqual(normalize(source), normalize(reparsed.replace("'admin'", "'admin ()'")))
  assert.notEqual(normalize(source), normalize(reparsed.replace(' = ANY ', ' <> ALL ')))
  assert.equal(normalizeConstraintDefinition('payments', 'payments_amount_positive', 'CHECK ((amount > 0))'), 'CHECK ((amount > 0))')
})

test('CLI failures never echo DB messages, user data, question bodies or credentials', async () => {
  const secret = 'synthetic-secret@example.invalid question-body password=do-not-log'
  assert.equal(JSON.stringify(safeOperationFailure(new Error(secret))).includes(secret), false)
  assert.equal(JSON.stringify(safeOperationFailure(new ApiError(422, 'validation_error', secret, { secret }))).includes(secret), false)
  await assert.rejects(runCommand('unknown-command-that-must-not-be-echoed'), error => error instanceof OperationError && !error.message.includes('unknown-command-that-must-not-be-echoed'))
  await assert.rejects(createAdmin({ email: 'invalid', password: secret }), OperationError)
})

test('fresh PostgreSQL migrations retain constraints and adopt existing Rails records, FK names and bookkeeping', integration, async () => isolated(async db => {
  await importContent(undefined, IMPORT_CONFIRMATION, db)
  const owner = await user(db)
  const rows = await query('SELECT * FROM questions ORDER BY id', [], db)
  const ids = await query('SELECT id,question_id FROM question_choices ORDER BY id', [], db)
  await query('CREATE TABLE schema_migrations(version varchar PRIMARY KEY)', [], db)
  await query("INSERT INTO schema_migrations(version) VALUES('20261022000001')", [], db)
  await query('CREATE TABLE ar_internal_metadata(key varchar PRIMARY KEY,value varchar)', [], db)
  await query("INSERT INTO ar_internal_metadata(key,value) VALUES('environment','test')", [], db)
  await query('ALTER TABLE question_choices RENAME CONSTRAINT fk_choices_question TO fk_rails_preserved', [], db)
  // Replay only the Rails-adoption migrations; later schema versions remain applied.
  await query("DELETE FROM nitro_schema_migrations WHERE version IN ('001_preserve_rails_schema.sql','002_question_history_topics.sql')", [], db)
  const report = await migrate(db)
  assert.deepEqual(report.applied, ['001_preserve_rails_schema.sql','002_question_history_topics.sql'])
  assert.deepEqual(await query('SELECT * FROM questions ORDER BY id', [], db), rows)
  assert.deepEqual(await query('SELECT id,question_id FROM question_choices ORDER BY id', [], db), ids)
  assert.equal((await query('SELECT id FROM users WHERE id=$1', [owner.id], db)).length, 1)
  assert.equal((await query("SELECT 1 FROM pg_constraint WHERE conrelid='question_choices'::regclass AND conname='fk_rails_preserved'", [], db)).length, 1)
  assert.equal((await query('SELECT version FROM schema_migrations', [], db))[0]!.version, '20261022000001')
  assert.deepEqual(await migrate(db), { applied: [] })
  await query('SAVEPOINT constraint_test', [], db)
  await assert.rejects(query('UPDATE question_choices SET is_correct=true WHERE question_id=$1', [rows[0]!.id], db), error => (error as { code?: string }).code === '23505')
  await query('ROLLBACK TO SAVEPOINT constraint_test', [], db)
}))

test('Yamakawa taxonomy migration maps untouched legacy samples and preserves learning records while skipping edited choices', integration, async () => isolated(async db => {
  await insertLegacySamples(db)
  const owner = await user(db)
  const oldCategories = [
    ['economy', 'currency'], ['economy', 'currency'], ['economy', 'trade'],
    ['culture', 'cross_cultural'], ['culture', 'arts'],
  ]
  for (let index = 0; index < oldCategories.length; index += 1) {
    await query('UPDATE questions SET major_category_code=$1,category_code=$2,is_cultural_history=false,is_art_history=false WHERE exam_number=1 AND question_number=$3',
      [...oldCategories[index]!, index + 1], db)
  }
  await query(`INSERT INTO answer_histories(user_id,question_id,selected_choice_id,is_correct,created_at,updated_at)
    SELECT $1,q.id,c.id,c.is_correct,NOW(),NOW() FROM questions q JOIN question_choices c ON c.question_id=q.id AND c.display_order=1`, [owner.id], db)
  await query('INSERT INTO favorites(user_id,question_id,created_at,updated_at) SELECT $1,id,NOW(),NOW() FROM questions', [owner.id], db)
  const preservedQuestions = await query('SELECT id,exam_number,question_number,content_blocks,explanation_blocks,source_text,publication_status,created_at FROM questions ORDER BY question_number', [], db)
  const choicesBefore = await query('SELECT * FROM question_choices ORDER BY id', [], db)
  const historiesBefore = await query('SELECT * FROM answer_histories ORDER BY id', [], db)
  const favoritesBefore = await query('SELECT * FROM favorites ORDER BY id', [], db)
  const verifyLearningRecords = async () => {
    assert.deepEqual(await query('SELECT id,exam_number,question_number,content_blocks,explanation_blocks,source_text,publication_status,created_at FROM questions ORDER BY question_number', [], db), preservedQuestions)
    assert.deepEqual(await query('SELECT * FROM answer_histories ORDER BY id', [], db), historiesBefore)
    assert.deepEqual(await query('SELECT * FROM favorites ORDER BY id', [], db), favoritesBefore)
  }
  const applyTaxonomy = async () => {
    await query("DELETE FROM nitro_schema_migrations WHERE version='003_yamakawa_question_categories.sql'", [], db)
    assert.deepEqual(await migrateThrough(db, '004_cultural_history_categories.sql'), { applied: ['003_yamakawa_question_categories.sql', '004_cultural_history_categories.sql'] })
  }
  const classifications = () => query('SELECT question_number,major_category_code,category_code,is_cultural_history,is_art_history,cultural_history_category FROM questions ORDER BY question_number', [], db)
  const expected = content.questions.map((question: any) => ({ question_number: question.question_number,
    major_category_code: question.major_category_code, category_code: question.category_code,
    is_cultural_history: question.is_cultural_history, is_art_history: question.is_art_history,
    cultural_history_category: question.is_cultural_history ? (question.is_art_history ? 'art_history' : 'other_cultural_history') : null }))
  await query('SAVEPOINT legacy_taxonomy', [], db)
  await applyTaxonomy()
  assert.deepEqual(await classifications(), expected)
  assert.deepEqual(await query('SELECT * FROM question_choices ORDER BY id', [], db), choicesBefore)
  await verifyLearningRecords()
  assert.deepEqual(await migrateThrough(db, '004_cultural_history_categories.sql'), { applied: [] })

  // Re-run the upgrade from the same legacy state with one author-edited choice.
  await query('ROLLBACK TO SAVEPOINT legacy_taxonomy', [], db)
  await query(`UPDATE question_choices SET content_blocks='[{"type":"text","text":"Author-edited choice retained"}]'::jsonb
    WHERE question_id=(SELECT id FROM questions WHERE exam_number=1 AND question_number=3) AND display_order=1`, [], db)
  const editedChoices = await query('SELECT * FROM question_choices ORDER BY id', [], db)
  await applyTaxonomy()
  const expectedWithEdit = structuredClone(expected)
  expectedWithEdit[2] = { ...expectedWithEdit[2], major_category_code: 'economy', category_code: 'trade', is_cultural_history: false, is_art_history: false, cultural_history_category: null }
  assert.deepEqual(await classifications(), expectedWithEdit)
  assert.deepEqual(await query('SELECT * FROM question_choices ORDER BY id', [], db), editedChoices)
  await verifyLearningRecords()
}, '002_question_history_topics.sql'))

test('culture category migration backfills legacy flags without changing identities, timestamps or learning records', integration, async () => isolated(async db => {
  const owner = await user(db)
  const category = configuration.categories.minor[0]!
  for (const [index, flags] of [[false, false], [true, true], [true, false]].entries()) {
    const [question] = await query<{ id: number }>(`INSERT INTO questions(exam_number,question_number,major_category_code,category_code,
      content_blocks,explanation_blocks,source_text,publication_status,is_cultural_history,is_art_history,created_at,updated_at)
      VALUES(1,$1,$2,$3,'[{"type":"text","text":"Synthetic migration question"}]'::jsonb,
      '[{"type":"text","text":"Synthetic explanation"}]'::jsonb,'Synthetic source | https://example.com/migration','published',$4,$5,
      '2025-01-02 03:04:05.123456','2025-02-03 04:05:06.654321') RETURNING id`,
    [index + 1, category.major_category_value, category.value, ...flags], db)
    const [choice] = await query<{ id: number }>(`INSERT INTO question_choices(question_id,choice_label,content_blocks,is_correct,display_order,created_at,updated_at)
      VALUES($1,$2,'[{"type":"text","text":"Synthetic choice"}]'::jsonb,true,1,'2025-01-02','2025-02-03') RETURNING id`,
    [question!.id, configuration.exam.choice_labels[0]], db)
    await query(`INSERT INTO answer_histories(user_id,question_id,selected_choice_id,is_correct,created_at,updated_at)
      VALUES($1,$2,$3,true,'2025-01-02','2025-02-03')`, [owner.id, question!.id, choice!.id], db)
    await query(`INSERT INTO favorites(user_id,question_id,created_at,updated_at) VALUES($1,$2,'2025-01-02','2025-02-03')`, [owner.id, question!.id], db)
  }
  const preservedTables = ['questions', 'question_choices', 'users', 'answer_histories', 'favorites'] as const
  const before = Object.fromEntries(await Promise.all(preservedTables.map(async table => [table, await query(`SELECT * FROM ${table} ORDER BY id`, [], db)])))
  assert.deepEqual(await migrateThrough(db, '004_cultural_history_categories.sql'), { applied: ['004_cultural_history_categories.sql'] })
  const upgraded = await query('SELECT * FROM questions ORDER BY question_number', [], db)
  assert.deepEqual(upgraded.map(question => question.cultural_history_category), [null, 'art_history', 'other_cultural_history'])
  for (const table of preservedTables) {
    const rows = await query(`SELECT * FROM ${table} ORDER BY id`, [], db)
    if (table === 'questions') for (const row of rows) delete row.cultural_history_category
    assert.deepEqual(rows, before[table])
  }
  assert.deepEqual(await migrateThrough(db, '004_cultural_history_categories.sql'), { applied: [] })
  assert.deepEqual(await query('SELECT * FROM questions ORDER BY question_number', [], db), upgraded)
}, '003_yamakawa_question_categories.sql'))

test('grouped migration preserves legacy questions, choice IDs, histories and favorites while adding defaults', integration, async () => isolated(async db => {
  await insertLegacySamples(db)
  const owner = await user(db)
  await query(`INSERT INTO answer_histories(user_id,question_id,selected_choice_id,is_correct,created_at,updated_at)
    SELECT $1,q.id,c.id,c.is_correct,NOW(),NOW() FROM questions q JOIN question_choices c ON c.question_id=q.id AND c.display_order=1`, [owner.id], db)
  await query('INSERT INTO favorites(user_id,question_id,created_at,updated_at) SELECT $1,id,NOW(),NOW() FROM questions', [owner.id], db)
  const tables = ['questions', 'question_choices', 'users', 'answer_histories', 'favorites'] as const
  const before = Object.fromEntries(await Promise.all(tables.map(async table => [table, await query(`SELECT * FROM ${table} ORDER BY id`, [], db)])))
  assert.deepEqual(await migrateThrough(db, '005_grouped_questions.sql'), { applied: ['005_grouped_questions.sql'] })
  for (const table of tables) {
    const rows = await query(`SELECT * FROM ${table} ORDER BY id`, [], db)
    const oldKeys = Object.keys(before[table][0]!)
    assert.deepEqual(rows.map(row => Object.fromEntries(oldKeys.map(key => [key, row[key]]))), before[table])
  }
  const upgraded = await query('SELECT * FROM questions ORDER BY id', [], db)
  for (const row of upgraded) {
    assert.equal(row.group_id, null); assert.equal(row.group_question_number, null)
    assert.equal(row.answer_type, 'single_choice'); assert.equal(row.content_version, 1)
    assert.equal(row.lock_version, 1); assert.equal(row.legacy_answer_compatible, true)
    assert.deepEqual(row.accepted_answers, []); assert.deepEqual(row.input_constraints, {})
  }
  assert.equal((await query('SELECT * FROM question_topic_links', [], db)).length, upgraded.length)
  const set = (await query('SELECT * FROM exam_sets WHERE exam_number=1', [], db))[0]!
  assert.equal(set.format_code, 'legacy_practice'); assert.equal(set.publication_status, 'published')
  for (const row of await query('SELECT * FROM answer_histories ORDER BY id', [], db)) {
    assert.equal(row.answer_type, 'single_choice'); assert.equal(row.submitted_text, null)
    assert.equal(row.question_version, 1); assert.equal(row.submission_key, null)
  }
  assert.deepEqual(await migrateThrough(db, '005_grouped_questions.sql'), { applied: [] })
  assert.deepEqual(await query('SELECT * FROM questions ORDER BY id', [], db), upgraded)
}, '004_cultural_history_categories.sql'))

test('answer-type lock migration marks only currently published questions and preserves existing fields', integration, async () => isolated(async db => {
  await insertLegacySamples(db)
  await query("UPDATE questions SET publication_status='draft' WHERE question_number=2", [], db)
  await query("UPDATE questions SET publication_status='private' WHERE question_number=3", [], db)
  const before = await query('SELECT * FROM questions ORDER BY id', [], db)
  const choicesBefore = await query('SELECT * FROM question_choices ORDER BY id', [], db)
  assert.deepEqual(await migrateThrough(db, '006_lock_published_answer_types.sql'), { applied: ['006_lock_published_answer_types.sql'] })
  const upgraded = await query('SELECT * FROM questions ORDER BY id', [], db)
  for (const [index, row] of upgraded.entries()) {
    assert.equal(row.answer_type_locked, before[index]!.publication_status === 'published')
    const { answer_type_locked: _locked, ...original } = row
    assert.deepEqual(original, before[index])
  }
  assert.deepEqual(await query('SELECT * FROM question_choices ORDER BY id', [], db), choicesBefore)
  assert.deepEqual(await migrateThrough(db, '006_lock_published_answer_types.sql'), { applied: [] })
  assert.deepEqual(await query('SELECT * FROM questions ORDER BY id', [], db), upgraded)
}, '005_grouped_questions.sql'))

test('essay migration preserves all pre-existing fields and adds strict nullable-correctness response shapes', integration, async () => isolated(async db => {
  await insertLegacySamples(db)
  const owner = await user(db)
  await query(`INSERT INTO answer_histories(user_id,question_id,selected_choice_id,is_correct,created_at,updated_at)
    SELECT $1,q.id,c.id,c.is_correct,NOW(),NOW() FROM questions q JOIN question_choices c ON c.question_id=q.id AND c.display_order=1`, [owner.id], db)
  await query('INSERT INTO favorites(user_id,question_id,created_at,updated_at) SELECT $1,id,NOW(),NOW() FROM questions', [owner.id], db)
  const tables = ['questions','question_choices','users','answer_histories','favorites'] as const
  const before = Object.fromEntries(await Promise.all(tables.map(async table => [table, await query(`SELECT * FROM ${table} ORDER BY id`, [], db)])))
  assert.deepEqual(await migrate(db), { applied: ['007_essay_rule_scoring.sql'] })
  for (const table of tables) {
    const rows = await query(`SELECT * FROM ${table} ORDER BY id`, [], db)
    const keys = Object.keys(before[table][0]!)
    assert.deepEqual(rows.map(row => Object.fromEntries(keys.map(key => [key,row[key]]))), before[table])
  }
  assert.equal((await query<any>("SELECT count(*)::integer AS n FROM questions WHERE essay_config='{}'::jsonb", [], db))[0].n,before.questions.length)
  assert.equal((await query<any>('SELECT count(*)::integer AS n FROM answer_histories WHERE essay_result IS NULL AND is_correct IS NOT NULL', [], db))[0].n,before.answer_histories.length)
  assert.deepEqual(await migrate(db), { applied: [] })
  await assert.rejects(query('UPDATE answer_histories SET is_correct=NULL', [], db), (e:any)=>e.code==='23514')
}, '006_lock_published_answer_types.sql'))

test('applied SQL checksums cannot be silently rewritten', integration, async () => isolated(async db => {
  const directory = await mkdtemp(join(tmpdir(), 'exam-migration-test-'))
  const previous = process.env.MIGRATIONS_DIR
  try {
    await writeFile(join(directory, '001_preserve_rails_schema.sql'), '-- a changed migration\n')
    process.env.MIGRATIONS_DIR = directory
    await assert.rejects(migrate(db), /適用済みSQL/)
  } finally {
    if (previous === undefined) delete process.env.MIGRATIONS_DIR; else process.env.MIGRATIONS_DIR = previous
    await rm(directory, { recursive: true, force: true })
  }
}))

test('JSON import and development seed never overwrite existing questions', integration, async () => isolated(async db => {
  assert.equal((await seedContent({ db, mode: 'development' })).status, 'imported')
  const before = await query('SELECT * FROM questions ORDER BY id', [], db)
  assert.deepEqual(await seedContent({ db, mode: 'development' }), { status: 'skipped' })
  await assert.rejects(importContent(undefined, IMPORT_CONFIRMATION, db), OperationError)
  assert.deepEqual(await query('SELECT * FROM questions ORDER BY id', [], db), before)
}))

test('an incomplete public set fails as one transaction and persists no imported rows', integration, async () => isolated(async db => {
  await query('SAVEPOINT partial_import', [], db)
  await assert.rejects(importArchive(createArchive(content.questions.slice(0, 1)), IMPORT_CONFIRMATION, db), error => error instanceof ApiError && error.status === 422)
  // A caller-owned transaction is responsible for rollback; the CLI owns its transaction.
  await query('ROLLBACK TO SAVEPOINT partial_import', [], db)
  assert.equal(await countQuestions(db), 0)
}))

test('archive export has private permissions, excludes all user data and rejects existing destinations', integration, async () => isolated(async db => {
  await importContent(undefined, IMPORT_CONFIRMATION, db)
  const owner = await user(db)
  const directory = await mkdtemp(join(tmpdir(), 'exam-export-test-'))
  try {
    const file = join(directory, 'questions.json')
    const report = await exportArchive(file, db)
    assert.equal(report.question_count, content.questions.length)
    const encoded = await readFile(file, 'utf8')
    assert.equal(encoded.includes(owner.email), false)
    assert.equal(encoded.includes('password_digest'), false)
    assert.equal((await lstat(file)).mode & 0o777, 0o600)
    assert.equal(validateArchive(JSON.parse(encoded)).sha256, report.sha256)
    await assert.rejects(exportArchive(file, db), OperationError)
    assert.equal(await readFile(file, 'utf8'), encoded)
  } finally { await rm(directory, { recursive: true, force: true }) }
}))

test('admin creation refuses duplicate accounts and never promotes or resets an existing user', integration, async () => isolated(async db => {
  const existing = await user(db)
  await assert.rejects(createAdmin({ email: existing.email, password: 'synthetic-password' }, db), OperationError)
  assert.equal((await query('SELECT role,password_digest FROM users WHERE id=$1', [existing.id], db))[0]!.role, 'user')
  const email = `admin-${randomUUID()}@example.invalid`
  assert.deepEqual(await createAdmin({ email, password: 'synthetic-password', name: 'Test admin' }, db), { status: 'created' })
  const [admin] = await query('SELECT * FROM users WHERE email=$1', [email], db)
  assert.equal(admin!.role, 'admin')
  assert.equal(await bcrypt.compare('synthetic-password', admin!.password_digest), true)
  await assert.rejects(createAdmin({ email, password: 'changed-password' }, db), OperationError)
  assert.equal((await query('SELECT password_digest FROM users WHERE email=$1', [email], db))[0]!.password_digest, admin!.password_digest)
}))

test('verification grants are audited, expire within seven days, grant once and revoke idempotently', integration, async () => isolated(async db => {
  const owner = await user(db)
  await assert.rejects(grantVerification({ email: owner.email, reason: 'test', grantedBy: 'operator', expiresAt: new Date(Date.now() + 8 * 86400000).toISOString() }, db), OperationError)
  const input = { email: owner.email, reason: 'Synthetic verification', grantedBy: 'test-operator', expiresAt: new Date(Date.now() + 86400000).toISOString() }
  assert.equal((await grantVerification(input, db)).status, 'granted')
  await assert.rejects(grantVerification(input, db), OperationError)
  assert.deepEqual(await revokeVerification(owner.email, db), { status: 'revoked' })
  const [before] = await query('SELECT revoked_at FROM verification_access_grants WHERE user_id=$1', [owner.id], db)
  await revokeVerification(owner.email, db)
  assert.deepEqual((await query('SELECT revoked_at FROM verification_access_grants WHERE user_id=$1', [owner.id], db))[0], before)
}))

test('audit reports aggregate anomalies and pending checkout expiration uses the Stripe service', integration, async () => isolated(async db => {
  const owner = await user(db)
  await query("INSERT INTO payments(user_id,stripe_checkout_session_id,stripe_price_id,amount,currency,status,created_at,updated_at) VALUES($1,'cs_test_operations','price_test_operations',500,'jpy','pending',NOW()-interval '2 days',NOW())", [owner.id], db)
  const report = await auditOperations(db)
  assert.equal(report.counts.stale_pending_checkouts, 1)
  assert.deepEqual(report.warnings, ['stale_pending_checkouts'])
  assert.equal(JSON.stringify(report).includes(owner.email), false)
  const calls: string[] = []
  const client = { checkout: { sessions: {
    retrieve: async () => ({ id: 'cs_test_operations', status: 'open', livemode: false }),
    expire: async (id: string) => { calls.push(id); return { id, status: 'expired' } },
  } } } as unknown as PaymentStripeClient
  assert.deepEqual(await expirePendingForUser(owner.email, { db, client }), { status: 'ok', expired_count: 1 })
  assert.deepEqual(calls, ['cs_test_operations'])
  assert.equal((await query("SELECT status FROM payments WHERE user_id=$1", [owner.id], db))[0]!.status, 'expired')
  assert.deepEqual(await expirePendingForUser(owner.email, { db, client }), { status: 'ok', expired_count: 0 })
}))
