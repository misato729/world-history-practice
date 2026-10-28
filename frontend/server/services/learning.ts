import {getMethod,getQuery,readBody,setResponseStatus,type H3Event} from 'h3'
import {hasPaidAccess,type User} from '../core/auth.ts'
import {configuration,freeExamMax,paymentsEnabled} from '../core/config.ts'
import {getDatabase,query,transaction,type Database} from '../core/db.ts'
import {fail} from '../core/errors.ts'
import type {EssayGrade} from '../../shared/types/essay.ts'
import {gradeEssay} from './essay-scoring.ts'
import {essayRuleProfiles} from '../data/essay-rule-profiles.ts'
import {requireCurrentEssayProfile,hasUnsupportedEssayCharacters} from './essay-profile.ts'
import {excerptFrom,integer,sanitizeQuestionInput,normalizeAnswerText,checkTextConstraints,record} from './learning-validation.ts'
import {deleteQuestion,loadQuestion,saveQuestion,QUESTION_WRITE_LOCK,type ChoiceRecord,type QuestionRecord} from './learning-writer.ts'
import {loadExamSet,loadQuestionGroup,listExamSets,saveExamSet,createQuestionGroup,saveQuestionGroup,deleteQuestionGroup,validateExamSet,publishExamSet} from './learning-structure.ts'
export {saveQuestion,deleteQuestion,validateCompleteExam} from './learning-writer.ts'
export {validateQuestionInput} from './learning-validation.ts'
export type {QuestionInput} from './learning-validation.ts'
const notFound=():never=>fail(404,'not_found','対象が見つかりません')
const iso=(v:Date|string)=>new Date(v).toISOString()
const present=(v:unknown)=>v!==undefined&&v!==null&&v!==''
function requireUser(user:User|null):User{if(!user)return fail(401,'unauthorized','ログインが必要です');return user}
function checkAdmin(user:User|null):User{const current=requireUser(user);if(current.role!=='admin')fail(403,'forbidden','管理者権限が必要です');return current}
function idFrom(v:unknown):number{const id=integer(v);if(id===undefined||id<1)return notFound();return id}
function integerParam(v:unknown,name:string,min=1,max=Number.MAX_SAFE_INTEGER):number{const n=integer(v);if(n===undefined||n<min||n>max)return fail(400,'bad_request',`${name}を正しく指定してください`);return n}
function pagination(p:Record<string,unknown>){return {page:integerParam(present(p.page)?p.page:1,'page'),perPage:integerParam(present(p.per_page)?p.per_page:20,'per_page',1,100)}}
function meta(page:number,perPage:number,total:number,atLeastOne=false){return {current_page:page,per_page:perPage,total_count:total,total_pages:Math.max(atLeastOne?1:0,Math.ceil(total/perPage))}}
const serializeChoice=(c:ChoiceRecord)=>({id:Number(c.id),choice_label:c.choice_label,content_blocks:c.content_blocks,display_order:Number(c.display_order)})
export const questionVisibility=(alias='questions')=>`${alias}.publication_status='published' AND NOT EXISTS(SELECT 1 FROM exam_sets es WHERE es.exam_number=${alias}.exam_number AND es.publication_status<>'published') AND ((${alias}.group_id IS NULL AND NOT EXISTS(SELECT 1 FROM exam_sets shape WHERE shape.exam_number=${alias}.exam_number AND shape.format_code<>'legacy_practice')) OR (${alias}.group_id IS NOT NULL AND EXISTS(SELECT 1 FROM question_groups g JOIN exam_sets shape ON shape.exam_number=g.exam_number WHERE g.id=${alias}.group_id AND g.exam_number=${alias}.exam_number AND g.publication_status='published' AND shape.format_code<>'legacy_practice')))`
function questionFilters(params:Record<string,unknown>,conditions:string[],values:unknown[]){
 const major=params.major_category_code,category=params.category_code
 if(present(major)&&(typeof major!=='string'||!configuration.categories.major.some(v=>v.value===major)))fail(400,'bad_request','大分類を正しく指定してください')
 if(present(category)&&(typeof category!=='string'||!configuration.categories.minor.some(v=>v.value===category&&(!present(major)||v.major_category_value===major))))fail(400,'bad_request','小分類を正しく指定してください')
 const tc:string[]=[]
 for(const key of ['major_category_code','category_code'])if(present(params[key])){values.push(params[key]);tc.push(`t.${key}=$${values.length}`)}
 if(tc.length)conditions.push(`((${tc.map(part=>part.replace('t.','questions.')).join(' AND ')}) OR EXISTS(SELECT 1 FROM question_topic_links t WHERE t.question_id=questions.id AND ${tc.join(' AND ')}))`)
 const topic=params.history_topic??'all'
 if(typeof topic!=='string')fail(400,'bad_request','演習テーマを正しく指定してください')
 if(topic==='cultural_history')conditions.push('is_cultural_history=true')
 else if(topic!=='all'){
  const topics=[...new Set(topic.split(','))],allowed=new Set<string>(configuration.cultural_history_categories.map(v=>v.value))
  if(topics.some(value=>!allowed.has(value)))fail(400,'bad_request','演習テーマを正しく指定してください')
  values.push(topics);conditions.push('is_cultural_history=true',`cultural_history_category=ANY($${values.length}::text[])`)
 }
}
export async function authorizeExam(examNumber:number,user:User|null,db?:Database):Promise<void>{if(!paymentsEnabled||examNumber<=freeExamMax||await hasPaidAccess(user,db))return;if(user)fail(403,'paid_membership_required','この模擬試験の利用にはプレミアム会員資格が必要です');fail(401,'unauthorized','この模擬試験を利用するにはログインが必要です')}
async function visible(id:number,db:Database){const [row]=await query(`SELECT 1 FROM questions WHERE id=$1 AND ${questionVisibility()}`,[id],db);if(!row)return notFound()}
async function serializePublicQuestion(q:QuestionRecord,user:User|null,db:Database){
 const payload:Record<string,any>={id:q.id,exam_number:q.exam_number,question_number:q.question_number,content_blocks:q.content_blocks,major_category_code:q.major_category_code,category_code:q.category_code,is_cultural_history:q.is_cultural_history,is_art_history:q.is_art_history,cultural_history_category:q.cultural_history_category,choices:q.choices.map(serializeChoice),answer_type:q.answer_type,input_constraints:q.input_constraints,question_version:q.content_version,group_question_number:q.group_question_number,group:null,shared_passages:[],passage_references:q.passage_references}
 if(q.answer_type==='essay'){
  const profile=requireCurrentEssayProfile(q.essay_config)
  payload.essay_constraints={max_characters:profile.max_characters,required_terms:profile.required_terms}
 }
 if(q.group_id!==null){
  const group=await loadQuestionGroup(q.group_id,db);const qs=(group.questions??[]).filter(v=>v.publication_status==='published')
  payload.group={id:group.id,group_number:group.group_number,title:group.title,question_numbers:qs.map(v=>v.question_number)}
  const required=new Set(q.passage_references.map(r=>r.passage_id))
  payload.shared_passages=group.passages.filter(p=>required.has(p.id)).map(p=>({id:p.id,label:p.label,display_order:p.display_order,content_blocks:p.content_blocks}))
 }
 if(user){const allowed=await hasPaidAccess(user,db);const rows=allowed?await query('SELECT 1 FROM favorites WHERE user_id=$1 AND question_id=$2',[user.id,q.id],db):[];payload.is_favorite=allowed&&rows.length>0}
 return payload
}
export async function getQuestion(id:number,user:User|null,db:Database=getDatabase()){
 const q=await loadQuestion(id,db,{published:true});await visible(id,db);await authorizeExam(q.exam_number,user,db);return {data:await serializePublicQuestion(q,user,db)}
}
const questionDisplayOrder=(alias='questions')=>`COALESCE((SELECT g.group_number FROM question_groups g WHERE g.id=${alias}.group_id),0),COALESCE(${alias}.group_question_number,${alias}.question_number),${alias}.question_number`
const displayOrder=`exam_number,${questionDisplayOrder()}`
export async function nextQuestion(params:Record<string,unknown>,user:User|null,db:Database=getDatabase()){
 const values:unknown[]=[];const conditions=[questionVisibility()];questionFilters(params,conditions,values)
 let order=displayOrder
 if(present(params.exam_number)){
  const exam=integerParam(params.exam_number,'exam_number');await authorizeExam(exam,user,db);values.push(exam);conditions.push(`exam_number=$${values.length}`)
  if(present(params.question_number)){values.push(integerParam(params.question_number,'question_number'));conditions.push(`question_number=$${values.length}`)}
  else if(present(params.after_question_number)){
   const after=integerParam(params.after_question_number,'after_question_number',0)
   if(after>0){
    values.push(after);const cursor=`$${values.length}`
    // A visible cursor follows published display order; absent/private cursors retain the numeric compatibility boundary.
    conditions.push(`COALESCE((SELECT ROW(${questionDisplayOrder()})>ROW(${questionDisplayOrder('cursor_question')}) FROM questions cursor_question WHERE cursor_question.exam_number=questions.exam_number AND cursor_question.question_number=${cursor} AND ${questionVisibility('cursor_question')}),questions.question_number>${cursor})`)
   }
  }
 }else{
  if(present(params.after_question_number)||present(params.question_number))fail(400,'bad_request','exam_numberを指定してください')
  if(!await hasPaidAccess(user,db)){values.push(freeExamMax);conditions.push(`exam_number<=$${values.length}`)}
 }
 const base=`SELECT id FROM questions WHERE ${conditions.join(' AND ')}`;let rows:{id:number}[]=[]
 if(!present(params.exam_number)&&present(params.exclude_question_id)){const exclude=integerParam(params.exclude_question_id,'exclude_question_id');rows=await query(`${base} AND id<>$${values.length+1} ORDER BY ${order} LIMIT 1`,[...values,exclude],db)}
 if(!rows[0])rows=await query(`${base} ORDER BY ${order} LIMIT 1`,values,db)
 if(!rows[0])return notFound();return getQuestion(Number(rows[0].id),user,db)
}
function answerResult(q:QuestionRecord,row:{id?:number;answer_type:string;submitted_text?:string|null;selected_choice_id?:number|null;is_correct:boolean|null;essay_result?:EssayGrade|null}){
 const base={question_id:q.id,answer_type:row.answer_type,question_version:q.content_version,is_correct:row.is_correct,explanation_blocks:q.explanation_blocks,source_text:q.source_text,source_references:q.source_references,answer_history_id:row.id?Number(row.id):null}
 if(row.answer_type==='essay')return {...base,submitted_text:row.submitted_text,essay_result:row.essay_result??null,model_answer:q.essay_config&&'model_answer' in q.essay_config?q.essay_config.model_answer:''}
 return row.answer_type==='short_text'?{...base,submitted_text:row.submitted_text,correct_answer:q.accepted_answers[0]}:{...base,selected_choice_id:row.selected_choice_id,correct_choice:serializeChoice(q.choices.find(c=>c.is_correct)!)}
}
export async function answerQuestion(id:number,answer:unknown,user:User|null,db?:Database){
 return transaction(async connection=>{
  await query('SELECT pg_advisory_xact_lock($1)',[QUESTION_WRITE_LOCK],connection)
  const q=await loadQuestion(id,connection,{published:true,lock:true});await visible(id,connection);await authorizeExam(q.exam_number,user,connection)
  // Numeric calls remain an internal service compatibility form; HTTP always passes an object.
  const internal=typeof answer==='number';const body=record(answer)?answer:{selected_choice_id:answer}
  const typed=body.answer_type!==undefined||body.question_version!==undefined
  if(typed){
   if(body.answer_type!==q.answer_type||integer(body.question_version)!==q.content_version)fail(409,'content_conflict','問題が更新されています。再読込して回答してください')
  }else if(!internal&&(!q.legacy_answer_compatible||q.content_version!==1||q.answer_type!=='single_choice'))fail(409,'content_conflict','新しい回答形式で再読込してください')
  const submissionKey=body.submission_key
  if(typed&&(typeof submissionKey!=='string'||!/^[A-Za-z0-9:_-]{8,120}$/.test(submissionKey)))fail(422,'validation_error','回答の送信キーを確認してください')
  let selected:number|null=null,text:string|null=null,isCorrect:boolean|null=false,essayResult:EssayGrade|null=null
  if(q.answer_type==='short_text'){
   if(!q.accepted_answers.length)return notFound()
   if(typeof body.submitted_text!=='string'||!checkTextConstraints(body.submitted_text,q.input_constraints))fail(422,'validation_error','文字種・文字数の入力条件を確認してください',{submitted_text:['入力条件を満たす回答を入力してください']})
   text=body.submitted_text;isCorrect=q.accepted_answers.some(a=>normalizeAnswerText(a)===normalizeAnswerText(text!))
  }else if(q.answer_type==='essay'){
   const profile=requireCurrentEssayProfile(q.essay_config)
   if(typeof body.submitted_text!=='string'||!body.submitted_text.trim()||body.submitted_text.length>4000||hasUnsupportedEssayCharacters(body.submitted_text))fail(422,'validation_error','論述の回答を4000文字以内で入力してください',{submitted_text:['空でない回答を4000文字以内で入力してください']})
   text=body.submitted_text;essayResult=gradeEssay(profile,text);isCorrect=null
  }else{
   if(!q.choices.some(c=>c.is_correct))return notFound()
   const choice=q.choices.find(c=>c.id===integer(body.selected_choice_id));if(!choice)fail(422,'validation_error','選択肢を確認してください',{selected_choice_id:['この問題の選択肢を指定してください']})
   selected=choice.id;isCorrect=choice.is_correct
  }
  if(user&&typed){
   const [previous]=await query<any>('SELECT * FROM answer_histories WHERE user_id=$1 AND submission_key=$2',[user.id,submissionKey],connection)
   if(previous){if(previous.question_id!==id||previous.question_version!==q.content_version||previous.selected_choice_id!==selected||previous.submitted_text!==text)fail(409,'submission_conflict','同じ送信キーを別の回答には使用できません');return {data:answerResult(q,previous)}}
  }
  const [history]=user?await query<any>('INSERT INTO answer_histories(user_id,question_id,selected_choice_id,is_correct,answer_type,submitted_text,question_version,submission_key,essay_result,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,NOW(),NOW()) RETURNING *',[user.id,q.id,selected,isCorrect,q.answer_type,text,q.content_version,typed?submissionKey:null,essayResult?JSON.stringify(essayResult):null],connection):[]
  return {data:answerResult(q,history??{answer_type:q.answer_type,submitted_text:text,selected_choice_id:selected,is_correct:isCorrect,essay_result:essayResult})}
 },db)
}
export async function listExams(user:User|null,db:Database=getDatabase(),params:Record<string,unknown>={}){
 const values:unknown[]=[];const conditions=[questionVisibility()];questionFilters(params,conditions,values)
 const rows=await query<any>(`SELECT id,exam_number,question_number,group_id,group_question_number FROM questions WHERE ${conditions.join(' AND ')} ORDER BY ${displayOrder}`,values,db)
 const full=await hasPaidAccess(user,db);const result:any[]=[]
 for(const n of [...new Set(rows.map(q=>Number(q.exam_number)))]){
  const qs=rows.filter(q=>q.exam_number===n),set=await loadExamSet(n,db)
  result.push({exam_number:n,title:set.title,format_code:set.format_code,question_numbers:qs.map(q=>q.question_number),question_count:qs.length,published_question_count:qs.length,groups:set.groups.filter(g=>g.publication_status==='published'&&qs.some(q=>q.group_id===g.id)).map(g=>({id:g.id,group_number:g.group_number,title:g.title,question_numbers:qs.filter(q=>q.group_id===g.id).map(q=>q.question_number)})),access:!paymentsEnabled||n<=freeExamMax||full?'available':'paid_membership_required'})
 }
 return {data:result}
}
type HistoryRow={id:number;is_correct:boolean|null;essay_result:EssayGrade|null;answered_at:Date|string;question:QuestionRecord;selected_choice:ChoiceRecord|null;answer_type:string;submitted_text:string|null;question_version:number;visible:boolean}
const historySelect=`SELECT ah.id,ah.is_correct,ah.created_at AS answered_at,ah.answer_type,ah.submitted_text,ah.question_version,ah.essay_result,(to_jsonb(q) || jsonb_build_object('group_number',(SELECT group_number FROM question_groups WHERE id=q.group_id))) AS question,row_to_json(c) AS selected_choice,(${questionVisibility('q')}) AS visible FROM answer_histories ah JOIN questions q ON q.id=ah.question_id LEFT JOIN question_choices c ON c.id=ah.selected_choice_id`
function serializeHistory(row:HistoryRow,full:boolean){
 const q=row.question;const base={id:Number(row.id),question:{id:Number(q.id),exam_number:Number(q.exam_number),question_number:Number(q.question_number),group_id:q.group_id,group_question_number:q.group_question_number,group_number:(q as any).group_number??null},answered_at:iso(row.answered_at)}
 if(!row.visible||(q.exam_number>freeExamMax&&!full))return {...base,locked:true}
 if(row.answer_type==='essay')requireCurrentEssayProfile(q.essay_config)
 return {...base,locked:false,question:{...base.question,body_excerpt:excerptFrom(q.content_blocks),major_category_code:q.major_category_code,category_code:q.category_code},answer_type:row.answer_type,submitted_text:row.submitted_text,question_version:row.question_version,selected_choice:row.selected_choice?{id:Number(row.selected_choice.id),choice_label:row.selected_choice.choice_label,body_excerpt:excerptFrom(row.selected_choice.content_blocks)}:null,is_correct:row.is_correct,...(row.answer_type==='essay'?{essay_result:row.essay_result}: {})}
}
export async function listHistory(user:User|null,params:Record<string,unknown>,db:Database=getDatabase()){
 const current=requireUser(user);const {page,perPage}=pagination(params);const [count]=await query<any>('SELECT COUNT(*)::integer AS total FROM answer_histories WHERE user_id=$1',[current.id],db)
 const rows=await query<HistoryRow>(`${historySelect} WHERE ah.user_id=$1 ORDER BY ah.created_at DESC,ah.id DESC LIMIT $2 OFFSET $3`,[current.id,perPage,(page-1)*perPage],db);const full=await hasPaidAccess(current,db)
 return {data:rows.map(r=>serializeHistory(r,full)),meta:meta(page,perPage,count.total)}
}
export async function getHistory(id:number,user:User|null,db:Database=getDatabase()){
 const current=requireUser(user);const [row]=await query<HistoryRow>(`${historySelect} WHERE ah.id=$1 AND ah.user_id=$2`,[id,current.id],db);if(!row||!row.visible)return notFound()
 await authorizeExam(row.question.exam_number,current,db);const q=await loadQuestion(row.question.id,db)
 return {data:{id:Number(row.id),question:await serializePublicQuestion(q,current,db),answered_at:iso(row.answered_at),selected_choice:row.selected_choice?serializeChoice(row.selected_choice):null,...answerResult(q,{...row,selected_choice_id:row.selected_choice?.id})}}
}
type FavoriteRow={id:number;created_at:Date|string;question:QuestionRecord;visible:boolean}
function serializeFavorite(r:FavoriteRow,full:boolean){const q=r.question;const base={id:Number(r.id),question:{id:Number(q.id),exam_number:Number(q.exam_number),question_number:Number(q.question_number),group_id:q.group_id,group_question_number:q.group_question_number,group_number:(q as any).group_number??null},created_at:iso(r.created_at)};if(!r.visible||(q.exam_number>freeExamMax&&!full))return {...base,locked:true};return {...base,locked:false,question:{...base.question,body_excerpt:excerptFrom(q.content_blocks),major_category_code:q.major_category_code,category_code:q.category_code}}}
export async function listFavorites(user:User|null,params:Record<string,unknown>,db:Database=getDatabase()){
 const current=requireUser(user);if(!await hasPaidAccess(current,db))fail(403,'paid_membership_required','お気に入りの利用にはプレミアム会員資格が必要です')
 const {page,perPage}=pagination(params);const [count]=await query<any>(`SELECT COUNT(*)::integer AS total FROM favorites f JOIN questions q ON q.id=f.question_id WHERE f.user_id=$1 AND ${questionVisibility('q')}`,[current.id],db)
 const rows=await query<FavoriteRow>(`SELECT f.id,f.created_at,(to_jsonb(q) || jsonb_build_object('group_number',(SELECT group_number FROM question_groups WHERE id=q.group_id))) AS question,(${questionVisibility('q')}) AS visible FROM favorites f JOIN questions q ON q.id=f.question_id WHERE f.user_id=$1 AND ${questionVisibility('q')} ORDER BY f.created_at DESC,f.id DESC LIMIT $2 OFFSET $3`,[current.id,perPage,(page-1)*perPage],db)
 return {data:rows.map(r=>serializeFavorite(r,true)),meta:meta(page,perPage,count.total)}
}
export async function putFavorite(questionId:number,user:User|null,db?:Database){
 const current=requireUser(user);if(!await hasPaidAccess(current,db))fail(403,'paid_membership_required','お気に入りの利用にはプレミアム会員資格が必要です')
 return transaction(async connection=>{const q=await loadQuestion(questionId,connection,{published:true,lock:true});await visible(q.id,connection);await authorizeExam(q.exam_number,current,connection);const rows=await query<any>('INSERT INTO favorites(user_id,question_id,created_at,updated_at) VALUES($1,$2,NOW(),NOW()) ON CONFLICT(user_id,question_id) DO NOTHING RETURNING id,created_at',[current.id,q.id],connection);const row=rows[0]??(await query<any>('SELECT id,created_at FROM favorites WHERE user_id=$1 AND question_id=$2',[current.id,q.id],connection))[0];return {created:rows.length>0,data:serializeFavorite({...row,question:q,visible:true},true)}},db)
}
export async function removeFavorite(questionId:number,user:User|null,db?:Database){
 await transaction(async connection=>{const current=requireUser(user);if(!await hasPaidAccess(current,connection))fail(403,'paid_membership_required','お気に入りの利用にはプレミアム会員資格が必要です');await loadQuestion(questionId,connection,{published:true,lock:true});await visible(questionId,connection);await query('DELETE FROM favorites WHERE user_id=$1 AND question_id=$2',[current.id,questionId],connection)},db)
}
function serializeAdmin(q:QuestionRecord){return {...q,created_at:iso(q.created_at),updated_at:iso(q.updated_at)}}
export async function listAdminQuestions(user:User|null,params:Record<string,unknown>,db:Database=getDatabase()){
 checkAdmin(user);const conditions:string[]=[];const values:unknown[]=[];questionFilters(params,conditions,values)
 if(present(params.exam_number)){values.push(integerParam(params.exam_number,'exam_number'));conditions.push(`exam_number=$${values.length}`)}
 if(present(params.publication_status)){if(!['draft','published','private'].includes(String(params.publication_status)))fail(400,'bad_request','公開状態を確認してください');values.push(params.publication_status);conditions.push(`publication_status=$${values.length}`)}
 if(present(params.keyword)){if(typeof params.keyword!=='string')fail(400,'bad_request','keywordを正しく指定してください');values.push('%'+params.keyword.trim().replace(/[\\%_]/g,'\\$&')+'%');conditions.push(`content_blocks::text ILIKE $${values.length}`)}
 const where=conditions.length?` WHERE ${conditions.join(' AND ')}`:'';const [count]=await query<any>(`SELECT COUNT(*)::integer AS total FROM questions${where}`,values,db)
 const requestedPage=integer(params.page),requestedPerPage=integer(params.per_page);const perPage=Math.min(requestedPerPage&&requestedPerPage>0?requestedPerPage:20,100);const page=Math.min(requestedPage&&requestedPage>0?requestedPage:1,Math.max(1,Math.ceil(count.total/perPage)))
 const rows=await query<QuestionRecord>(`SELECT * FROM questions${where} ORDER BY ${displayOrder} LIMIT $${values.length+1} OFFSET $${values.length+2}`,[...values,perPage,(page-1)*perPage],db)
 return {data:rows.map(q=>({id:Number(q.id),exam_number:Number(q.exam_number),question_number:Number(q.question_number),summary:excerptFrom(q.content_blocks)||'表・プログラムを含む問題',major_category_code:q.major_category_code,category_code:q.category_code,is_cultural_history:q.is_cultural_history,is_art_history:q.is_art_history,cultural_history_category:q.cultural_history_category,publication_status:q.publication_status,group_id:q.group_id,group_question_number:q.group_question_number,answer_type:q.answer_type,updated_at:iso(q.updated_at)})),meta:meta(page,perPage,count.total,true)}
}
async function dispatchLearning(event:H3Event,parts:string[],user:User|null):Promise<unknown|undefined>{
 const method=getMethod(event),db=getDatabase()
 if(parts.length===1&&parts[0]==='exams'&&method==='GET')return listExams(user,db,getQuery(event))
 if(parts[0]==='exams'&&parts.length===3&&parts[2]==='groups'&&method==='GET'){const n=idFrom(parts[1]);await authorizeExam(n,user,db);const catalog=await listExams(user,db,{exam_number:n});const set=catalog.data.find(e=>e.exam_number===n);if(!set)return notFound();return {data:set.groups}}
 if(parts[0]==='questions'){
  if(parts.length===2&&parts[1]==='next'&&method==='GET')return nextQuestion(getQuery(event),user)
  if(parts.length===2&&method==='GET')return getQuestion(idFrom(parts[1]),user)
  if(parts.length===3&&parts[2]==='answer'&&method==='POST'){const body=await readBody<Record<string,unknown>>(event);return answerQuestion(idFrom(parts[1]),body,user)}
  if(parts.length===3&&parts[2]==='favorite'&&method==='PUT'){const result=await putFavorite(idFrom(parts[1]),user);setResponseStatus(event,result.created?201:200);return {data:result.data}}
  if(parts.length===3&&parts[2]==='favorite'&&method==='DELETE'){await removeFavorite(idFrom(parts[1]),user);setResponseStatus(event,204);return null}
 }
 if(parts[0]==='answer_histories'){if(parts.length===1&&method==='GET')return listHistory(user,getQuery(event));if(parts.length===2&&method==='GET')return getHistory(idFrom(parts[1]),user)}
 if(parts.length===1&&parts[0]==='favorites'&&method==='GET')return listFavorites(user,getQuery(event))
 if(parts[0]==='admin'){
  checkAdmin(user)
  if(parts.length===2&&parts[1]==='essay_profiles'&&method==='GET')return {data:essayRuleProfiles.map(({id,version,title,max_characters,required_terms,elements})=>({id,version,title,max_characters,required_terms,elements:elements.map(({id,label,points})=>({id,label,points}))}))}
  if(parts[1]==='exams'){
   if(parts.length===2&&method==='GET')return {data:await listExamSets(db)}
   const n=idFrom(parts[2]);if(n>configuration.exam.set_count)return notFound()
   if(parts.length===3&&method==='GET')return {data:await loadExamSet(n,db)}
   if(parts.length===3&&['PATCH','PUT'].includes(method)){const body=await readBody<any>(event);return {data:await saveExamSet({...body?.exam,exam_number:n})}}
   if(parts.length===4&&parts[3]==='groups'&&method==='POST'){const body=await readBody<any>(event);setResponseStatus(event,201);return {data:await createQuestionGroup(n,body?.group)}}
   if(parts.length===4&&parts[3]==='validate'&&method==='POST')return {data:await validateExamSet(n,db)}
   if(parts.length===4&&parts[3]==='publish'&&method==='POST'){const body=await readBody<any>(event);return {data:await publishExamSet(n,idFrom(body?.lock_version),{groupIds:body?.group_ids})}}
  }
  if(parts[1]==='question_groups'&&parts.length===3){const id=idFrom(parts[2]);if(method==='GET')return {data:await loadQuestionGroup(id,db)};if(['PUT','PATCH'].includes(method)){const body=await readBody<any>(event);return {data:await saveQuestionGroup(id,body?.group)}};if(method==='DELETE'){await deleteQuestionGroup(id);setResponseStatus(event,204);return null}}
  if(parts[1]==='questions'){
   if(parts.length===2&&method==='GET')return listAdminQuestions(user,getQuery(event))
   if(parts.length===3&&method==='GET')return {data:serializeAdmin(await loadQuestion(idFrom(parts[2]),db))}
   if((parts.length===2&&method==='POST')||(parts.length===3&&['PATCH','PUT'].includes(method))){const body=await readBody<any>(event);const saved=await saveQuestion(sanitizeQuestionInput(body?.question),{id:parts.length===3?idFrom(parts[2]):undefined,requireCompleteExam:true});setResponseStatus(event,parts.length===2?201:200);return {data:serializeAdmin(saved)}}
   if(parts.length===3&&method==='DELETE'){await deleteQuestion(idFrom(parts[2]));setResponseStatus(event,204);return null}
  }
 }
 return undefined
}

export async function handleLearning(event:H3Event,parts:string[],user:User|null):Promise<unknown|undefined>{
 try{return await dispatchLearning(event,parts,user)}catch(error){
  if(['23505','23503','23514'].includes((error as {code?:string}).code??''))fail(422,'validation_error','番号の重複・所属・参照関係を確認してください')
  throw error
 }
}
