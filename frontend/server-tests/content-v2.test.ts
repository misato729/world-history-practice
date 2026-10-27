import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { configuration } from '../server/core/config.ts'
import { getDatabase, query, closeDatabase, type Database } from '../server/core/db.ts'
import { migrate } from '../server/database/migrate.ts'
import { createArchive, createArchiveV2, validateArchive, importArchive, exportArchive, IMPORT_CONFIRMATION, OperationError } from '../server/operations/content.ts'
import { exportArchiveV2 } from '../server/operations/content-v2.ts'
import { loadExamSet, saveExamSet, createQuestionGroup } from '../server/services/learning-structure.ts'
import { getQuestion, answerQuestion } from '../server/services/learning.ts'

process.env.APP_ENV = 'test'
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
const integration = { skip: !Boolean(process.env.DATABASE_URL || process.env.PGHOST) }
after(async () => closeDatabase())

function fixture() {
  const category = configuration.categories.minor[0]!
  return createArchiveV2({
    exam_sets: [{ exam_number: 2, title: '合成大問演習', format_code: 'group_practice', publication_status: 'published' }],
    groups: [{ archive_id: 1, exam_number: 2, group_number: 1, title: '合成の共通テーマ', planned_question_count: 8, publication_status: 'published',
      passages: [{ archive_id: 1, label: 'A', display_order: 1, content_blocks: [{ type: 'text', id: 'paragraph-a', inlines: [{ type: 'text', text: '合成の共通本文。' }, { type: 'anchor', id: 'a', label: 'a', text: '参照箇所', underline: true }] }] }] }],
    questions: Array.from({ length: 8 }, (_, i) => {
      const short = i === 2 || i === 5
      return { exam_number: 2, question_number: i + 1, group_id: 1, group_question_number: i + 1,
        major_category_code: category.major_category_value, category_code: category.value,
        is_cultural_history: false, is_art_history: false, cultural_history_category: null,
        publication_status: 'published', answer_type: short ? 'short_text' : 'single_choice',
        content_blocks: [{ type: 'text', text: `合成の小問${i + 1}` }], explanation_blocks: [{ type: 'text', text: '合成の解説' }],
        source_text: null, source_references: [{ kind: 'book', title: '合成の参考資料', publisher: '合成出版社', edition: '検証版', section: '合成項目' }],
        accepted_answers: short ? ['合成語', '別表記'] : [], input_constraints: short ? { exact_length: 3, script: 'kanji', hint: '漢字3字' } : {},
        related_topics: [], passage_references: [{ passage_id: 1, anchor_id: i === 0 ? 'a' : null }],
        choices: short ? [] : configuration.exam.choice_labels.map((choice_label, n) => ({ choice_label, display_order: n + 1, is_correct: n === i % 4, content_blocks: [{ type: 'text', text: `合成選択肢${n + 1}` }] })),
      }
    }),
  })
}

async function isolated(action: (db: Database) => Promise<void>) {
  const client = await getDatabase().connect()
  const schema = `group_archive_${randomUUID().replaceAll('-', '')}`
  await client.query('BEGIN')
  try {
    await client.query(`CREATE SCHEMA "${schema}"`)
    await client.query(`SET LOCAL search_path TO "${schema}"`)
    await migrate(client)
    await action(client)
  } finally { await client.query('ROLLBACK'); client.release() }
}

test('v2 validates grouped mixed-answer content without fabricating source URLs', () => {
  const archive = fixture()
  assert.equal(archive.question_count, 8)
  assert.equal(archive.choice_count, 24)
  assert.deepEqual(validateArchive(archive), archive)
  assert.equal(archive.questions[2]!.choices.length, 0)
  assert.throws(() => validateArchive({ ...archive, sha256: '0'.repeat(64) }), OperationError)
  assert.throws(() => createArchiveV2({ ...archive, questions: archive.questions.map((q, i) => i === 0 ? { ...q, passage_references: [{ passage_id: 9999, anchor_id: null }] } : q) }), OperationError)
  assert.throws(() => createArchiveV2({ ...archive, groups: [...archive.groups, archive.groups[0]] }), OperationError)
  assert.throws(() => createArchiveV2({ ...archive, questions: archive.questions.map((q,i)=>i===0?{...q,choices:q.choices.map(c=>({...c,unknown:true}))}:q) }),OperationError)
  assert.throws(() => createArchiveV2({ exam_sets:[{exam_number:1,title:'不完全な旧形式',format_code:'legacy_practice',publication_status:'published'}],groups:[],questions:[] }),OperationError)
})

test('v2 passage transport IDs follow logical group order instead of local serial IDs', async () => {
  const adapter=(reverse:boolean)=>({query:async(sql:string)=>{
    const group1=reverse?20:10,group2=reverse?10:20
    if(sql.includes('FROM exam_sets'))return {rows:[{exam_number:2,title:'合成下書き',format_code:'group_practice',publication_status:'draft'}]}
    if(sql.includes('FROM question_groups'))return {rows:[group1,group2].map((id,i)=>({id,exam_number:2,group_number:i+1,title:`大問${i+1}`,planned_question_count:8,publication_status:'draft'}))}
    return {rows:[{id:31,group_id:group1,label:'A',display_order:1,content_blocks:[{type:'text',text:'本文1'}]},{id:32,group_id:group2,label:'A',display_order:1,content_blocks:[{type:'text',text:'本文2'}]}].sort((a,b)=>a.group_id-b.group_id)}
  }}) as unknown as Database
  assert.equal((await exportArchiveV2([],adapter(false))).sha256,(await exportArchiveV2([],adapter(true))).sha256)
})

test('v2 retains a private legacy parent while v1 refuses a target containing draft groups', integration, async () => {
  const original=fixture()
  const legacy=createArchiveV2({exam_sets:[{exam_number:1,title:'非公開の合成教材',format_code:'legacy_practice',publication_status:'private'}],groups:[],questions:[{...original.questions[0],exam_number:1,group_id:null,group_question_number:null,passage_references:[]}]})
  await isolated(async db=>{
    await importArchive(legacy,IMPORT_CONFIRMATION,db)
    assert.equal((await loadExamSet(1,db)).publication_status,'private')
    const [row]=await query<{id:number}>('SELECT id FROM questions WHERE exam_number=1',[],db)
    await assert.rejects(getQuestion(row!.id,null,db),{status:404})
  })
  await isolated(async db=>{
    await saveExamSet({exam_number:2,title:'合成下書き',format_code:'group_practice',publication_status:'draft'}, {db})
    await createQuestionGroup(2,{group_number:1,title:'空の大問',planned_question_count:8,passages:[]},{db})
    await assert.rejects(importArchive(createArchive([]),IMPORT_CONFIRMATION,db),OperationError)
    assert.equal((await query('SELECT id FROM question_groups',[],db)).length,1)
  })
})

test('v2 import/export retains group references and short-answer grading, and refuses populated targets', integration, async () => {
  const archive = fixture()
  const base = fileURLToPath(new URL('../../local-only/grouped-implementation-20261027/', import.meta.url))
  await mkdir(base, { recursive: true })
  const directory = await mkdtemp(join(base, 'archive-test-'))
  try {
    await isolated(async db => {
      await importArchive(archive, IMPORT_CONFIRMATION, db)
      const [row] = await query<{ id: number }>('SELECT id FROM questions WHERE exam_number=2 AND question_number=3', [], db)
      const { data: question } = await getQuestion(row!.id, null, db)
      assert.equal(question.answer_type, 'short_text')
      assert.equal(question.shared_passages.length, 1)
      assert.equal('accepted_answers' in question, false)
      assert.equal('source_references' in question, false)
      const { data: answer } = await answerQuestion(row!.id, { answer_type: 'short_text', submitted_text: '別表記', question_version: question.question_version, submission_key: randomUUID() }, null, db)
      assert.equal(answer.is_correct, true)
      assert.equal(answer.correct_answer, '合成語')
      await exportArchive(join(directory, 'v2.json'), db)
      const exported = validateArchive(JSON.parse(await readFile(join(directory, 'v2.json'), 'utf8')))
      assert.equal(exported.version, 2)
      assert.equal(exported.question_count, 8)
      assert.equal(exported.choice_count, 24)
      assert.equal(exported.sha256, archive.sha256)
      await assert.rejects(importArchive(archive, IMPORT_CONFIRMATION, db), OperationError)
    })
  } finally { await rm(directory, { recursive: true, force: true }) }
})
