import { isDeepStrictEqual } from 'node:util'
import { getExamFormat, type ExamConfiguration } from '../../shared/examConfig.ts'
import type { ExamFormatCode, GroupPassage, ExamSet, QuestionGroup, PassageReference } from '../../shared/types/learning.ts'
import { configuration } from '../core/config.ts'
import { query, transaction, type Database } from '../core/db.ts'
import { fail, ApiError } from '../core/errors.ts'
import { integer, nonblank, record, invalid, validateBlocks, validateQuestionInput } from './learning-validation.ts'
export const LEARNING_WRITE_LOCK=71514345
const notFound=():never=>fail(404,'not_found','対象が見つかりません')
const status=(v:unknown)=>typeof v==='string'&&['draft','published','private'].includes(v)
const version=(actual:number,expected:unknown)=>{if(integer(expected)!==Number(actual))fail(409,'content_conflict','別の変更が保存されています。再読込してください')}
const examNumberValid=(n:number,c:ExamConfiguration)=>{if(!Number.isSafeInteger(n)||n<1||n>c.exam.set_count)invalid('教材番号を確認してください')}
export async function ensureExamSet(examNumber:number,db:Database,published=false){
 await query("INSERT INTO exam_sets(exam_number,title,publication_status) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[examNumber,`教材 ${examNumber}`,published?'published':'draft'],db)
}
export async function loadQuestionGroup(id:number,db:Database):Promise<QuestionGroup & {affected_history_count:number;question_numbers:number[]}> {
 const [g]=await query<any>('SELECT * FROM question_groups WHERE id=$1',[id],db);if(!g)return notFound()
 const passages=await query<GroupPassage>('SELECT * FROM group_passages WHERE group_id=$1 ORDER BY display_order,id',[id],db)
 const questions=await query<any>(`SELECT q.*,
 COALESCE((SELECT jsonb_agg(c ORDER BY c.display_order) FROM question_choices c WHERE c.question_id=q.id),'[]'::jsonb) AS choices,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('major_category_code',t.major_category_code,'category_code',t.category_code)) FROM question_topic_links t WHERE t.question_id=q.id AND (t.major_category_code<>q.major_category_code OR t.category_code<>q.category_code)),'[]'::jsonb) AS related_topics,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('passage_id',r.passage_id,'anchor_id',r.anchor_id)) FROM question_passage_references r WHERE r.question_id=q.id),'[]'::jsonb) AS passage_references,
 (SELECT count(*)::integer FROM answer_histories h WHERE h.question_id=q.id) AS answer_history_count
 FROM questions q WHERE q.group_id=$1 ORDER BY q.group_question_number,q.id`,[id],db)
 return {...g,id:Number(g.id),exam_number:Number(g.exam_number),group_number:Number(g.group_number),planned_question_count:Number(g.planned_question_count),lock_version:Number(g.lock_version),passages,questions,question_numbers:questions.map(q=>Number(q.question_number)),affected_history_count:questions.reduce((s,q)=>s+q.answer_history_count,0)}
}
export async function loadExamSet(examNumber:number,db:Database):Promise<ExamSet>{
 const [e]=await query<any>('SELECT * FROM exam_sets WHERE exam_number=$1',[examNumber],db)
 const groups=await query<{id:number}>('SELECT id FROM question_groups WHERE exam_number=$1 ORDER BY group_number,id',[examNumber],db)
 return {...(e??{exam_number:examNumber,title:`教材 ${examNumber}`,format_code:'legacy_practice',publication_status:'draft',lock_version:1}),groups:await Promise.all(groups.map(g=>loadQuestionGroup(g.id,db)))}
}
export async function listExamSets(db:Database,config=configuration){const rows:ExamSet[]=[];for(let n=1;n<=config.exam.set_count;n++)rows.push(await loadExamSet(n,db));return rows}
export async function assertQuestionReferences(groupId:number|null,examNumber:number,refs:PassageReference[],db:Database,published=false){
 if(groupId===null){if(refs.length)invalid('大問未所属の小問は共通本文を参照できません');return}
 const [group]=await query<any>('SELECT * FROM question_groups WHERE id=$1 AND exam_number=$2',[groupId,examNumber],db)
 if(!group)return invalid('大問と教材の所属が一致しません')
 for(const ref of refs){
  const [p]=await query<any>('SELECT * FROM group_passages WHERE id=$1 AND group_id=$2',[ref.passage_id,groupId],db)
  if(!p)return invalid('共通本文の所属が一致しません')
  const blocks=validateBlocks(p.content_blocks,'question',published)
  if(ref.anchor_id!==null&&!blocks.some(b=>b.id===ref.anchor_id||(b.inlines??[]).some(i=>'id'in i&&i.id===ref.anchor_id)))return invalid('共通本文の参照先が見つかりません')
 }
}
function selectedGroups(set:ExamSet,publishedOnly=false,groupIds?:number[]){
 if(groupIds)return set.groups.filter(g=>groupIds.includes(g.id))
 const published=set.groups.filter(g=>g.publication_status==='published')
 if(publishedOnly)return published
 if(set.format_code==='group_practice'&&published.length)return published
 return set.groups.filter(g=>g.publication_status!=='private')
}
export async function validateExamSet(examNumber:number,db:Database,config=configuration,options:{publishedOnly?:boolean;groupIds?:number[]}={}):Promise<{valid:boolean;errors:string[]}>{
 const set=await loadExamSet(examNumber,db);const errors:string[]=[]
 if(set.format_code==='legacy_practice'){
  const rows=await query<any>(`SELECT * FROM questions WHERE exam_number=$1${options.publishedOnly?" AND publication_status='published'":" AND publication_status<>'private'"} ORDER BY question_number`,[examNumber],db)
  const missing=Array.from({length:config.exam.questions_per_exam},(_,i)=>i+1).filter(n=>!rows.some(q=>Number(q.question_number)===n))
  if(missing.length||rows.length!==config.exam.questions_per_exam)errors.push(`問1〜${config.exam.questions_per_exam}をそろえてください`)
  for(const row of rows)try{await validateStoredQuestion(row,db,config)}catch(e){errors.push(`問${row.question_number}: ${e instanceof ApiError?e.message:'入力を確認してください'}`)}
 }else{
  const [unassigned]=await query<any>("SELECT count(*)::integer AS total FROM questions WHERE exam_number=$1 AND group_id IS NULL AND publication_status='published'",[examNumber],db)
  if(unassigned.total)errors.push('公開中の未所属小問を大問へ所属させるか非公開にしてください')
  const rule=getExamFormat(config,set.format_code);const groups=selectedGroups(set,options.publishedOnly,options.groupIds)
  if(groups.length!==rule.group_count)errors.push(`大問は${rule.group_count}件必要です`)
  let total=0;const coordinates:number[]=[]
  for(const [index,g]of groups.entries()){
   if(!nonblank(g.title))errors.push(`大問${g.group_number}: タイトルが必要です`)
   if(set.format_code==='rekiken_mock'&&!options.groupIds&&g.group_number!==index+1)errors.push('大問番号は1から連続させてください')
   const qs=(g.questions??[]).filter((q:any)=>options.publishedOnly?q.publication_status==='published':q.publication_status!=='private')
   if(!rule.allowed_group_question_counts.includes(g.planned_question_count)||qs.length!==g.planned_question_count)errors.push(`大問${g.group_number}: ${g.planned_question_count}小問をそろえてください`)
   total+=qs.length
   for(const [i,q]of qs.entries()){
    coordinates.push(Number(q.question_number))
    if(q.group_question_number!==i+1)errors.push(`大問${g.group_number}: 小問番号は1から連続させてください`)
    try{await validateStoredQuestion(q,db,config)}catch(e){errors.push(`大問${g.group_number}・問${q.group_question_number}: ${e instanceof ApiError?e.message:'入力を確認してください'}`)}
   }
   if(!g.passages.length)errors.push(`大問${g.group_number}: 共通本文を登録してください`)
   for(const p of g.passages)try{validateBlocks(p.content_blocks,'question',true)}catch{errors.push(`大問${g.group_number}・本文${p.label}: 本文を完成させてください`)}
  }
  if(rule.question_count!==undefined&&total!==rule.question_count)errors.push(`小問の合計は${rule.question_count}問必要です`)
  if(new Set(coordinates).size!==coordinates.length)errors.push('小問の通し番号が重複しています')
  if(rule.question_count!==undefined&&(coordinates.some(n=>n<1||n>total)||coordinates.length!==total))errors.push('小問の通し番号を1から合計問数までそろえてください')
 }
 return {valid:errors.length===0,errors}
}
async function validateStoredQuestion(row:any,db:Database,config:ExamConfiguration){
 const choices=row.choices??await query<any>('SELECT * FROM question_choices WHERE question_id=$1 ORDER BY display_order',[row.id],db)
 const refs=row.passage_references??await query<PassageReference>('SELECT passage_id,anchor_id FROM question_passage_references WHERE question_id=$1 ORDER BY id',[row.id],db)
 const input=validateQuestionInput({...row,choices,passage_references:refs,publication_status:'published'},config)
 await assertQuestionReferences(input.group_id,input.exam_number,refs,db,true)
}
async function assertPublishedSet(examNumber:number,db:Database,config:ExamConfiguration){
 const set=await loadExamSet(examNumber,db)
 if(set.publication_status==='published'&&set.format_code!=='legacy_practice'){
  const result=await validateExamSet(examNumber,db,config,{publishedOnly:true})
  if(!result.valid)invalid('公開中の教材は完成状態で保存してください。未完成の編集は教材を非公開にしてから行ってください',{base:result.errors})
 }
}
export {assertPublishedSet}
type Options={db?:Database;config?:ExamConfiguration;groupIds?:number[]}
export async function saveExamSet(raw:unknown,options:Options={}):Promise<ExamSet>{
 const config=options.config??configuration
 if(!record(raw))return invalid('教材を指定してください')
 const n=integer(raw.exam_number);if(!n)return invalid('教材番号を確認してください');examNumberValid(n,config)
 if(!nonblank(raw.title)||!['legacy_practice','group_practice','rekiken_mock'].includes(raw.format_code)||!status(raw.publication_status))return invalid('教材のタイトル・形式・公開状態を確認してください')
 return transaction(async db=>{
  await query('SELECT pg_advisory_xact_lock($1)',[LEARNING_WRITE_LOCK],db)
  const [before]=await query<any>('SELECT * FROM exam_sets WHERE exam_number=$1 FOR UPDATE',[n],db)
  if(before)version(before.lock_version,raw.lock_version)
  if(before?.format_code!==raw.format_code&&raw.format_code==='legacy_practice'){
   const [count]=await query<any>('SELECT count(*)::integer AS total FROM question_groups WHERE exam_number=$1',[n],db);if(count.total)invalid('大問のある教材を従来形式へ変更できません')
  }
  await query(`INSERT INTO exam_sets(exam_number,title,format_code,publication_status) VALUES($1,$2,$3,$4)
   ON CONFLICT(exam_number) DO UPDATE SET title=EXCLUDED.title,format_code=EXCLUDED.format_code,publication_status=EXCLUDED.publication_status,lock_version=exam_sets.lock_version+1,updated_at=NOW()`,[n,raw.title.trim(),raw.format_code,raw.publication_status],db)
  if(raw.publication_status==='published'){const check=await validateExamSet(n,db,config,{publishedOnly:true});if(!check.valid)invalid('公開中の教材は完成状態で保存してください',{base:check.errors})}
  return loadExamSet(n,db)
 },options.db)
}
export async function createQuestionGroup(examNumber:number,raw:unknown,options:Options={}):Promise<QuestionGroup>{
 const config=options.config??configuration;examNumberValid(examNumber,config)
 if(!record(raw))return invalid('大問を指定してください')
 return transaction(async db=>{
  await query('SELECT pg_advisory_xact_lock($1)',[LEARNING_WRITE_LOCK],db);await ensureExamSet(examNumber,db)
  const set=await loadExamSet(examNumber,db);if(set.format_code==='legacy_practice')invalid('大問を追加する前に教材形式を選択してください')
  const n=integer(raw.group_number),planned=integer(raw.planned_question_count)
  if(!n||n<1||n>4||!planned||![7,8].includes(planned)||typeof raw.title!=='string')return invalid('大問番号・予定問数・タイトルを確認してください')
  const [g]=await query<any>("INSERT INTO question_groups(exam_number,group_number,title,planned_question_count,publication_status) VALUES($1,$2,$3,$4,'draft') RETURNING *",[examNumber,n,raw.title,planned],db)
  if(raw.passages?.length)return saveQuestionGroup(g.id,{...raw,publication_status:'draft',lock_version:g.lock_version},{db,config})
  return loadQuestionGroup(g.id,db)
 },options.db)
}
export async function saveQuestionGroup(id:number,raw:unknown,options:Options={}):Promise<QuestionGroup>{
 const config=options.config??configuration;if(!record(raw))return invalid('大問を指定してください')
 return transaction(async db=>{
  await query('SELECT pg_advisory_xact_lock($1)',[LEARNING_WRITE_LOCK],db)
  const before=await loadQuestionGroup(id,db);version(before.lock_version,raw.lock_version)
  const n=integer(raw.group_number??before.group_number),planned=integer(raw.planned_question_count??before.planned_question_count),title=raw.title??before.title,pub=raw.publication_status??before.publication_status
  if(!n||n<1||n>4||!planned||![7,8].includes(planned)||typeof title!=='string'||!status(pub))return invalid('大問の内容を確認してください')
  await query('UPDATE question_groups SET group_number=$1,title=$2,planned_question_count=$3,publication_status=$4,lock_version=lock_version+1,updated_at=NOW() WHERE id=$5',[n,title,planned,pub,id],db)
  const changedPassageIds:number[]=[]
  if(raw.passages!==undefined){
   if(!Array.isArray(raw.passages)||raw.passages.length>30)return invalid('共通本文を確認してください')
   const ids:number[]=[];const labels:string[]=[]
   // Temporary positive positions permit an atomic order swap under unique indexes.
   await query("UPDATE group_passages SET display_order=display_order+1000000,label='__editing_' || id WHERE group_id=$1",[id],db)
   for(const [index,p]of raw.passages.entries()){
    if(!record(p)||!nonblank(p.label)||labels.includes(p.label)||p.label.length>100)return invalid('共通本文のラベルを確認してください')
    labels.push(p.label);const blocks=validateBlocks(p.content_blocks,'question',false)
    if(p.id!==undefined){
     const previous=before.passages.find(v=>v.id===Number(p.id));if(!previous||ids.includes(previous.id))return invalid('共通本文IDと大問が一致しません')
     ids.push(previous.id)
     if(!isDeepStrictEqual(previous.content_blocks,blocks)||previous.label!==p.label)changedPassageIds.push(previous.id)
     await query('UPDATE group_passages SET label=$1,display_order=$2,content_blocks=$3::jsonb,updated_at=NOW() WHERE id=$4',[p.label,index+1,JSON.stringify(blocks),previous.id],db)
    }else{
     const [created]=await query<any>('INSERT INTO group_passages(group_id,label,display_order,content_blocks) VALUES($1,$2,$3,$4::jsonb) RETURNING id',[id,p.label,index+1,JSON.stringify(blocks)],db);ids.push(created.id)
    }
   }
   for(const previous of before.passages.filter(p=>!ids.includes(p.id))){
    const [refs]=await query<any>('SELECT count(*)::integer AS total FROM question_passage_references WHERE passage_id=$1',[previous.id],db)
    if(refs.total)invalid('参照されている共通本文は削除できません。先に小問の参照を解除してください')
    await query('DELETE FROM group_passages WHERE id=$1',[previous.id],db)
   }
   if(changedPassageIds.length){
    const affected=await query<{question_id:number}>('SELECT DISTINCT question_id FROM question_passage_references WHERE passage_id=ANY($1::bigint[])',[changedPassageIds],db)
    const qids=affected.map(q=>q.question_id)
    if(qids.length){
     await query('SELECT id FROM questions WHERE id=ANY($1::bigint[]) ORDER BY id FOR UPDATE',[qids],db)
     await query('DELETE FROM answer_histories WHERE question_id=ANY($1::bigint[])',[qids],db)
     await query('UPDATE questions SET content_version=content_version+1,lock_version=lock_version+1,legacy_answer_compatible=false,updated_at=NOW() WHERE id=ANY($1::bigint[])',[qids],db)
    }
   }
  }
  if(raw.question_ids!==undefined){
   const existing=(before.questions??[]).map(q=>Number(q.id));if(!Array.isArray(raw.question_ids))return invalid('小問の並べ替えは現在所属する全IDを指定してください')
   const ordered=raw.question_ids.map((q:unknown)=>integer(q))
   if(ordered.length!==existing.length||new Set(ordered).size!==existing.length||ordered.some(q=>q===undefined||!existing.includes(q)))return invalid('小問の並べ替えは現在所属する全IDを指定してください')
   await query('UPDATE questions SET group_question_number=group_question_number+1000000 WHERE group_id=$1',[id],db)
   for(const [index,qid]of ordered.entries())await query('UPDATE questions SET group_question_number=$1,lock_version=lock_version+1,updated_at=NOW() WHERE id=$2',[index+1,qid],db)
  }
  const after=await loadQuestionGroup(id,db)
  for(const q of after.questions??[])await assertQuestionReferences(id,before.exam_number,q.passage_references??[],db,q.publication_status==='published'&&after.publication_status==='published')
  await assertPublishedSet(before.exam_number,db,config)
  return after
 },options.db)
}
export async function deleteQuestionGroup(id:number,options:Options={}){
 return transaction(async db=>{
  await query('SELECT pg_advisory_xact_lock($1)',[LEARNING_WRITE_LOCK],db);const g=await loadQuestionGroup(id,db)
  if(g.questions?.length||g.publication_status==='published'){
   await query("UPDATE question_groups SET publication_status='private',lock_version=lock_version+1,updated_at=NOW() WHERE id=$1",[id],db)
   if(g.publication_status==='published')await query("UPDATE exam_sets SET publication_status='private',lock_version=lock_version+1,updated_at=NOW() WHERE exam_number=$1 AND publication_status='published'",[g.exam_number],db)
  }else{await query('DELETE FROM group_passages WHERE group_id=$1',[id],db);await query('DELETE FROM question_groups WHERE id=$1',[id],db)}
 },options.db)
}
export async function publishExamSet(examNumber:number,expectedLockVersion:number,options:Options={}):Promise<ExamSet>{
 const config=options.config??configuration
 return transaction(async db=>{
  await query('SELECT pg_advisory_xact_lock($1)',[LEARNING_WRITE_LOCK],db)
  const set=await loadExamSet(examNumber,db);version(set.lock_version,expectedLockVersion)
  if(options.groupIds&&(!Array.isArray(options.groupIds)||set.format_code==='legacy_practice'||new Set(options.groupIds).size!==options.groupIds.length||options.groupIds.some(id=>!Number.isSafeInteger(id)||!set.groups.some(g=>g.id===id))))invalid('公開対象の大問IDを確認してください')
  const result=await validateExamSet(examNumber,db,config,{groupIds:options.groupIds})
  if(!result.valid)invalid('公開条件を確認してください',{base:result.errors})
  const groups=selectedGroups(set,false,options.groupIds)
  if(set.format_code==='legacy_practice')await query("UPDATE questions SET publication_status='published',answer_type_locked=true,lock_version=lock_version+1,updated_at=NOW() WHERE exam_number=$1 AND publication_status<>'private'",[examNumber],db)
  else{
   const ids=groups.map(g=>g.id)
   if(options.groupIds)await query("UPDATE question_groups SET publication_status='private',lock_version=lock_version+1,updated_at=NOW() WHERE exam_number=$1 AND publication_status='published' AND NOT(id=ANY($2::bigint[]))",[examNumber,ids],db)
   await query("UPDATE question_groups SET publication_status='published',lock_version=lock_version+1,updated_at=NOW() WHERE id=ANY($1::bigint[])",[ids],db)
   await query("UPDATE questions SET publication_status='published',answer_type_locked=true,lock_version=lock_version+1,updated_at=NOW() WHERE group_id=ANY($1::bigint[]) AND publication_status<>'private'",[ids],db)
  }
  await query("UPDATE exam_sets SET publication_status='published',lock_version=lock_version+1,updated_at=NOW() WHERE exam_number=$1",[examNumber],db)
  await assertPublishedSet(examNumber,db,config)
  return loadExamSet(examNumber,db)
 },options.db)
}
