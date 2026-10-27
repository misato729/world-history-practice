import { query, transaction, type Database } from '../core/db.ts'
import { configuration } from '../core/config.ts'
import { validateQuestionInput, validateBlocks, type QuestionInput } from '../services/learning-validation.ts'
import { saveQuestion } from '../services/learning-writer.ts'
import { loadExamSet, saveExamSet, createQuestionGroup, saveQuestionGroup, loadQuestionGroup } from '../services/learning-structure.ts'
import { ARCHIVE_FORMAT, OperationError, digest } from './archive-common.ts'
import { getExamFormat } from '../../shared/examConfig.ts'

type ArchivePassage = { archive_id: number; label: string; display_order: number; content_blocks: unknown[] }
type ArchiveGroup = { archive_id: number; exam_number: number; group_number: number; title: string; planned_question_count: number; publication_status: string; passages: ArchivePassage[] }
type ArchiveSet = { exam_number: number; title: string; format_code: string; publication_status: string }
export type ArchiveV2 = { format: string; version: 2; question_count: number; choice_count: number; sha256: string; exam_sets: ArchiveSet[]; groups: ArchiveGroup[]; questions: QuestionInput[] }
const object = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const exact = (value: unknown, keys: string[]): value is Record<string, any> => object(value) && Object.keys(value).sort().join('\0') === [...keys].sort().join('\0')
const positive = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0
const status = (value: unknown) => ['draft', 'published', 'private'].includes(String(value))
const fail = (): never => { throw new OperationError('大問アーカイブの属性・所属・参照・件数を確認してください') }
const questionKeys = ['exam_number','question_number','major_category_code','category_code','content_blocks','explanation_blocks','source_text','publication_status','choices','is_cultural_history','is_art_history','cultural_history_category','group_id','group_question_number','answer_type','accepted_answers','input_constraints','related_topics','source_references','passage_references','essay_config']
const blockKeys: Record<string, string[]> = {
  text:['type','id','text','inlines'],quote:['type','id','text','inlines','source'],fill_in_text:['type','id','text','inlines'],fill_in_quote:['type','id','text','inlines'],
  table:['type','id','headers','rows'],code:['type','id','title','code'],code_group:['type','id','items'],fill_in_choice:['type','id','cells'],
}
const only = (value: unknown, keys: string[]) => object(value) && Object.keys(value).every(key => keys.includes(key))
function strictBlocks(value: unknown, context: 'question'|'explanation'|'choice') {
  if (!Array.isArray(value)) return fail()
  for (const block of value) {
    if (!object(block) || !blockKeys[block.type] || !only(block, blockKeys[block.type]!)) return fail()
    if (block.inlines !== undefined && (!Array.isArray(block.inlines) || block.inlines.some((part: unknown) => !object(part) || !only(part, part.type==='text'?['type','text']:part.type==='anchor'?['type','id','label','text','underline']:['type','id','label'])))) return fail()
    if (block.items !== undefined && (!Array.isArray(block.items) || block.items.some((item: unknown) => !only(item,['title','code'])))) return fail()
  }
  try { return validateBlocks(value, context) } catch { return fail() }
}

export function createArchiveV2(input: { exam_sets: unknown; groups: unknown; questions: unknown }): ArchiveV2 {
  if (!Array.isArray(input.exam_sets) || !Array.isArray(input.groups) || !Array.isArray(input.questions)) return fail()
  const setIds = new Set<number>(), groupIds = new Set<number>(), passageGroups = new Map<number, number>(), positions = new Set<string>()
  const sets = input.exam_sets.map(raw => {
    if (!exact(raw, ['exam_number','title','format_code','publication_status']) || !positive(raw.exam_number) || raw.exam_number > configuration.exam.set_count || typeof raw.title !== 'string' || !raw.title.trim() || !['legacy_practice','group_practice','rekiken_mock'].includes(raw.format_code) || !status(raw.publication_status) || setIds.has(raw.exam_number)) return fail()
    setIds.add(raw.exam_number); return structuredClone(raw) as ArchiveSet
  })
  const groups = input.groups.map(raw => {
    if (!exact(raw, ['archive_id','exam_number','group_number','title','planned_question_count','publication_status','passages']) || !positive(raw.archive_id) || groupIds.has(raw.archive_id) || !setIds.has(raw.exam_number) || !positive(raw.group_number) || typeof raw.title !== 'string' || ![7,8].includes(raw.planned_question_count) || !status(raw.publication_status) || !Array.isArray(raw.passages)) return fail()
    const key = `${raw.exam_number}/${raw.group_number}`; if (positions.has(key)) return fail(); positions.add(key); groupIds.add(raw.archive_id)
    const labels = new Set<string>(), orders = new Set<number>()
    const passages = raw.passages.map((passage: unknown) => {
      if (!exact(passage, ['archive_id','label','display_order','content_blocks']) || !positive(passage.archive_id) || passageGroups.has(passage.archive_id) || typeof passage.label !== 'string' || !passage.label.trim() || labels.has(passage.label) || !positive(passage.display_order) || orders.has(passage.display_order)) return fail()
      const blocks = strictBlocks(passage.content_blocks, 'question')
      passageGroups.set(passage.archive_id, raw.archive_id); labels.add(passage.label); orders.add(passage.display_order)
      return { ...structuredClone(passage), content_blocks: blocks } as ArchivePassage
    })
    return { ...structuredClone(raw), passages } as ArchiveGroup
  })
  const coordinates = new Set<string>(), groupCoordinates = new Set<string>()
  const questions = input.questions.map(raw => {
    if (!object(raw) || Object.keys(raw).some(key => !questionKeys.includes(key)) || !setIds.has(raw.exam_number) || !positive(raw.question_number) || !Array.isArray(raw.choices)) return fail()
    strictBlocks(raw.content_blocks,'question'); strictBlocks(raw.explanation_blocks,'explanation')
    for (const choice of raw.choices) {
      if (!exact(choice,['choice_label','content_blocks','is_correct','display_order']) || !positive(choice.display_order)) return fail()
      strictBlocks(choice.content_blocks,'choice')
    }
    if (raw.source_references !== undefined && (!Array.isArray(raw.source_references) || raw.source_references.some((source: unknown) => !only(source,['kind','title','publisher','edition','publication_year','section','locator','url','checked_at'])))) return fail()
    if (raw.essay_config !== undefined && !only(raw.essay_config,['profile_id','profile_version','model_answer','profile_digest'])) return fail()
    if (raw.input_constraints !== undefined && !only(raw.input_constraints,['script','exact_length','max_length','hint'])) return fail()
    for (const [field,keys] of [['related_topics',['major_category_code','category_code']],['passage_references',['passage_id','anchor_id']]] as const) if (raw[field]!==undefined && (!Array.isArray(raw[field]) || raw[field].some((item: unknown)=>!exact(item,[...keys])))) return fail()
    let value: QuestionInput
    try { value = validateQuestionInput(raw) } catch { return fail() }
    const coordinate = `${value.exam_number}/${value.question_number}`; if (coordinates.has(coordinate)) return fail(); coordinates.add(coordinate)
    if (value.group_id != null) {
      const parent = groups.find(group => group.archive_id === value.group_id)
      if (!parent || parent.exam_number !== value.exam_number || sets.find(set=>set.exam_number===value.exam_number)?.format_code==='legacy_practice') return fail()
      const groupCoordinate=`${value.group_id}/${value.group_question_number}`;if(groupCoordinates.has(groupCoordinate))return fail();groupCoordinates.add(groupCoordinate)
      for (const ref of value.passage_references ?? []) {
        if (passageGroups.get(ref.passage_id) !== value.group_id) return fail()
        const passage=parent.passages.find(p=>p.archive_id===ref.passage_id)!
        if(ref.anchor_id!==null&&!passage.content_blocks.some((block:any)=>block.id===ref.anchor_id||(block.inlines??[]).some((part:any)=>part.id===ref.anchor_id)))return fail()
      }
    } else if (value.passage_references?.length) return fail()
    else if(sets.find(set=>set.exam_number===value.exam_number)?.format_code!=='legacy_practice')return fail()
    // Omit the new empty field so pre-essay v2 archives retain their checksum.
    if(value.answer_type!=='essay')delete value.essay_config
    return value as QuestionInput
  })
  for(const set of sets){
    const ownGroups=groups.filter(group=>group.exam_number===set.exam_number)
    if(set.format_code==='legacy_practice'&&ownGroups.length)return fail()
    if(set.publication_status==='published'&&set.format_code==='legacy_practice'){
      const visible=questions.filter(q=>q.exam_number===set.exam_number&&q.publication_status==='published')
      if(visible.length!==configuration.exam.questions_per_exam||Array.from({length:configuration.exam.questions_per_exam},(_,i)=>i+1).some(n=>!visible.some(q=>q.question_number===n)))return fail()
    }
    if(set.publication_status==='published'&&set.format_code!=='legacy_practice'){
      const visible=ownGroups.filter(group=>group.publication_status==='published');const rules=getExamFormat(configuration,set.format_code)
      if(visible.length!==rules.group_count)return fail()
      let total=0
      const coordinates:number[]=[]
      for(const [i,group] of [...visible].sort((a,b)=>a.group_number-b.group_number).entries()){
        const qs=questions.filter(q=>q.group_id===group.archive_id&&q.publication_status==='published')
        if(!group.title.trim()||qs.length!==group.planned_question_count||!rules.allowed_group_question_counts.includes(qs.length)||Array.from({length:qs.length},(_,n)=>n+1).some(n=>!qs.some(q=>q.group_question_number===n))||!group.passages.length)return fail()
        for(const passage of group.passages)try{validateBlocks(passage.content_blocks,'question',true)}catch{return fail()}
        if(set.format_code==='rekiken_mock'&&group.group_number!==i+1)return fail()
        coordinates.push(...qs.map(q=>q.question_number));total+=qs.length
      }
      if(rules.question_count!==undefined&&total!==rules.question_count)return fail()
      if(rules.question_count!==undefined&&Array.from({length:total},(_,i)=>i+1).some(n=>!coordinates.includes(n)))return fail()
    }
  }
  const body = { format: ARCHIVE_FORMAT, version: 2 as const, question_count: questions.length, choice_count: questions.reduce((count, question) => count + question.choices.length, 0), exam_sets: sets, groups, questions }
  return { ...body, sha256: digest(body) }
}

export function validateArchiveV2(value: unknown): ArchiveV2 {
  if (!exact(value, ['format','version','question_count','choice_count','sha256','exam_sets','groups','questions']) || value.format !== ARCHIVE_FORMAT || value.version !== 2) return fail()
  const archive = createArchiveV2(value)
  if (value.question_count !== archive.question_count || value.choice_count !== archive.choice_count || value.sha256 !== archive.sha256) return fail()
  return archive
}

export async function importArchiveV2(archive: ArchiveV2, db?: Database) {
  return transaction(async connection => {
    await query('SELECT pg_advisory_xact_lock($1)', [71514345], connection)
    await query('LOCK TABLE questions, question_choices, question_groups, group_passages IN SHARE ROW EXCLUSIVE MODE', [], connection)
    const [count] = await query<{ total: number }>('SELECT (SELECT count(*) FROM questions)+(SELECT count(*) FROM question_choices)+(SELECT count(*) FROM question_groups)+(SELECT count(*) FROM group_passages) AS total', [], connection)
    if (Number(count?.total) !== 0) throw new OperationError('大問・問題・選択肢が空のDBだけに取り込めます')
    const groupMap = new Map<number, number>(), passageMap = new Map<number, number>()
    for (const set of archive.exam_sets) {
      const before = await loadExamSet(set.exam_number, connection)
      await saveExamSet({ ...set, publication_status: 'draft', lock_version: before.lock_version }, { db: connection })
    }
    for (const group of archive.groups) {
      const saved = await createQuestionGroup(group.exam_number, { ...group, publication_status: 'draft', passages: group.passages.map(({ archive_id: _key, ...passage }) => passage) }, { db: connection })
      groupMap.set(group.archive_id, saved.id)
      for (const original of group.passages) {
        const mapped = saved.passages.find((passage: any) => passage.label === original.label)
        if (!mapped) return fail(); passageMap.set(original.archive_id, mapped.id)
      }
    }
    for (const question of archive.questions) await saveQuestion({ ...question,
      group_id: question.group_id == null ? null : groupMap.get(question.group_id),
      passage_references: (question.passage_references ?? []).map(ref => ({ ...ref, passage_id: passageMap.get(ref.passage_id)! })),
    }, { db: connection, requireCompleteExam: false })
    for (const group of archive.groups) {
      const saved = await loadQuestionGroup(groupMap.get(group.archive_id)!, connection)
      await saveQuestionGroup(saved.id, { ...saved, publication_status: group.publication_status }, { db: connection })
    }
    for (const set of archive.exam_sets) {
      const saved = await loadExamSet(set.exam_number, connection)
      // Restoring a snapshot must not publish draft siblings or draft questions.
      await saveExamSet({ ...set, lock_version: saved.lock_version }, { db: connection })
    }
    return { format: archive.format, version: 2, question_count: archive.question_count, choice_count: archive.choice_count, sha256: archive.sha256 }
  }, db)
}

/** Transport keys are deterministic and independent of local serial IDs. */
export async function exportArchiveV2(questions: any[], db: Database): Promise<ArchiveV2> {
  const sets = await query<ArchiveSet>('SELECT exam_number,title,format_code,publication_status FROM exam_sets ORDER BY exam_number', [], db)
  const groups = await query<any>('SELECT id,exam_number,group_number,title,planned_question_count,publication_status FROM question_groups ORDER BY exam_number,group_number,id', [], db)
  const groupMap = new Map(groups.map((group, i) => [Number(group.id), i + 1]))
  const passages = (await query<any>('SELECT id,group_id,label,display_order,content_blocks FROM group_passages ORDER BY group_id,display_order,id', [], db))
    .sort((a,b)=>groupMap.get(Number(a.group_id))!-groupMap.get(Number(b.group_id))!||Number(a.display_order)-Number(b.display_order))
  const passageMap = new Map(passages.map((passage, i) => [Number(passage.id), i + 1]))
  const archivedGroups = groups.map(group => ({ archive_id: groupMap.get(Number(group.id))!, exam_number: Number(group.exam_number), group_number: Number(group.group_number), title: group.title, planned_question_count: Number(group.planned_question_count), publication_status: group.publication_status,
    passages: passages.filter(passage => passage.group_id === group.id).map(passage => ({ archive_id: passageMap.get(Number(passage.id))!, label: passage.label, display_order: Number(passage.display_order), content_blocks: passage.content_blocks })) }))
  return createArchiveV2({ exam_sets: sets, groups: archivedGroups, questions: questions.map(question => ({ ...question, group_id: question.group_id == null ? null : groupMap.get(Number(question.group_id)), passage_references: (question.passage_references ?? []).map((ref: any) => ({ ...ref, passage_id: passageMap.get(Number(ref.passage_id)) })).sort((a:any,b:any)=>a.passage_id-b.passage_id||String(a.anchor_id??'').localeCompare(String(b.anchor_id??''))) })) })
}
