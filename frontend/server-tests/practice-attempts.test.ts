import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {test,after} from 'node:test'
import {getDatabase,query,closeDatabase,type Database} from '../server/core/db.ts'
import {configuration,setConfigurationForTesting} from '../server/core/config.ts'
import {saveQuestion} from '../server/services/learning-writer.ts'
import {allEssayRuleProfiles} from '../server/data/essay-rule-profiles.ts'
import {essayModelAnswers} from '../tests/fixtures/essayRuleCases.ts'
import {summarizeAttempt} from '../shared/practiceResults.ts'
import {answerQuestion} from '../server/services/learning.ts'
import {startAttempt,getAttempt,finishAttempt,validateGuest} from '../server/services/practice-attempts.ts'
import type {User} from '../server/core/auth.ts'
process.env.APP_ENV='test'
if(process.env.TEST_DATABASE_URL)process.env.DATABASE_URL=process.env.TEST_DATABASE_URL
const original=structuredClone(configuration)
const error=(status:number,code?:string)=>(e:any)=>e.status===status&&(!code||e.code===code)
const enabled=Boolean(process.env.DATABASE_URL||process.env.PGHOST)
async function fixture(db:Database,exam:number,mixed=false){
 const profile=allEssayRuleProfiles.find(p=>p.id==='mock-06-g03-q08')!
 const [user]=await query<User>("INSERT INTO users(name,email,password_digest,role,created_at,updated_at) VALUES('Attempt test',$1,'test','user',now(),now()) RETURNING *",[randomUUID()+'@example.invalid'],db)
 const category=configuration.categories.minor[0]!
 const qs=[]
 for(let i=1;i<=3;i++)qs.push(await saveQuestion({exam_number:exam,question_number:i,major_category_code:category.major_category_value,category_code:category.value,is_cultural_history:false,is_art_history:false,cultural_history_category:null,...(mixed&&i===2?{answer_type:'short_text',accepted_answers:['合成語']}:mixed&&i===3?{answer_type:'essay',essay_config:{profile_id:profile.id,profile_version:profile.version,model_answer:essayModelAnswers[profile.id]!}}:{}),publication_status:'published',content_blocks:[{type:'text',text:'Synthetic question'}],explanation_blocks:[{type:'text',text:'Synthetic explanation'}],source_text:null,source_references:[{kind:'book',title:'Synthetic source',edition:'Test edition'}],choices:mixed&&i>1?[]:configuration.exam.choice_labels.map((choice_label,n)=>({choice_label,content_blocks:[{type:'text',text:'Synthetic choice'}],is_correct:n===0,display_order:n+1}))},{db,requireCompleteExam:false}))
 return {user:user!,qs,positions:qs.map(q=>({examNumber:exam,questionNumber:q.question_number}))}
}
const config=()=>({...structuredClone(original),exam:{...structuredClone(original.exam),set_count:10000,questions_per_exam:3},payments:{...original.payments,enabled:false,free_exam_count:10000}})
test('attempt ownership, first-answer atomicity, guests, finish and invalidation',{skip:!enabled},async t=>{
 setConfigurationForTesting(config())
 const db=await getDatabase().connect();await db.query('BEGIN')
 try{
  const f=await fixture(db,8101),q=f.qs[0]!,user=f.user
  await assert.rejects(startAttempt({positions:[]},user,db),error(422))
  await assert.rejects(startAttempt({positions:[f.positions[0],f.positions[0]]},user,db),error(422))
  const attempt=(await startAttempt({positions:f.positions},user,db)).data
  assert.equal(attempt.manifest.items.length,3)
  assert.equal(JSON.stringify(attempt).includes('Synthetic explanation'),false)
  assert.equal(JSON.stringify(attempt).includes('is_correct'),false)
  await assert.rejects(getAttempt(attempt.id,null,db),error(401))
  await assert.rejects(getAttempt(attempt.id,{...user,id:user.id+9999},db),error(404))
  const body={answer_type:'single_choice',question_version:q.content_version,selected_choice_id:q.choices[0]!.id,submission_key:randomUUID(),practice_attempt_id:attempt.id}
  const first=await answerQuestion(q.id,body,user,db)
  assert.equal(first.data.is_correct,true)
  assert.deepEqual(await answerQuestion(q.id,body,user,db),first)
  await assert.rejects(answerQuestion(q.id,{...body,submission_key:randomUUID()},user,db),error(409,'attempt_answered'))
  await assert.rejects(answerQuestion(q.id,{...body,selected_choice_id:q.choices[1]!.id},user,db),error(409))
  const [count]=await query<any>('SELECT count(*)::integer AS n FROM answer_histories WHERE user_id=$1',[user.id],db);assert.equal(count.n,1)
  await assert.rejects(finishAttempt(attempt.id,{},user,db),error(409,'unanswered_questions'))
  const finished=(await finishAttempt(attempt.id,{confirm_unanswered:true},user,db)).data
  assert.equal(finished.status,'completed');assert.equal(Object.keys(finished.answers).length,1)
  assert.deepEqual((await finishAttempt(attempt.id,{},user,db)).data,finished)
  assert.deepEqual(await answerQuestion(q.id,body,user,db),first)
  await assert.rejects(answerQuestion(f.qs[1]!.id,{...body,question_version:f.qs[1]!.content_version,selected_choice_id:f.qs[1]!.choices[0]!.id},user,db),error(409,'attempt_completed'))
  const fresh=(await startAttempt({positions:f.positions},user,db)).data
  assert.equal(Object.keys(fresh.answers).length,0)
  await answerQuestion(q.id,{...body,practice_attempt_id:fresh.id},user,db)
  const [again]=await query<any>('SELECT count(*)::integer AS n FROM answer_histories WHERE user_id=$1',[user.id],db);assert.equal(again.n,2)
  const isolated=(await startAttempt({positions:f.positions},user,db)).data
  const reserved=randomUUID()
  await answerQuestion(q.id,{...body,practice_attempt_id:undefined,submission_key:`${isolated.id}:${reserved}`},user,db)
  await assert.rejects(answerQuestion(q.id,{...body,practice_attempt_id:isolated.id,submission_key:reserved},user,db),error(409,'submission_conflict'))
  const guest=await startAttempt({positions:f.positions},null,db)
  assert.equal(guest.data.guest,true)
  const [guestRow]=await query('SELECT id FROM practice_attempts WHERE id=$1',[guest.data.id],db);assert.equal(guestRow,undefined)
  assert.deepEqual(await validateGuest(guest.guest_manifest,db),{data:{valid:true}})
  await assert.rejects(validateGuest(guest.guest_manifest+'x',db),error(409))
  const partial=(await startAttempt({positions:[f.positions[0]]},user,db)).data
  await query('UPDATE questions SET content_version=content_version+1 WHERE id=$1',[f.qs[1]!.id],db)
  assert.equal((await getAttempt(partial.id,user,db)).data.status,'active')
  await query("UPDATE questions SET major_category_code=major_category_code,group_question_number=group_question_number WHERE id=$1",[q.id],db)
  assert.equal((await getAttempt(partial.id,user,db)).data.status,'active')
  await query('UPDATE questions SET content_version=content_version+1 WHERE id=$1',[q.id],db)
  await assert.rejects(getAttempt(partial.id,user,db),error(409,'attempt_invalidated'))
  await assert.rejects(getAttempt(attempt.id,user,db),error(409,'attempt_invalidated'))
  await assert.rejects(validateGuest(guest.guest_manifest,db),error(409))
  const [invalid]=await query<any>('SELECT status,answers FROM practice_attempts WHERE id=$1',[attempt.id],db);assert.equal(invalid.status,'invalidated');assert.deepEqual(invalid.answers,{})
 }finally{await db.query('ROLLBACK');db.release();setConfigurationForTesting(original)}
})
test('parallel answers and finish keep one immutable accepted answer',{skip:!enabled},async()=>{
 setConfigurationForTesting(config())
 const exam=8102,f=await fixture(getDatabase(),exam),q=f.qs[0]!
 try{
  const a=(await startAttempt({positions:[f.positions[0]]},f.user)).data
  const body={answer_type:'single_choice',question_version:q.content_version,selected_choice_id:q.choices[0]!.id,submission_key:randomUUID(),practice_attempt_id:a.id}
  const results=await Promise.allSettled([answerQuestion(q.id,body,f.user),answerQuestion(q.id,{...body,submission_key:randomUUID()},f.user),finishAttempt(a.id,{confirm_unanswered:true},f.user)])
  assert.ok(results.some(r=>r.status==='fulfilled'))
  const final=(await getAttempt(a.id,f.user)).data;assert.equal(final.status,'completed');assert.ok(Object.keys(final.answers).length<=1)
  const [count]=await query<any>('SELECT count(*)::integer AS n FROM answer_histories WHERE user_id=$1',[f.user.id]);assert.equal(count.n,Object.keys(final.answers).length)
 }finally{
  await query('DELETE FROM users WHERE id=$1',[f.user.id]);await query('DELETE FROM questions WHERE exam_number=$1',[exam]);await query('DELETE FROM exam_sets WHERE exam_number=$1',[exam]);setConfigurationForTesting(original)
 }
})
test('mixed answers keep essay pending and entitlement/scoring changes suppress totals',{skip:!enabled},async()=>{
 setConfigurationForTesting(config());const db=await getDatabase().connect();await db.query('BEGIN')
 try{
  const f=await fixture(db,8103,true),profile=allEssayRuleProfiles.find(p=>p.id==='mock-06-g03-q08')!
  const a=(await startAttempt({positions:f.positions},f.user,db)).data
  const short=f.qs[1]!,essay=f.qs[2]!
  const base={question_version:short.content_version,answer_type:'short_text',submission_key:randomUUID(),practice_attempt_id:a.id,submitted_text:'合成語'}
  assert.equal((await answerQuestion(short.id,base,f.user,db)).data.is_correct,true)
  const result=await answerQuestion(essay.id,{...base,question_version:essay.content_version,answer_type:'essay',submission_key:randomUUID(),submitted_text:'未確認の表現です'},f.user,db)
  assert.equal(result.data.is_correct,null)
  const done=(await finishAttempt(a.id,{confirm_unanswered:true},f.user,db)).data
  assert.equal(summarizeAttempt(done)[0]!.total,null)
  assert.equal(summarizeAttempt(done)[0]!.autoMax,6)
  const b=(await startAttempt({positions:[f.positions[2]]},f.user,db)).data
  const complete=await answerQuestion(essay.id,{...base,question_version:essay.content_version,answer_type:'essay',practice_attempt_id:b.id,submission_key:randomUUID(),submitted_text:essayModelAnswers[profile.id]!},f.user,db)
  assert.equal(complete.data.essay_result.confirmed_points,8)
  assert.equal(summarizeAttempt((await finishAttempt(b.id,{},f.user,db)).data)[0]!.total,8)
  setConfigurationForTesting({...config(),exam:{...config().exam,scoring:{version:2,single_choice:4,short_text:3,essay:8}}})
  await assert.rejects(getAttempt(a.id,f.user,db),error(409,'attempt_invalidated'))
  setConfigurationForTesting({...config(),payments:{...config().payments,enabled:true,free_exam_count:0}})
  await assert.rejects(getAttempt(a.id,f.user,db),error(403))
 }finally{await db.query('ROLLBACK');db.release();setConfigurationForTesting(original)}
})
after(closeDatabase)
