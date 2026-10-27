import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {after,test} from 'node:test'
import type {User} from '../server/core/auth.ts'
import {configuration,setConfigurationForTesting} from '../server/core/config.ts'
import {closeDatabase,getDatabase,query,type Database} from '../server/core/db.ts'
import {ApiError} from '../server/core/errors.ts'
import {migrate} from '../server/database/migrate.ts'
import {essayRuleProfiles} from '../server/data/essay-rule-profiles.ts'
import {createArchiveV2,validateArchiveV2} from '../server/operations/content-v2.ts'
import {answerQuestion,getHistory,getQuestion,listHistory,putFavorite,listFavorites} from '../server/services/learning.ts'
import {essayProfileDigest,requireCurrentEssayProfile} from '../server/services/essay-profile.ts'
import {validateQuestionInput,type QuestionInput} from '../server/services/learning-validation.ts'
import {createQuestionGroup,loadQuestion,loadExamSet,publishExamSet,saveExamSet,saveQuestion} from '../server/services/learning-writer.ts'
import {essayModelAnswers} from '../tests/fixtures/essayRuleCases.ts'

process.env.APP_ENV='test'
if(process.env.TEST_DATABASE_URL)process.env.DATABASE_URL=process.env.TEST_DATABASE_URL
const integration={skip:!Boolean(process.env.DATABASE_URL||process.env.PGHOST)}
const original=structuredClone(configuration)
const profile=essayRuleProfiles.find(rule=>rule.id==='mock-06-g03-q08')!
const model=essayModelAnswers[profile.id]!
const error=(status:number)=>(e:unknown)=>e instanceof ApiError&&e.status===status
const config=()=>({profile_id:profile.id,profile_version:profile.version,model_answer:model})

function sample(number=1,overrides:Partial<QuestionInput>={}):QuestionInput {
 const category=configuration.categories.minor[0]!
 return {exam_number:1,question_number:number,major_category_code:category.major_category_value,category_code:category.value,
  is_cultural_history:false,is_art_history:false,cultural_history_category:null,publication_status:'draft',
  content_blocks:[{type:'text',text:'Synthetic essay integration question'}],explanation_blocks:[{type:'text',text:'Synthetic explanation'}],
  source_text:null,source_references:[{kind:'book',title:'Synthetic source',edition:'Test edition'}],
  choices:configuration.exam.choice_labels.map((choice_label,index)=>({choice_label,display_order:index+1,is_correct:index===1,content_blocks:[{type:'text',text:`Synthetic option ${index}`}]})),...overrides}
}
after(async()=>{setConfigurationForTesting(original);await closeDatabase()})

test('essay publication requires a known pinned profile and fully matching model; old answer forms reject essay configuration',()=>{
 const input=sample(1,{answer_type:'essay',choices:[],essay_config:config(),publication_status:'published'})
 const parsed=validateQuestionInput(input)
 assert.equal(parsed.answer_type,'essay')
 assert.equal(parsed.essay_config.profile_digest,essayProfileDigest(profile))
 assert.equal(validateQuestionInput({...input,essay_config:{...config(),profile_digest:'0'.repeat(64)}}).essay_config.profile_digest,essayProfileDigest(profile))
 assert.throws(()=>requireCurrentEssayProfile({...config(),profile_digest:'0'.repeat(64)}),error(409))
 assert.deepEqual(validateQuestionInput({...input,publication_status:'draft',essay_config:{}}).essay_config,{})
 assert.throws(()=>validateQuestionInput({...input,essay_config:{}}),error(422))
 assert.throws(()=>validateQuestionInput({...input,essay_config:{...config(),profile_version:999999}}),error(422))
 assert.throws(()=>validateQuestionInput({...input,essay_config:{...config(),model_answer:'未登録の表現だけ'}}),error(422))
 assert.throws(()=>validateQuestionInput({...input,accepted_answers:[model]}),error(422))
 assert.throws(()=>validateQuestionInput({...input,essay_config:{...config(),model_answer:model+'\u0000'}}),error(422))
 assert.throws(()=>validateQuestionInput({...input,input_constraints:{exact_length:10}}),error(422))
 assert.throws(()=>validateQuestionInput(sample(1,{essay_config:config()})),error(422))
 assert.throws(()=>validateQuestionInput({...input,choices:sample().choices}),error(422))
})

test('v2 essay archive preserves its profile and model while pre-essay archives omit an empty new field',()=>{
 const document={exam_sets:[{exam_number:1,title:'Synthetic draft',format_code:'legacy_practice',publication_status:'draft'}],groups:[],questions:[sample(1,{answer_type:'essay',choices:[],essay_config:config()})]}
 const archive=createArchiveV2(document)
 assert.deepEqual(validateArchiveV2(archive),archive)
 assert.deepEqual(archive.questions[0]!.essay_config,{...config(),profile_digest:essayProfileDigest(profile)})
 const old=createArchiveV2({...document,questions:[sample()]})
 assert.equal('essay_config' in old.questions[0]!,false)
 assert.equal(createArchiveV2({...document,questions:[sample(1,{essay_config:{}})]}).sha256,old.sha256)
})

async function isolated(action:(db:Database,user:User)=>Promise<void>) {
 const explicitUrl=process.env.TEST_DATABASE_URL||process.env.DATABASE_URL
 const databaseName=explicitUrl?new URL(explicitUrl).pathname.slice(1):(process.env.PGDATABASE||process.env.DB_NAME||'')
 if(!/^[a-zA-Z0-9_]+_test$/.test(databaseName))throw new Error('Essay integration tests require an explicit isolated database ending in _test')
 const client=await getDatabase().connect()
 const schema=`essay_${randomUUID().replaceAll('-','')}`
 await client.query('BEGIN')
 try {
  await client.query(`CREATE SCHEMA "${schema}"`)
  await client.query(`SET LOCAL search_path TO "${schema}"`)
  await migrate(client)
  setConfigurationForTesting({...structuredClone(original),payments:{...original.payments,enabled:false}})
  const [user]=await query<User>("INSERT INTO users(name,email,password_digest,role,created_at,updated_at) VALUES('Synthetic user',$1,'synthetic','admin',NOW(),NOW()) RETURNING *",[`essay-${randomUUID()}@example.invalid`],client)
  await action(client,user!)
 } finally {await client.query('ROLLBACK');client.release();setConfigurationForTesting(original)}
}
async function assertConstraint(db:Database,id:number,assignment:string) {
 await query('SAVEPOINT response_shape',[],db)
 try {await assert.rejects(query(`UPDATE answer_histories SET ${assignment} WHERE id=$1`,[id],db),(e:any)=>e.code==='23514')}
 finally {await query('ROLLBACK TO SAVEPOINT response_shape',[],db);await query('RELEASE SAVEPOINT response_shape',[],db)}
}

test('normal essay practice hides grading data before answering, persists nullable correctness and scores once, and invalidates affected history',integration,async()=>isolated(async(db,user)=>{
 await saveExamSet({exam_number:1,title:'Synthetic essay practice',format_code:'group_practice',publication_status:'draft'},{db})
 const group=await createQuestionGroup(1,{group_number:1,title:'Synthetic group',planned_question_count:7,passages:[{label:'A',content_blocks:[{type:'text',text:'Synthetic shared passage'}]}]},{db})
 let essayId=0,choiceId=0
 for(let number=1;number<=7;number++) {
  const essay=number===7
  const saved=await saveQuestion(sample(number,{group_id:group.id,group_question_number:number,passage_references:[{passage_id:group.passages[0]!.id,anchor_id:null}],
   ...(essay?{answer_type:'essay',choices:[],essay_config:config()}: {})}),{db,requireCompleteExam:false})
  if(essay)essayId=saved.id
  else choiceId=saved.id
 }
 const set=await loadExamSet(1,db);await publishExamSet(1,set.lock_version,{db})
 const q=await loadQuestion(essayId,db)
 const publicQuestion=(await getQuestion(q.id,null,db)).data
 assert.equal(publicQuestion.answer_type,'essay')
 assert.deepEqual(publicQuestion.essay_constraints,{max_characters:profile.max_characters,required_terms:profile.required_terms})
 for(const key of ['essay_config','model_answer','essay_result','source_references','explanation_blocks','profile_id','elements'])assert.equal(key in publicQuestion,false)

 const request={answer_type:'essay',submitted_text:model,question_version:q.content_version,submission_key:randomUUID()}
 const guest=(await answerQuestion(q.id,request,null,db)).data
 assert.equal(guest.is_correct,null);assert.equal(guest.essay_result.score,8)
 assert.equal(guest.model_answer,model);assert.equal(guest.answer_history_id,null)
 assert.equal((await query<any>('SELECT count(*)::integer AS n FROM answer_histories',[],db))[0].n,0)
 const first=(await answerQuestion(q.id,request,user,db)).data
 const repeated=(await answerQuestion(q.id,request,user,db)).data
 assert.equal(first.is_correct,null);assert.equal(first.essay_result.score,8)
 assert.equal(first.answer_history_id,repeated.answer_history_id)
 assert.equal((await query<any>('SELECT count(*)::integer AS n FROM answer_histories',[],db))[0].n,1)
 const history=(await getHistory(first.answer_history_id!,user,db)).data
 assert.equal(history.is_correct,null);assert.equal(history.essay_result.score,8);assert.equal(history.model_answer,model)
 assert.equal((await listHistory(user,{},db)).data[0]!.is_correct,null)
 assert.equal((await listHistory(user,{},db)).data[0]!.essay_result!.score,8)
 const unknown=(await answerQuestion(q.id,{...request,submission_key:randomUUID(),submitted_text:'歴史上の変化には複数の背景があった。',essay_result:{score:8},is_correct:true},user,db)).data
 assert.equal(unknown.is_correct,null);assert.equal(unknown.essay_result.score,null);assert.equal(unknown.essay_result.pending_points,8)
 await assert.rejects(answerQuestion(q.id,{...request,submitted_text:'別の答案'},user,db),error(409))
 await assert.rejects(answerQuestion(q.id,{...request,question_version:q.content_version+1,submission_key:randomUUID()},user,db),error(409))
 await assert.rejects(answerQuestion(q.id,{...request,submitted_text:'',submission_key:randomUUID()},user,db),error(422))
 await assert.rejects(answerQuestion(q.id,{...request,submitted_text:'\u0000',submission_key:randomUUID()},user,db),error(422))
 await assert.rejects(answerQuestion(q.id,{...request,submitted_text:'\uD800',submission_key:randomUUID()},user,db),error(422))
 await assert.rejects(answerQuestion(q.id,{...request,submitted_text:'字'.repeat(4001),submission_key:randomUUID()},user,db),error(422))
 const overLimit=(await answerQuestion(q.id,{...request,submitted_text:'字'.repeat(profile.max_characters+1),submission_key:randomUUID()},null,db)).data
 assert.equal(overLimit.essay_result.grading_status,'invalid');assert.equal(overLimit.essay_result.score,null)
 await assertConstraint(db,first.answer_history_id!,'is_correct=false')
 await assertConstraint(db,first.answer_history_id!,"essay_result='{}'::jsonb")
 await assertConstraint(db,first.answer_history_id!,"essay_result='{\"grading_status\":null}'::jsonb")
 await assertConstraint(db,first.answer_history_id!,'essay_result=NULL')

 const choice=await loadQuestion(choiceId,db)
 const answered=(await answerQuestion(choice.id,{answer_type:'single_choice',selected_choice_id:choice.choices[0]!.id,question_version:choice.content_version,submission_key:randomUUID()},user,db)).data
 assert.equal(typeof answered.is_correct,'boolean')
 await assertConstraint(db,answered.answer_history_id!,'is_correct=NULL')
 const favorite=await putFavorite(q.id,user,db)
 const unchanged=await saveQuestion(q,{id:q.id,db})
 assert.equal(unchanged.content_version,q.content_version)
 assert.equal((await query<any>('SELECT count(*)::integer AS n FROM answer_histories WHERE question_id=$1',[q.id],db))[0].n,2)
 const changed=await saveQuestion({...unchanged,explanation_blocks:[{type:'text',text:'Changed synthetic explanation'}]},{id:q.id,db})
 assert.equal(changed.content_version,q.content_version+1)
 assert.equal((await query<any>('SELECT count(*)::integer AS n FROM answer_histories WHERE question_id=$1',[q.id],db))[0].n,0)
 assert.equal((await listFavorites(user,{},db)).data.some(row=>row.id===favorite.data.id),true)
 assert.equal((await query<any>('SELECT count(*)::integer AS n FROM answer_histories WHERE question_id=$1',[choice.id],db))[0].n,1)
 await assert.rejects(saveQuestion({...changed,answer_type:'short_text',essay_config:{},accepted_answers:['合成語']},{id:q.id,db}),error(422))
 const currentRequest={...request,question_version:changed.content_version,submission_key:randomUUID()}
 const latest=(await answerQuestion(q.id,currentRequest,user,db)).data
 const originalTitle=profile.title
 try {
  profile.title=originalTitle+' revision test'
  await assert.rejects(getQuestion(q.id,user,db),error(409))
  await assert.rejects(answerQuestion(q.id,{...currentRequest,submission_key:randomUUID()},user,db),error(409))
  await assert.rejects(getHistory(latest.answer_history_id!,user,db),error(409))
  await assert.rejects(listHistory(user,{},db),error(409))
  const resaved=await saveQuestion(changed,{id:q.id,db})
  assert.equal(resaved.content_version,changed.content_version+1)
  assert.notEqual(resaved.essay_config.profile_digest,changed.essay_config.profile_digest)
  assert.equal((await query<any>('SELECT count(*)::integer AS n FROM answer_histories WHERE question_id=$1',[q.id],db))[0].n,0)
  assert.equal((await listFavorites(user,{},db)).data.some(row=>row.id===favorite.data.id),true)
 } finally {profile.title=originalTitle}
}))
