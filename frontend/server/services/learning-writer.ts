import { createHash } from 'node:crypto'
import type { ExamConfiguration } from '../../shared/examConfig.ts'
import { configuration } from '../core/config.ts'
import { query,transaction,type Database } from '../core/db.ts'
import { fail } from '../core/errors.ts'
import {validateQuestionInput,type ChoiceInput,type QuestionInput,type NormalizedQuestionInput} from './learning-validation.ts'
import {LEARNING_WRITE_LOCK,ensureExamSet,assertQuestionReferences,assertPublishedSet,loadExamSet,validateExamSet} from './learning-structure.ts'
export type {QuestionInput,ChoiceInput} from './learning-validation.ts'
export {loadExamSet,saveExamSet,createQuestionGroup,saveQuestionGroup,loadQuestionGroup,validateExamSet,publishExamSet,deleteQuestionGroup,listExamSets} from './learning-structure.ts'
export type ChoiceRecord=ChoiceInput&{id:number;question_id:number}
export type QuestionRecord=Omit<NormalizedQuestionInput,'choices'>&{
 id:number;created_at:Date|string;updated_at:Date|string;choices:ChoiceRecord[]
 content_version:number;lock_version:number;legacy_answer_compatible:boolean;answer_type_locked:boolean;answer_history_count?:number
}
export const QUESTION_WRITE_LOCK=LEARNING_WRITE_LOCK
const notFound=():never=>fail(404,'not_found','対象が見つかりません')
function canonical(v:unknown):unknown{if(Array.isArray(v))return v.map(canonical);if(v!==null&&typeof v==='object')return Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)]));return v}
/** Placement, classification and visibility do not alter an answer's meaning. */
export function materialDigest(q:QuestionInput|QuestionRecord):string{
 return createHash('sha256').update(JSON.stringify(canonical({content_blocks:q.content_blocks,explanation_blocks:q.explanation_blocks,source_text:q.source_text,
 source_references:q.source_references??[],answer_type:q.answer_type??'single_choice',accepted_answers:q.accepted_answers??[],input_constraints:q.input_constraints??{},
 essay_config:q.essay_config??{},group_id:q.group_id??null,passage_references:q.passage_references??[],
 choices:q.choices.map(c=>({choice_label:c.choice_label,content_blocks:c.content_blocks,is_correct:c.is_correct,display_order:c.display_order}))}))).digest('hex')
}
export async function loadQuestion(id:number,db:Database,options:{published?:boolean;lock?:boolean}={}):Promise<QuestionRecord>{
 const [row]=await query<any>(`SELECT * FROM questions WHERE id=$1${options.published?" AND publication_status='published'":''}${options.lock?' FOR UPDATE':''}`,[id],db);if(!row)return notFound()
 const choices=await query<ChoiceRecord>('SELECT id,question_id,choice_label,content_blocks,is_correct,display_order FROM question_choices WHERE question_id=$1 ORDER BY display_order',[id],db)
 const related=await query<any>('SELECT major_category_code,category_code FROM question_topic_links WHERE question_id=$1 AND (major_category_code<>$2 OR category_code<>$3) ORDER BY category_code',[id,row.major_category_code,row.category_code],db)
 const refs=await query<any>('SELECT passage_id,anchor_id FROM question_passage_references WHERE question_id=$1 ORDER BY id',[id],db)
 const [count]=await query<any>('SELECT count(*)::integer AS total FROM answer_histories WHERE question_id=$1',[id],db)
 return {...row,id:Number(row.id),exam_number:Number(row.exam_number),question_number:Number(row.question_number),content_version:Number(row.content_version),lock_version:Number(row.lock_version),related_topics:related,passage_references:refs,answer_history_count:count.total,choices:choices.map(c=>({...c,id:Number(c.id),question_id:Number(c.question_id),display_order:Number(c.display_order)}))}
}
export async function validateCompleteExam(examNumber:number,db:Database,config:ExamConfiguration=configuration,current?:{id?:number;question_number:number}):Promise<void>{
 const set=await loadExamSet(examNumber,db)
 if(set.format_code!=='legacy_practice'){
  const report=await validateExamSet(examNumber,db,config,{publishedOnly:true});if(!report.valid)fail(422,'validation_error','公開条件を確認してください',{base:report.errors});return
 }
 const values:unknown[]=[examNumber];if(current?.id!==undefined)values.push(current.id)
 // An individual publication may count only peers that are already public.
 // Archive imports call without a candidate and retain their legacy contract.
 const rows=await query<{question_number:number}>(`SELECT question_number FROM questions WHERE exam_number=$1${current?" AND publication_status='published' AND group_id IS NULL":''}${current?.id===undefined?'':' AND id<>$2'}`,values,db)
 const registered=new Set(rows.map(r=>Number(r.question_number)));if(current)registered.add(current.question_number)
 const missing=Array.from({length:config.exam.questions_per_exam},(_,i)=>i+1).filter(n=>!registered.has(n))
 if(missing.length)fail(422,'validation_error',`模擬試験${examNumber}を公開するには問1〜${config.exam.questions_per_exam}の登録が必要です。不足：${missing.map(n=>`問${n}`).join('、')}`,{base:['公開する試験セットの問題数が不足しています']})
}
type SaveOptions={id?:number;db?:Database;requireCompleteExam?:boolean;config?:ExamConfiguration}
async function finishLegacyPublication(input:NormalizedQuestionInput,db:Database,config:ExamConfiguration,requireCompleteExam:boolean){
 if(input.group_id!==null||input.publication_status!=='published')return
 if(requireCompleteExam){
  const report=await validateExamSet(input.exam_number,db,config,{publishedOnly:true})
  if(!report.valid)fail(422,'validation_error','公開条件を確認してください',{base:report.errors})
 }
 await query("UPDATE exam_sets SET publication_status='published',lock_version=lock_version+1,updated_at=NOW() WHERE exam_number=$1 AND format_code='legacy_practice' AND publication_status='draft'",[input.exam_number],db)
}
export async function saveQuestion(raw:QuestionInput,options:SaveOptions={}):Promise<QuestionRecord>{
 const config=options.config??configuration;const input=validateQuestionInput(raw,config)
 try{return await transaction(async db=>{
  await query('SELECT pg_advisory_xact_lock($1)',[QUESTION_WRITE_LOCK],db)
  const before=options.id===undefined?undefined:await loadQuestion(options.id,db,{lock:true})
  if(before&&input.lock_version!==undefined&&input.lock_version!==before.lock_version)fail(409,'content_conflict','別の変更が保存されています。再読込してください')
  if(before&&(before.group_id!==null||input.group_id!==null)&&input.lock_version===undefined)fail(409,'content_conflict','編集バージョンを確認して再読込してください')
  if(before&&before.answer_type!==input.answer_type&&(before.answer_type_locked||before.publication_status!=='draft'))fail(422,'validation_error','公開済み問題の回答形式は新しい小問として登録してください')
  for(const c of input.choices)if(c.id!==undefined&&!before?.choices.some(p=>p.id===c.id&&p.choice_label===c.choice_label))fail(422,'validation_error','選択肢IDと問題・ラベルが一致しません')
  await ensureExamSet(input.exam_number,db,input.group_id===null&&input.publication_status==='published'&&options.requireCompleteExam!==true)
  const set=await loadExamSet(input.exam_number,db)
  if(input.group_id===null&&set.format_code!=='legacy_practice'&&input.publication_status==='published')fail(422,'validation_error','大問形式の教材では小問を大問に所属させてください')
  if(input.group_id!==null&&set.format_code==='legacy_practice')fail(422,'validation_error','従来形式の教材に大問を所属させられません')
  await assertQuestionReferences(input.group_id,input.exam_number,input.passage_references,db,input.publication_status==='published')
  if(input.publication_status==='published'&&options.requireCompleteExam&&set.format_code==='legacy_practice')await validateCompleteExam(input.exam_number,db,config,{id:options.id,question_number:input.question_number})
  if(before&&materialDigest(before)===materialDigest(input)){
   const metadata=(q:QuestionInput)=>canonical({exam_number:q.exam_number,question_number:q.question_number,major_category_code:q.major_category_code,category_code:q.category_code,group_question_number:q.group_question_number??null,publication_status:q.publication_status,is_cultural_history:q.is_cultural_history,is_art_history:q.is_art_history,cultural_history_category:q.cultural_history_category,related_topics:[...(q.related_topics??[])].sort((a,b)=>a.category_code.localeCompare(b.category_code))})
   if(JSON.stringify(metadata(before))===JSON.stringify(metadata(input))&&(input.publication_status!=='published'||before.answer_type_locked)){await finishLegacyPublication(input,db,config,options.requireCompleteExam===true);return before}
  }
  const values:unknown[]=[input.exam_number,input.question_number,input.major_category_code,input.category_code,JSON.stringify(input.content_blocks),JSON.stringify(input.explanation_blocks),input.source_text,input.publication_status,input.is_cultural_history,input.is_art_history,input.cultural_history_category,input.group_id,input.group_question_number,input.answer_type,JSON.stringify(input.accepted_answers),JSON.stringify(input.input_constraints),JSON.stringify(input.source_references),JSON.stringify(input.essay_config)]
  let id:number;const changed=before?materialDigest(before)!==materialDigest(input):false
  if(before){
   values.push(changed,before.id)
   await query(`UPDATE questions SET exam_number=$1,question_number=$2,major_category_code=$3,category_code=$4,content_blocks=$5::jsonb,explanation_blocks=$6::jsonb,source_text=$7,publication_status=$8::varchar,is_cultural_history=$9,is_art_history=$10,cultural_history_category=$11,group_id=$12,group_question_number=$13,answer_type=$14,accepted_answers=$15::jsonb,input_constraints=$16::jsonb,source_references=$17::jsonb,essay_config=$18::jsonb,content_version=content_version+CASE WHEN $19 THEN 1 ELSE 0 END,legacy_answer_compatible=legacy_answer_compatible AND NOT $19,answer_type_locked=answer_type_locked OR $8::varchar='published'::varchar,lock_version=lock_version+1,updated_at=NOW() WHERE id=$20`,values,db)
   id=before.id;if(changed)await query('DELETE FROM answer_histories WHERE question_id=$1',[id],db)
  }else{
   const [row]=await query<{id:number}>(`INSERT INTO questions(exam_number,question_number,major_category_code,category_code,content_blocks,explanation_blocks,source_text,publication_status,is_cultural_history,is_art_history,cultural_history_category,group_id,group_question_number,answer_type,accepted_answers,input_constraints,source_references,essay_config,created_at,updated_at,legacy_answer_compatible,answer_type_locked) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::varchar,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17::jsonb,$18::jsonb,NOW(),NOW(),false,$8::varchar='published'::varchar) RETURNING id`,values,db);id=row!.id
  }
  const oldChoices=before?.choices??[]
  if(input.answer_type!=='single_choice'&&oldChoices.length)await query('DELETE FROM question_choices WHERE question_id=$1',[id],db)
  else if(input.answer_type==='single_choice'&&(!before||JSON.stringify(canonical(oldChoices.map(c=>({choice_label:c.choice_label,content_blocks:c.content_blocks,is_correct:c.is_correct,display_order:c.display_order}))))!==JSON.stringify(canonical(input.choices.map(c=>({choice_label:c.choice_label,content_blocks:c.content_blocks,is_correct:c.is_correct,display_order:c.display_order})))))){
   // Never replace an existing choice merely to edit its contents.
   await query('UPDATE question_choices SET is_correct=false WHERE question_id=$1',[id],db)
   for(const c of input.choices)await query(`INSERT INTO question_choices(question_id,choice_label,content_blocks,is_correct,display_order,created_at,updated_at) VALUES($1,$2,$3::jsonb,$4,$5,NOW(),NOW()) ON CONFLICT(question_id,choice_label) DO UPDATE SET content_blocks=EXCLUDED.content_blocks,is_correct=EXCLUDED.is_correct,display_order=EXCLUDED.display_order,updated_at=NOW()`,[id,c.choice_label,JSON.stringify(c.content_blocks),c.is_correct,c.display_order],db)
   // Partial drafts may omit newly added rows, but never erase saved choice IDs.
   if(before&&oldChoices.some(old=>!input.choices.some(c=>c.choice_label===old.choice_label)))fail(422,'validation_error','保存済みの選択肢を省略しないでください')
  }
  await query('DELETE FROM question_topic_links WHERE question_id=$1',[id],db)
  const topics=[{major_category_code:input.major_category_code,category_code:input.category_code},...input.related_topics]
  for(const t of topics)await query('INSERT INTO question_topic_links(question_id,major_category_code,category_code) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[id,t.major_category_code,t.category_code],db)
  await query('DELETE FROM question_passage_references WHERE question_id=$1',[id],db)
  for(const r of input.passage_references)await query('INSERT INTO question_passage_references(question_id,passage_id,anchor_id) VALUES($1,$2,$3)',[id,r.passage_id,r.anchor_id],db)
  await finishLegacyPublication(input,db,config,options.requireCompleteExam===true)
  if(options.requireCompleteExam!==false)await assertPublishedSet(input.exam_number,db,config)
  if(before&&before.exam_number!==input.exam_number&&options.requireCompleteExam!==false)await assertPublishedSet(before.exam_number,db,config)
  return loadQuestion(id,db)
 },options.db)}catch(error){if((error as {code?:string}).code==='23505')fail(422,'validation_error','問題番号・大問内小問番号が既に使用されています',{question_number:['は同じ教材または大問で既に使用されています']});throw error}
}
export async function deleteQuestion(id:number,db?:Database):Promise<void>{
 await transaction(async connection=>{
  await query('SELECT pg_advisory_xact_lock($1)',[QUESTION_WRITE_LOCK],connection)
  const q=await loadQuestion(id,connection,{lock:true})
  await query('DELETE FROM answer_histories WHERE question_id=$1',[id],connection)
  await query('DELETE FROM questions WHERE id=$1',[id],connection)
  if(q.group_id!==null&&q.publication_status==='published')await query("UPDATE exam_sets SET publication_status='private',lock_version=lock_version+1,updated_at=NOW() WHERE exam_number=$1 AND publication_status='published' AND EXISTS(SELECT 1 FROM question_groups g WHERE g.id=$2 AND g.publication_status='published')",[q.exam_number,q.group_id],connection)
 },db)
}
