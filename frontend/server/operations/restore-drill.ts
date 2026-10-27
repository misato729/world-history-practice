import { randomBytes } from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdtemp, chmod, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import { query, type Database } from '../core/db.ts'
import { configuration, environment } from '../core/config.ts'
import { issueToken, verifyToken, userPayload, type User } from '../core/auth.ts'
import { migrate } from '../database/migrate.ts'
import { saveQuestion } from '../services/learning-writer.ts'
import { nextQuestion, getQuestion, answerQuestion, listHistory, listFavorites, listAdminQuestions } from '../services/learning.ts'
import { loadExamSet, saveExamSet, createQuestionGroup, loadQuestionGroup, saveQuestionGroup, publishExamSet } from '../services/learning-structure.ts'
import { publicPaymentConfiguration, settingEnabled } from '../services/payment-settings.ts'
import { digest, OperationError } from './content.ts'

const LOCAL_HOSTS = ['db', 'localhost', '127.0.0.1', '::1']
const identifier = (value: string) => '"' + value.replaceAll('"', '""') + '"'
type LocalConnection = { host: string, port: number, user: string, password: string }

/** No supplied database name is ever used: all writes target two fresh disposable DBs. */
export function restoreDrillConnection(env: NodeJS.ProcessEnv = process.env, mode = environment()): LocalConnection {
  if (mode !== 'test' || settingEnabled(env.PAID_MEMBERSHIP_ENABLED) || settingEnabled(env.ERROR_NOTIFICATIONS_ENABLED)) throw new OperationError('復元演習には販売・外部通知を無効にしたローカルのtest環境が必要です')
  let settings: LocalConnection
  try {
    if (env.DATABASE_URL) {
      const url = new URL(env.DATABASE_URL)
      if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error()
      settings = { host: url.hostname.replace(/^\[|\]$/g, ''), port: Number(url.port || 5432),
        user: decodeURIComponent(url.username), password: decodeURIComponent(url.password) }
    } else settings = { host: env.PGHOST || env.DB_HOST || 'localhost', port: Number(env.PGPORT || env.DB_PORT || 5432),
      user: env.PGUSER || env.POSTGRES_USER || 'world_history', password: env.PGPASSWORD || env.POSTGRES_PASSWORD || '' }
  } catch { throw new OperationError('復元演習のローカルDB接続設定を確認してください') }
  if (!LOCAL_HOSTS.includes(settings.host) || !Number.isSafeInteger(settings.port) || settings.port < 1 || settings.port > 65535 || !settings.user) throw new OperationError('復元演習の接続先はローカルtest用PostgreSQLに限定されます')
  return settings
}

async function runTool(tool: string, args: string[], env: NodeJS.ProcessEnv): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(tool, args, { env, timeout: 60000, maxBuffer: 1024 * 1024, encoding: 'utf8' }, (error, stdout) => {
      // Tool stderr may contain connection details; never forward it to logs.
      if (error) reject(new OperationError(`${tool}の実行に失敗しました。ツールの配置・権限・バージョンを確認してください`))
      else resolve(stdout)
    })
  })
}
function toolEnvironment(settings: LocalConnection, database: string): NodeJS.ProcessEnv {
  const env = { ...process.env, PGHOST: settings.host, PGPORT: String(settings.port), PGUSER: settings.user,
    PGPASSWORD: settings.password, PGDATABASE: database, PGSSLMODE: 'disable', PGOPTIONS: '-c statement_timeout=60000' }
  for (const key of ['PGSERVICE', 'PGSERVICEFILE', 'PGPASSFILE']) delete (env as NodeJS.ProcessEnv)[key]
  return env
}
async function begin<T>(client: pg.Client, action: (db: Database) => Promise<T>): Promise<T> {
  await client.query('BEGIN')
  try { const value = await action(client); await client.query('COMMIT'); return value }
  catch (error) { await client.query('ROLLBACK'); throw error }
}
async function fingerprint(db: Database) {
  const tables = await query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename", [], db)
  const result: Record<string, { count: number, sha256: string }> = {}
  for (const { tablename } of tables) {
    const rows = await query<{ value: string }>(`SELECT row_to_json(t)::text AS value FROM ${identifier(tablename)} t`, [], db)
    const values = rows.map(row => row.value).sort()
    result[tablename] = { count: values.length, sha256: digest(values) }
  }
  return result
}
/** pg_dump re-parses varchar IN checks as text ANY arrays, adding redundant casts. */
export function normalizeConstraintDefinition(table: string, name: string, definition: string): string {
  if (!['users/users_role_valid', 'memberships/memberships_status_valid', 'payments/payments_status_valid'].includes(`${table}/${name}`)) return definition
  const literals: string[] = []
  const normalized = definition.replace(/'(?:''|[^'])*'/g, literal => {
    literals.push(literal)
    return `$literal${literals.length - 1}$`
  }).replace(/::(?:character varying|text)(?:\[\])?(?![\w\[])/g, '').replace(/[()\s]/g, '')
  return normalized.replace(/\$literal(\d+)\$/g, (_token, index) => literals[Number(index)]!)
}
async function constraints(db: Database) {
  const rows = await query<{ relname: string, conname: string, definition: string }>(`SELECT c.relname,con.conname,pg_get_constraintdef(con.oid) AS definition
    FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' ORDER BY c.relname,con.conname`, [], db)
  return rows.map(row => ({ ...row, definition: normalizeConstraintDefinition(row.relname, row.conname, row.definition) }))
}
const indexes = (db: Database) => query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname", [], db)
async function sequences(db: Database) {
  const names = await query<{ sequencename: string }>("SELECT sequencename FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename", [], db)
  const result: Record<string, unknown> = {}
  for (const { sequencename } of names) result[sequencename] = await query(`SELECT last_value,is_called FROM ${identifier(sequencename)}`, [], db)
  return result
}
async function createSyntheticRecords(db: Database, password: string) {
  const encoded = await bcrypt.hash(password, 12)
  const [user] = await query<User>("INSERT INTO users(name,email,password_digest,role,created_at,updated_at) VALUES('Restore drill','restore@example.invalid',$1,'user',NOW(),NOW()) RETURNING *", [encoded], db)
  await query("INSERT INTO users(name,email,password_digest,role,created_at,updated_at) VALUES('Restore admin','restore-admin@example.invalid',$1,'admin',NOW(),NOW())", [encoded], db)
  const category = configuration.categories.minor[0]!
  const question = await saveQuestion({ exam_number: 1, question_number: 1,
    major_category_code: category.major_category_value, category_code: category.value,
    is_cultural_history: false, is_art_history: false, cultural_history_category: null, publication_status: 'published',
    content_blocks: [{ type: 'text', text: 'Synthetic restore question' }], explanation_blocks: [{ type: 'text', text: 'Synthetic explanation' }],
    source_text: 'Synthetic source | https://example.invalid/source',
    choices: configuration.exam.choice_labels.map((choice_label, index) => ({ choice_label, display_order: index + 1,
      is_correct: index === 0, content_blocks: [{ type: 'text', text: `Synthetic choice ${index + 1}` }] })) }, { db, requireCompleteExam: false })
  const correct = question.choices.find(choice => choice.is_correct)!
  await query('INSERT INTO answer_histories(user_id,question_id,selected_choice_id,is_correct,created_at,updated_at) VALUES($1,$2,$3,true,NOW(),NOW())', [user!.id, question.id, correct.id], db)
  await query('INSERT INTO favorites(user_id,question_id,created_at,updated_at) VALUES($1,$2,NOW(),NOW())', [user!.id, question.id], db)
  const [payment] = await query<{ id: number }>(`INSERT INTO payments(user_id,stripe_checkout_session_id,stripe_payment_intent_id,stripe_price_id,amount,currency,status,paid_at,created_at,updated_at)
    VALUES($1,'cs_test_restore_drill','pi_test_restore_drill','price_test_restore_drill',$2,'jpy','paid',NOW(),NOW(),NOW()) RETURNING id`, [user!.id, configuration.payments.amount], db)
  await query("INSERT INTO memberships(user_id,source_payment_id,status,activated_at,created_at,updated_at) VALUES($1,$2,'active',NOW(),NOW(),NOW())", [user!.id, payment!.id], db)
  await query("INSERT INTO verification_access_grants(user_id,reason,granted_by,expires_at,created_at,updated_at) VALUES($1,'Synthetic restore drill','local-test',NOW()+interval '1 day',NOW(),NOW())", [user!.id], db)
  await query("INSERT INTO stripe_webhook_events(stripe_event_id,event_type,livemode,processed_at,created_at,updated_at) VALUES('evt_test_restore_drill','checkout.session.completed',false,NOW(),NOW(),NOW())", [], db)
  if (configuration.exam.set_count < 2) throw new OperationError('大問の復元演習には検証用の第2教材枠が必要です')
  const before = await loadExamSet(2, db)
  await saveExamSet({ exam_number: 2, title: 'Synthetic grouped drill', format_code: 'group_practice', publication_status: 'draft', lock_version: before.lock_version }, { db })
  const group = await createQuestionGroup(2, { group_number: 1, title: 'Synthetic group', planned_question_count: 8, publication_status: 'draft', passages: [{ label: 'A', display_order: 1, content_blocks: [{ type: 'text', inlines: [{ type: 'anchor', id: 'a', label: 'a', text: 'Synthetic shared passage', underline: true }] }] }] }, { db })
  let shortId = 0
  for (let i = 1; i <= 8; i++) {
    const short = i === 3 || i === 6
    const saved = await saveQuestion({ exam_number: 2, question_number: i, group_id: group.id, group_question_number: i,
      major_category_code: category.major_category_value, category_code: category.value, is_cultural_history: false, is_art_history: false, cultural_history_category: null,
      publication_status: 'published', answer_type: short ? 'short_text' : 'single_choice', content_blocks: [{ type: 'text', text: `Synthetic grouped question ${i}` }], explanation_blocks: [{ type: 'text', text: 'Synthetic grouped explanation' }], source_text: null,
      source_references: [{ kind: 'book', title: 'Synthetic reference', publisher: 'Synthetic publisher', section: 'Synthetic entry' }],
      accepted_answers: short ? ['合成語', '別表記'] : [], input_constraints: short ? { script: 'kanji', exact_length: 3 } : {}, related_topics: [],
      passage_references: [{ passage_id: group.passages[0]!.id, anchor_id: i === 1 ? 'a' : null }],
      choices: short ? [] : configuration.exam.choice_labels.map((choice_label, n) => ({ choice_label, display_order: n + 1, is_correct: n === 0, content_blocks: [{ type: 'text', text: `Synthetic choice ${n}` }] })),
    }, { db, requireCompleteExam: false })
    if (i === 3) shortId = saved.id
  }
  const complete = await loadQuestionGroup(group.id, db)
  await saveQuestionGroup(group.id, { ...complete, publication_status: 'published' }, { db })
  const completeSet = await loadExamSet(2, db)
  await publishExamSet(2, completeSet.lock_version, { db })
  const { data: shortQuestion } = await getQuestion(shortId, user!, db)
  await answerQuestion(shortId, { answer_type: 'short_text', submitted_text: '別表記', question_version: shortQuestion.question_version, submission_key: 'restore-synthetic-short' }, user!, db)
  await query('INSERT INTO favorites(user_id,question_id,created_at,updated_at) VALUES($1,$2,NOW(),NOW())', [user!.id, shortId], db)
}

async function applicationChecks(db: Database, password: string) {
  const [user] = await query<User>("SELECT * FROM users WHERE email='restore@example.invalid'", [], db)
  const [admin] = await query<User>("SELECT * FROM users WHERE email='restore-admin@example.invalid'", [], db)
  if (!user || !admin || !await bcrypt.compare(password, user.password_digest) || !await bcrypt.compare(password, admin.password_digest)) throw new OperationError('復元後のパスワード照合が一致しません')
  if (verifyToken(issueToken(user))?.user_id !== user.id || verifyToken(issueToken(admin))?.role !== 'admin') throw new OperationError('復元後の認証トークン検査に失敗しました')
  const me = await userPayload(user, db)
  const { data: question } = await nextQuestion({ exam_number: 1 }, user, db)
  const { data: history } = await listHistory(user, {}, db)
  const { data: favorites } = await listFavorites(user, {}, db)
  const { data: managed } = await listAdminQuestions(admin, {}, db)
  const { data: grouped } = await nextQuestion({ exam_number: 2, question_number: 3 }, user, db)
  const checks = {
    password_authentication: true, signed_tokens: true, paid_content_access: me.paid_content_access === true,
    public_answer_secrecy: !('explanation_blocks' in question) && !('source_text' in question) &&
      Array.isArray(question.choices) && question.choices.length === configuration.exam.choice_labels.length && question.choices.every(choice => !('is_correct' in choice)),
    history_relationship: history.length === 2 && history.some(item => item.question.id === question.id),
    favorite_relationship: favorites.length === 2 && favorites.some(item => item.question.id === question.id),
    admin_read: managed.length === 9 && managed.some(item => item.id === question.id),
    grouped_context: grouped.answer_type === 'short_text' && Array.isArray(grouped.shared_passages) && grouped.shared_passages.length === 1,
    short_answer_secrecy: !('accepted_answers' in grouped) && !('source_references' in grouped),
    short_history: history.some(item => item.question.id === grouped.id && item.answer_type === 'short_text' && item.selected_choice === null),
    sales_disabled: publicPaymentConfiguration().enabled === false,
  }
  for (const current of [user, null]) {
    try { await listAdminQuestions(current, {}, db); throw new OperationError('復元後の管理者権限検査に失敗しました') }
    catch (error) { if (![401, 403].includes((error as { status?: number }).status || 0)) throw error }
  }
  const [relationships] = await query<{ valid: boolean }>(`SELECT EXISTS(SELECT 1 FROM answer_histories h JOIN question_choices c ON c.id=h.selected_choice_id AND c.question_id=h.question_id AND c.is_correct=true)
    AND EXISTS(SELECT 1 FROM memberships m JOIN payments p ON p.id=m.source_payment_id AND p.user_id=m.user_id WHERE m.status='active' AND p.status='paid')
    AND EXISTS(SELECT 1 FROM verification_access_grants WHERE revoked_at IS NULL AND expires_at>NOW())
    AND EXISTS(SELECT 1 FROM stripe_webhook_events WHERE event_type='checkout.session.completed' AND livemode=false) AS valid`, [], db)
  if (Object.values(checks).some(value => value !== true) || relationships?.valid !== true) throw new OperationError('復元後のサービス検査又は外部キーの関係が一致しません')
  return { ...checks, admin_authorization: true, record_relationships: true }
}

export async function restoreDrill() {
  const settings = restoreDrillConnection()
  const created: string[] = []
  const clients: pg.Client[] = []
  const admin = new pg.Client({ ...settings, database: 'postgres', ssl: false, connectionTimeoutMillis: 10000, statement_timeout: 60000 })
  let directory: string | undefined
  let connected = false
  const started = performance.now()
  try {
    await admin.connect(); connected = true
    const [version] = await query<{ server_version_num: string }>('SHOW server_version_num', [], admin)
    const major = Math.floor(Number(version!.server_version_num) / 10000)
    for (const tool of ['pg_dump', 'pg_restore']) {
      const output = await runTool(tool, ['--version'], toolEnvironment(settings, 'postgres'))
      if (Number(output.match(/PostgreSQL\) (\d+)/)?.[1]) !== major) throw new OperationError('pg_dump・pg_restoreはtest用DBと同じメジャーバージョンを使用してください')
    }
    const suffix = randomBytes(8).toString('hex')
    const [source, target] = [`world_history_drill_source_${suffix}_test`, `world_history_drill_target_${suffix}_test`]
    for (const name of [source!, target!]) { await admin.query(`CREATE DATABASE ${identifier(name)} TEMPLATE template0`); created.push(name) }
    const connect = async (database: string) => {
      const client = new pg.Client({ ...settings, database, ssl: false, connectionTimeoutMillis: 10000, statement_timeout: 60000, options: '-c timezone=UTC' })
      await client.connect(); clients.push(client); return client
    }
    const origin = await connect(source!)
    const password = randomBytes(24).toString('hex')
    await begin(origin, async db => { await migrate(db); await createSyntheticRecords(db, password) })
    const expected = { rows: await fingerprint(origin), constraints: await constraints(origin), indexes: await indexes(origin), sequences: await sequences(origin) }
    directory = await mkdtemp(join(tmpdir(), 'exam-practice-restore-drill-'))
    await chmod(directory, 0o700)
    const file = join(directory, 'synthetic.dump')
    await runTool('pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--file', file], toolEnvironment(settings, source!))
    await chmod(file, 0o600)
    await runTool('pg_restore', ['--dbname', target!, '--exit-on-error', '--single-transaction', '--no-owner', '--no-acl', file], toolEnvironment(settings, target!))
    const restored = await connect(target!)
    const actual = { rows: await fingerprint(restored), constraints: await constraints(restored), indexes: await indexes(restored), sequences: await sequences(restored) }
    if (digest(actual) !== digest(expected)) {
      const mismatches = (Object.keys(expected) as (keyof typeof expected)[]).filter(key => digest(actual[key]) !== digest(expected[key]))
      throw new OperationError(`復元後の比較が一致しません: ${mismatches.map(key => `${key} expected=${digest(expected[key])} actual=${digest(actual[key])}`).join('; ')}`)
    }
    const checks = await applicationChecks(restored, password)
    if (digest(await fingerprint(restored)) !== digest(expected.rows)) throw new OperationError('サービスの読み取り検査が復元データを変更しました')
    return { status: 'ok', data: 'synthetic_only', tables: Object.keys(expected.rows).length,
      row_counts: Object.fromEntries(Object.entries(expected.rows).map(([key, value]) => [key, value.count])),
      constraints: expected.constraints.length, indexes: expected.indexes.length, sequences: Object.keys(expected.sequences).length,
      application_checks: checks, elapsed_seconds: Math.round((performance.now() - started) / 10) / 100 }
  } catch (error) {
    if (error instanceof OperationError) throw error
    throw new OperationError('復元演習に失敗しました。ローカルtest用DBの接続・DB作成権限・スキーマを確認してください')
  } finally {
    await Promise.allSettled(clients.map(client => client.end()))
    let cleanupFailed = false
    if (connected) for (const name of created) {
      try { await admin.query(`DROP DATABASE ${identifier(name)} WITH (FORCE)`) } catch { cleanupFailed = true }
    }
    if (connected) await admin.end()
    if (directory) await rm(directory, { recursive: true, force: true })
    if (cleanupFailed) throw new OperationError('復元演習で作成した一時DBの削除に失敗しました。ローカルtest用PostgreSQLを確認してください')
  }
}
