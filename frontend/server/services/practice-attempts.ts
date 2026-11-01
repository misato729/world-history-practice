import {createHash,randomUUID,createHmac,timingSafeEqual} from 'node:crypto'
import {getMethod,readBody,type H3Event} from 'h3'
import {query,transaction,type Database} from '../core/db.ts'
import {configuration,secretKey} from '../core/config.ts'
import type {User} from '../core/auth.ts'
import {fail} from '../core/errors.ts'
import {authorizeExam,questionVisibility,answerQuestion} from './learning.ts'
import {QUESTION_WRITE_LOCK} from './learning-writer.ts'
import {requireCurrentEssayProfile} from './essay-profile.ts'
import {ESSAY_SCORING_ENGINE_VERSION} from './essay-scoring.ts'
import type {AttemptManifest,AttemptItem,PracticeAttempt,AttemptAnswer} from '../../shared/types/practiceAttempt.ts'
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
const scoring=()=>configuration.exam.scoring??{version:1,single_choice:3,short_text:3,essay:8}
const scoringVersion=()=>{const s=scoring();return digest({scoring:[s.version,s.single_choice,s.short_text,s.essay],engine:ESSAY_SCORING_ENGINE_VERSION})}
const missing=():never=>fail(404,'not_found','対象が見つかりません')
const invalid=():never=>fail(409,'attempt_invalidated','問題が更新されたため、この回の点数は表示できません。新しい回として始めてください')
const validId=(id:unknown):id is string=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
const lock=async(db:Database)=>{await query('SELECT pg_advisory_xact_lock($1)',[QUESTION_WRITE_LOCK],db)}
async function publicItems(exams:number[],user:User|null,db:Database,selected?:Set<string>):Promise<AttemptItem[]>{
 for(const exam of exams)await authorizeExam(exam,user,db)
 const rows=await query<any>(`SELECT questions.*,g.group_number FROM questions LEFT JOIN question_groups g ON g.id=questions.group_id WHERE questions.exam_number=ANY($1::integer[]) AND ${questionVisibility()} ORDER BY questions.exam_number,COALESCE(g.group_number,0),COALESCE(questions.group_question_number,questions.question_number)`,[exams],db)
 return rows.map(q=>{
  if(q.answer_type==='essay' && (!selected || selected.has(`${q.exam_number}:${q.question_number}`))) { const profile=requireCurrentEssayProfile(q.essay_config);if(profile.elements.reduce((n,e)=>n+e.points,0)!==scoring().essay)fail(409,'content_conflict','論述の参考配点と採点基準を確認してください') }
  return {id:q.id,exam_number:q.exam_number,question_number:q.question_number,question_version:q.content_version,group_id:q.group_id,group_number:q.group_number??null,group_question_number:q.group_question_number,answer_type:q.answer_type,points:scoring()[q.answer_type as 'single_choice'|'short_text'|'essay'],profile_digest:q.answer_type==='essay'?q.essay_config.profile_digest:null}
 })
}
function matchesItem(a:AttemptItem,b:AttemptItem){return a.id===b.id&&a.question_version===b.question_version&&a.exam_number===b.exam_number&&a.question_number===b.question_number&&a.group_id===b.group_id&&a.answer_type===b.answer_type&&a.points===b.points&&a.profile_digest===b.profile_digest}
async function validate(manifest:AttemptManifest,user:User|null,db:Database){
 if(manifest.scoring_version!==scoringVersion())invalid()
 const fresh=await publicItems([...new Set(manifest.items.map(q=>q.exam_number))],user,db,new Set(manifest.items.map(q=>`${q.exam_number}:${q.question_number}`)))
 if(manifest.items.some(old=>!fresh.some(q=>matchesItem(old,q))))invalid()
 for(const exam of manifest.full_exams){
  const before=manifest.items.filter(q=>q.exam_number===exam).map(q=>q.id).sort((a,b)=>a-b)
  const after=fresh.filter(q=>q.exam_number===exam).map(q=>q.id).sort((a,b)=>a-b)
  if(digest(before)!==digest(after))invalid()
 }
}
export async function startAttempt(raw:any,user:User|null,db?:Database){return transaction(async connection=>{
 await lock(connection)
 const positions=raw?.positions
 if(!Array.isArray(positions)||!positions.length||positions.length>500||positions.some(p=>!p||!Number.isInteger(p.examNumber)||p.examNumber<1||p.examNumber>configuration.exam.set_count||!Number.isInteger(p.questionNumber)||p.questionNumber<1)||new Set(positions.map(p=>`${p.examNumber}:${p.questionNumber}`)).size!==positions.length)fail(422,'validation_error','演習する問題を確認してください')
 const exams=[...new Set<number>(positions.map(p=>p.examNumber))]
 const available=await publicItems(exams,user,connection,new Set(positions.map(p=>`${p.examNumber}:${p.questionNumber}`)))
 const items=positions.map(p=>available.find(q=>q.exam_number===p.examNumber&&q.question_number===p.questionNumber)??missing())
 const full_exams=exams.filter(exam=>{
  const own=items.filter(q=>q.exam_number===exam),all=available.filter(q=>q.exam_number===exam)
  return own.length===30&&all.length===30&&new Set(own.map(q=>q.group_id).filter(Boolean)).size===4&&own.filter(q=>q.answer_type==='single_choice').length===20&&own.filter(q=>q.answer_type==='short_text').length===8&&own.filter(q=>q.answer_type==='essay').length===2
 })
 const manifest:AttemptManifest={items,scoring_version:scoringVersion(),full_exams}
 const attempt:PracticeAttempt={id:randomUUID(),guest:!user,status:'active',manifest,answers:{},started_at:new Date().toISOString(),completed_at:null}
 if(user)await query('INSERT INTO practice_attempts(id,user_id,exams,manifest) VALUES($1,$2,$3,$4::jsonb)',[attempt.id,user.id,exams,JSON.stringify(manifest)],connection)
 return {data:attempt,...(!user?{guest_manifest:seal(manifest)}:{})}
},db)}
function seal(manifest:AttemptManifest){const data=Buffer.from(JSON.stringify({manifest})).toString('base64url');return data+'.'+createHmac('sha256',secretKey()).update(data).digest('hex')}
function unseal(raw:unknown):AttemptManifest{
 try{if(typeof raw!=='string'||raw.length>200000)throw Error();const [data,sig]=raw.split('.');const expected=createHmac('sha256',secretKey()).update(data!).digest('hex');if(!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw Error();const v=JSON.parse(Buffer.from(data!,'base64url').toString());return v.manifest}catch{return invalid()}
}
export async function validateGuest(raw:unknown,db?:Database){return transaction(async c=>{await lock(c);await validate(unseal(raw),null,c);return {data:{valid:true}}},db)}
async function load(id:unknown,user:User|null,db:Database){
 if(!user)fail(401,'unauthorized','ログインが必要です')
 if(!validId(id))missing()
 const [row]=await query<any>('SELECT * FROM practice_attempts WHERE id=$1 AND user_id=$2 FOR UPDATE',[id,user!.id],db)
 if(!row)missing()
 if(row.status==='invalidated')invalid()
 await validate(row.manifest,user,db)
 return row
}
function present(row:any):PracticeAttempt{return {id:row.id,status:row.status,guest:false,manifest:row.manifest,answers:Object.fromEntries(Object.entries(row.answers).map(([id,value])=>[id,(value as any).result])),started_at:new Date(row.started_at).toISOString(),completed_at:row.completed_at?new Date(row.completed_at).toISOString():null}}
export async function getAttempt(id:unknown,user:User|null,db?:Database){return transaction(async c=>{await lock(c);return {data:present(await load(id,user,c))}},db)}
export async function finishAttempt(id:unknown,raw:any,user:User|null,db?:Database){return transaction(async c=>{
 await lock(c);const row=await load(id,user,c)
 const unanswered=row.manifest.items.filter((q:AttemptItem)=>!row.answers[q.id]).length
 if(row.status==='active'){
  if(unanswered&&raw?.confirm_unanswered!==true)fail(409,'unanswered_questions','未回答の問題があります。続けるか、未回答のまま終了するか選んでください',{unanswered})
  const [finished]=await query<any>("UPDATE practice_attempts SET status='completed',completed_at=NOW() WHERE id=$1 RETURNING completed_at",[row.id],c)
  row.status='completed';row.completed_at=finished.completed_at
 }
 return {data:present(row)}
},db)}
export async function answerInAttempt(id:number,body:Record<string,any>,user:User|null,db?:Database):Promise<{data:any}>{return transaction(async c=>{
 await lock(c);const row=await load(body.practice_attempt_id,user,c)
 const item=row.manifest.items.find((q:AttemptItem)=>q.id===id);if(!item)missing()
 const payload={answer_type:body.answer_type,question_version:body.question_version,selected_choice_id:body.selected_choice_id??null,submitted_text:body.submitted_text??null}
 const fingerprint=digest(payload),key=body.submission_key
 if(typeof key!=='string'||!/^[A-Za-z0-9:_-]{8,70}$/.test(key))fail(422,'validation_error','回答の送信キーを確認してください')
 const previous=row.answers[id]
 if(previous){if(previous.key===key&&previous.fingerprint===fingerprint)return {data:previous.result};fail(409,'attempt_answered','この回ではすでに回答済みです。解き直す場合は新しい回を始めてください')}
 if(row.status!=='active')fail(409,'attempt_completed','この演習は終了しています')
 if(body.question_version!==item.question_version||body.answer_type!==item.answer_type)invalid()
 const [used]=await query('SELECT 1 FROM answer_histories WHERE user_id=$1 AND submission_key=$2',[user!.id,`${row.id}:${key}`],c)
 if(used)fail(409,'submission_conflict','この送信キーは別の回答で使用されています')
 const response=await answerQuestion(id,{...payload,submission_key:`${row.id}:${key}`},user,c)
 row.answers[id]={key,fingerprint,result:response.data as AttemptAnswer}
 await query('UPDATE practice_attempts SET answers=$2::jsonb WHERE id=$1',[row.id,JSON.stringify(row.answers)],c)
 return response
},db)}
export async function handlePracticeAttempts(event:H3Event,parts:string[],user:User|null){
 if(parts[0]!=='practice_attempts')return undefined
 const method=getMethod(event)
 if(parts.length===1&&method==='POST')return startAttempt(await readBody(event),user)
 if(parts.length===2&&parts[1]==='validate_guest'&&method==='POST')return validateGuest((await readBody<any>(event))?.guest_manifest)
 if(parts.length===2&&method==='GET')return getAttempt(parts[1],user)
 if(parts.length===3&&parts[2]==='finish'&&method==='POST')return finishAttempt(parts[1],await readBody(event),user)
 return missing()
}
