import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {after,test} from 'node:test'
import {configuration,setConfigurationForTesting} from '../server/core/config.ts'
import {closeDatabase,getDatabase,query,type Database} from '../server/core/db.ts'
import {ApiError} from '../server/core/errors.ts'
import type {User} from '../server/core/auth.ts'
import {validateQuestionInput,validateBlocks,checkTextConstraints,normalizeAnswerText,type QuestionInput} from '../server/services/learning-validation.ts'
import {saveQuestion,loadQuestion,saveExamSet,createQuestionGroup,saveQuestionGroup,loadQuestionGroup,loadExamSet,publishExamSet,validateExamSet,deleteQuestionGroup,deleteQuestion} from '../server/services/learning-writer.ts'
import {getQuestion,nextQuestion,answerQuestion,getHistory,listHistory,listExams,putFavorite,listFavorites} from '../server/services/learning.ts'
process.env.APP_ENV='test'
if(process.env.TEST_DATABASE_URL)process.env.DATABASE_URL=process.env.TEST_DATABASE_URL
const integration={skip:!Boolean(process.env.DATABASE_URL||process.env.PGHOST)}
const original=structuredClone(configuration)
const error=(status:number)=>(e:unknown)=>e instanceof ApiError&&e.status===status
function sample(exam=1,number=1,overrides:Partial<QuestionInput>={}):QuestionInput{
 const category=configuration.categories.minor[0]!
 return {exam_number:exam,question_number:number,major_category_code:category.major_category_value,category_code:category.value,is_cultural_history:false,is_art_history:false,cultural_history_category:null,publication_status:'draft',content_blocks:[{type:'text',text:'Synthetic question'}],explanation_blocks:[{type:'text',text:'Synthetic explanation'}],source_text:null,source_references:[{kind:'book',title:'Synthetic reference',publisher:'Synthetic publisher',edition:'Test edition'}],choices:configuration.exam.choice_labels.map((label,index)=>({choice_label:label,content_blocks:[{type:'text',text:`Synthetic choice ${index}`}],display_order:index+1,is_correct:index===1})),...overrides}
}
after(async()=>{setConfigurationForTesting(original);await closeDatabase()})
test('short text, structured books and stable inline references validate without revealing source URLs',()=>{
 const value=sample(1,8,{group_id:1,group_question_number:8,answer_type:'short_text',accepted_answers:['合成語','別表記'],input_constraints:{script:'kanji',exact_length:3},choices:[],publication_status:'published',passage_references:[{passage_id:1,anchor_id:null}]})
 const parsed=validateQuestionInput(value)
 assert.equal(parsed.answer_type,'short_text');assert.equal(parsed.choices.length,0);assert.equal(parsed.source_references[0]!.url,undefined)
 assert.equal(normalizeAnswerText(' Ａ '),'A');assert.equal(checkTextConstraints('合成語',parsed.input_constraints),true);assert.equal(checkTextConstraints('合成',parsed.input_constraints),false)
 assert.throws(()=>validateQuestionInput({...value,source_references:[{kind:'web',title:'Web without URL'}]}),error(422))
 assert.throws(()=>validateQuestionInput({...value,accepted_answers:[]}),error(422))
 assert.throws(()=>validateQuestionInput({...value,passage_references:[{passage_id:1,anchor_id:'a'},{passage_id:1,anchor_id:'a'}]}),error(422))
 assert.throws(()=>validateBlocks([{type:'text',inlines:[{type:'anchor',id:'a',label:'a',text:'One'},{type:'anchor',id:'a',label:'b',text:'Two'}]}],'question'),error(422))
 assert.deepEqual(validateQuestionInput({...value,publication_status:'draft',accepted_answers:[],content_blocks:[],source_references:[{kind:'book',title:''}]}).content_blocks,[])
})
async function isolated(action:(db:Database,exam:number,user:User)=>Promise<void>){
 const client=await getDatabase().connect();setConfigurationForTesting({...structuredClone(original),exam:{...original.exam,set_count:10000},payments:{...original.payments,enabled:false,free_exam_count:10000}})
 await client.query('BEGIN')
 try{
  const [u]=await query<User>("INSERT INTO users(name,email,password_digest,role,created_at,updated_at) VALUES('Synthetic user',$1,'synthetic','admin',NOW(),NOW()) RETURNING *",[`grouped-${randomUUID()}@example.invalid`],client)
  await action(client,100+Math.floor(Math.random()*8000),u!)
 }finally{await client.query('ROLLBACK');client.release();setConfigurationForTesting(original)}
}
async function groupWithQuestions(db:Database,exam:number,groupNumber:number,count:number,start:number){
 const g=await createQuestionGroup(exam,{group_number:groupNumber,title:`Synthetic group ${groupNumber}`,planned_question_count:count},{db})
 const saved=await saveQuestionGroup(g.id,{lock_version:g.lock_version,passages:[{label:'A',content_blocks:[{type:'text',inlines:[{type:'text',text:'Shared '},{type:'anchor',id:'anchor-a',label:'a',text:'synthetic passage',underline:true}]}]}]},{db})
 const passage=saved.passages[0]!
 const ids:number[]=[]
 for(let i=0;i<count;i++){
  const short=i===count-1
  const q=await saveQuestion(sample(exam,start+i,{group_id:g.id,group_question_number:i+1,answer_type:short?'short_text':'single_choice',accepted_answers:short?['合成語','別表記']:[],input_constraints:short?{script:'kanji',exact_length:3}:{},choices:short?[]:sample().choices,passage_references:[{passage_id:passage.id,anchor_id:i===0?'anchor-a':null}]}),{db,requireCompleteExam:false})
  ids.push(q.id)
 }
 return {group:await loadQuestionGroup(g.id,db),ids,passage}
}
test('group practice publishes seven mixed questions, grades aliases once, and preserves IDs/favorites through shared edits',integration,async()=>isolated(async(db,exam,u)=>{
 await saveExamSet({exam_number:exam,title:'Synthetic material',format_code:'group_practice',publication_status:'draft'},{db})
 const {group,ids,passage}=await groupWithQuestions(db,exam,1,7,1)
 assert.equal((await validateExamSet(exam,db)).valid,true)
 const initial=await loadExamSet(exam,db);await publishExamSet(exam,initial.lock_version,{db})
 const q=await loadQuestion(ids[6]!,db);const publicQ=(await getQuestion(q.id,u,db)).data
 assert.equal(q.answer_type_locked,true)
 assert.equal(publicQ.answer_type,'short_text');assert.equal(publicQ.shared_passages.length,1)
 for(const field of ['accepted_answers','source_references','source_text','explanation_blocks'])assert.equal(field in publicQ,false)
 const request={answer_type:'short_text',submitted_text:'別表記',question_version:q.content_version,submission_key:randomUUID()}
 const first=(await answerQuestion(q.id,request,u,db)).data;const repeat=(await answerQuestion(q.id,request,u,db)).data
 assert.equal(first.is_correct,true);assert.equal(first.answer_history_id,repeat.answer_history_id)
 const restored=(await getHistory(first.answer_history_id!,u,db)).data
 assert.equal(restored.selected_choice,null);assert.equal(restored.correct_answer,'合成語')
 assert.equal((await listHistory(u,{},db)).data[0]!.answer_type,'short_text')
 await assert.rejects(answerQuestion(q.id,{...request,submitted_text:'合成語'},u,db),error(409))
 await assert.rejects(answerQuestion(ids[0]!,{selected_choice_id:(await loadQuestion(ids[0]!,db)).choices[0]!.id},u,db),error(409))
 const favorite=await putFavorite(q.id,u,db)
 const currentGroup=await loadQuestionGroup(group.id,db)
 const reversed=await saveQuestionGroup(group.id,{lock_version:currentGroup.lock_version,question_ids:[...ids].reverse()},{db})
 assert.deepEqual((await listExams(u,db)).data.find(e=>e.exam_number===exam)!.question_numbers,[7,6,5,4,3,2,1])
 assert.equal((await nextQuestion({exam_number:exam,question_number:7},u,db)).data.id,q.id)
 assert.equal((await loadQuestion(q.id,db)).content_version,q.content_version)
 const editedPassage={...passage,content_blocks:[{type:'text',inlines:[{type:'anchor' as const,id:'anchor-a',label:'a',text:'Changed synthetic passage',underline:true}]}]}
 await saveQuestionGroup(group.id,{lock_version:reversed.lock_version,passages:[editedPassage]},{db})
 const updated=await loadQuestion(q.id,db);assert.equal(updated.id,q.id);assert.equal(updated.content_version,q.content_version+1)
 assert.equal((await query<any>('SELECT count(*)::integer AS n FROM answer_histories WHERE question_id=ANY($1::bigint[])',[ids],db))[0].n,0)
 assert.equal((await listFavorites(u,{},db)).data.some(f=>f.id===favorite.data.id),true)
 await assert.rejects(answerQuestion(q.id,{...request,submission_key:randomUUID()},u,db),error(409))
 const groupAfter=await loadQuestionGroup(group.id,db)
 await saveQuestionGroup(group.id,{lock_version:groupAfter.lock_version,passages:groupAfter.passages},{db})
 assert.equal((await loadQuestion(q.id,db)).content_version,updated.content_version)
 const extra=configuration.categories.minor.find(c=>c.major_category_value!==updated.major_category_code)!
 const metaSaved=await saveQuestion({...updated,related_topics:[{major_category_code:extra.major_category_value,category_code:extra.value}]},{id:updated.id,db})
 assert.equal(metaSaved.content_version,updated.content_version)
 assert.equal((await listExams(u,db,{major_category_code:extra.major_category_value,category_code:extra.value})).data.find(e=>e.exam_number===exam)!.published_question_count,1)
 await clientSavepoint(db,'group_membership',async()=>{
  await assert.rejects(query('UPDATE questions SET group_question_number=NULL WHERE id=$1',[q.id],db),(e:any)=>e.code==='23514')
 })
 const beforeDeletion=await loadExamSet(exam,db)
 const draftSibling=await createQuestionGroup(exam,{group_number:2,title:'Draft sibling',planned_question_count:7},{db})
 const parked=await saveQuestion(sample(exam,8,{group_id:draftSibling.id,group_question_number:1}),{db,requireCompleteExam:false})
 const discarded=await saveQuestion(sample(exam,9,{group_id:draftSibling.id,group_question_number:2}),{db,requireCompleteExam:false})
 assert.equal(discarded.answer_type_locked,false)
 const convertedDraft=await saveQuestion({...discarded,answer_type:'short_text',choices:[],accepted_answers:['合成語']},{id:discarded.id,db,requireCompleteExam:false})
 assert.equal(convertedDraft.answer_type,'short_text');assert.equal(convertedDraft.answer_type_locked,false)
 await assert.rejects(saveQuestionGroup(draftSibling.id,{lock_version:draftSibling.lock_version,question_ids:[parked.id,String(parked.id)]},{db}),error(422))
 assert.deepEqual((await loadQuestionGroup(draftSibling.id,db)).questions!.map(item=>item.group_question_number),[1,2])
 await deleteQuestion(discarded.id,db)
 assert.equal((await loadExamSet(exam,db)).publication_status,'published')
 assert.equal((await loadExamSet(exam,db)).lock_version,beforeDeletion.lock_version)
 assert.deepEqual((await listExams(u,db)).data.find(e=>e.exam_number===exam)!.question_numbers,[7,6,5,4,3,2,1])
 await deleteQuestionGroup(draftSibling.id,{db})
 const afterDeletion=await loadExamSet(exam,db)
 assert.equal(afterDeletion.publication_status,'published');assert.equal(afterDeletion.lock_version,beforeDeletion.lock_version)
 assert.equal((await loadQuestionGroup(draftSibling.id,db)).publication_status,'private')
 assert.equal((await loadQuestion(parked.id,db)).id,parked.id)
 assert.deepEqual((await listExams(u,db)).data.find(e=>e.exam_number===exam)!.question_numbers,[7,6,5,4,3,2,1])
 const emptySibling=await createQuestionGroup(exam,{group_number:3,title:'Empty sibling',planned_question_count:7},{db})
 await deleteQuestionGroup(emptySibling.id,{db});await assert.rejects(loadQuestionGroup(emptySibling.id,db),error(404))
 assert.equal((await loadExamSet(exam,db)).publication_status,'published')
 await deleteQuestion(ids[0]!,db)
 assert.equal((await loadExamSet(exam,db)).publication_status,'private')
 assert.equal((await listExams(u,db)).data.some(e=>e.exam_number===exam),false)
 assert.equal((await loadQuestion(q.id,db)).id,q.id)
 const oncePublished=await loadQuestion(q.id,db)
 const returnedToDraft=await saveQuestion({...oncePublished,publication_status:'draft'},{id:q.id,db})
 assert.equal(returnedToDraft.answer_type_locked,true)
 await assert.rejects(saveQuestion({...returnedToDraft,answer_type:'single_choice',accepted_answers:[],input_constraints:{},choices:sample().choices},{id:q.id,db}),error(422))
 assert.equal((await loadQuestion(q.id,db)).answer_type,'short_text')
}))
async function clientSavepoint(db:Database,name:string,action:()=>Promise<void>){await query(`SAVEPOINT ${name}`,[],db);try{await action()}finally{await query(`ROLLBACK TO SAVEPOINT ${name}`,[],db);await query(`RELEASE SAVEPOINT ${name}`,[],db)}}
test('next-question cursors follow reordered sparse public positions, retaining filters and absent-cursor compatibility',integration,async()=>isolated(async(db,exam,u)=>{
 await saveExamSet({exam_number:exam,title:'Synthetic reordered material',format_code:'group_practice',publication_status:'draft'},{db})
 const {group,ids}=await groupWithQuestions(db,exam,1,7,1)
 const firstCategory=configuration.categories.minor[0]!
 const otherCategory=configuration.categories.minor.find(c=>c.major_category_value!==firstCategory.major_category_value)!
 const music=new Set([0,4,5])
 // Move the larger old numbers first so sparse replacements do not collide with still-unmoved siblings.
 for(const [index,id]of [...ids.entries()].reverse()){
  const q=await loadQuestion(id,db),category=index===5?otherCategory:firstCategory
  await saveQuestion({...q,question_number:(index+1)*3,major_category_code:category.major_category_value,category_code:category.value,
   is_cultural_history:music.has(index),cultural_history_category:music.has(index)?'music_history':null},{id,db,requireCompleteExam:false})
 }
 const ordered=[3,0,6,1,5,2,4].map(index=>ids[index]!)
 const current=await loadQuestionGroup(group.id,db)
 await saveQuestionGroup(group.id,{lock_version:current.lock_version,question_ids:ordered},{db})
 const set=await loadExamSet(exam,db);await publishExamSet(exam,set.lock_version,{db})
 const catalog=(await listExams(u,db)).data.find(e=>e.exam_number===exam)!
 assert.deepEqual(catalog.question_numbers,[12,3,21,6,18,9,15])
 let after=0;const visited:number[]=[]
 for(const id of ordered){const next=(await nextQuestion({exam_number:exam,after_question_number:after},u,db)).data;assert.equal(next.id,id);visited.push(next.id);after=next.question_number}
 assert.equal(new Set(visited).size,7)
 await assert.rejects(nextQuestion({exam_number:exam,after_question_number:after},u,db),error(404))
 assert.equal((await nextQuestion({exam_number:exam,after_question_number:12,history_topic:'music_history'},u,db)).data.question_number,3)
 assert.equal((await nextQuestion({exam_number:exam,after_question_number:21,history_topic:'music_history'},u,db)).data.question_number,18)
 const filter={exam_number:exam,history_topic:'music_history',major_category_code:firstCategory.major_category_value,category_code:firstCategory.value}
 assert.equal((await nextQuestion({...filter,after_question_number:0},u,db)).data.question_number,3)
 assert.equal((await nextQuestion({...filter,after_question_number:3},u,db)).data.question_number,15)
 assert.equal((await nextQuestion({...filter,after_question_number:18},u,db)).data.question_number,15)
 await assert.rejects(nextQuestion({...filter,after_question_number:15},u,db),error(404))
 // A public question in another exam, or a published child in a draft group, must not become this exam's cursor.
 const another=exam+1;await saveExamSet({exam_number:another,title:'Synthetic other material',format_code:'group_practice',publication_status:'draft'},{db})
 await groupWithQuestions(db,another,2,7,5);const otherSet=await loadExamSet(another,db);await publishExamSet(another,otherSet.lock_version,{db})
 const hidden=await createQuestionGroup(exam,{group_number:2,title:'Synthetic draft group',planned_question_count:7},{db})
 const hiddenGroup=await saveQuestionGroup(hidden.id,{lock_version:hidden.lock_version,passages:[{label:'A',content_blocks:[{type:'text',text:'Synthetic hidden passage'}]}]},{db})
 await saveQuestion(sample(exam,5,{group_id:hidden.id,group_question_number:1,publication_status:'published',passage_references:[{passage_id:hiddenGroup.passages[0]!.id,anchor_id:null}]}),{db,requireCompleteExam:false})
 assert.equal((await nextQuestion({exam_number:exam,after_question_number:4},u,db)).data.question_number,12)
 assert.equal((await nextQuestion({exam_number:exam,after_question_number:5},u,db)).data.question_number,12)
 assert.equal((await nextQuestion({...filter,after_question_number:5},u,db)).data.question_number,15)
 await assert.rejects(nextQuestion({exam_number:exam,after_question_number:15},u,db),error(404))
 await assert.rejects(nextQuestion({exam_number:exam,after_question_number:30},u,db),error(404))
}))
test('four-group mock requires 30 questions; draft siblings do not replace a published standalone group',integration,async()=>isolated(async(db,exam,u)=>{
 await saveExamSet({exam_number:exam,title:'Synthetic mock',format_code:'rekiken_mock',publication_status:'draft'},{db})
 let position=1
 for(const [index,count]of [8,7,8,7].entries()){await groupWithQuestions(db,exam,index+1,count,position);position+=count}
 assert.equal((await validateExamSet(exam,db)).valid,true)
 const set=await loadExamSet(exam,db);await publishExamSet(exam,set.lock_version,{db})
 const catalog=(await listExams(u,db)).data.find(e=>e.exam_number===exam)!
 assert.equal(catalog.question_numbers.length,30);assert.equal(catalog.groups.length,4)
 const firstGroup=await loadQuestionGroup(set.groups[0]!.id,db),firstIds=firstGroup.questions!.map(q=>q.id)
 await saveQuestionGroup(firstGroup.id,{lock_version:firstGroup.lock_version,question_ids:[...firstIds].reverse()},{db})
 assert.equal((await nextQuestion({exam_number:exam,after_question_number:0},u,db)).data.question_number,8)
 assert.equal((await nextQuestion({exam_number:exam,after_question_number:8},u,db)).data.question_number,7)
 assert.equal((await nextQuestion({exam_number:exam,after_question_number:1},u,db)).data.question_number,9)
 const another=exam+1;await saveExamSet({exam_number:another,title:'One group',format_code:'group_practice',publication_status:'draft'},{db})
 await groupWithQuestions(db,another,1,7,1);const single=await loadExamSet(another,db);await publishExamSet(another,single.lock_version,{db})
 await createQuestionGroup(another,{group_number:2,title:'Incomplete sibling',planned_question_count:8},{db})
 assert.equal((await validateExamSet(another,db)).valid,true)
 assert.equal((await listExams(u,db)).data.find(e=>e.exam_number===another)!.groups.length,1)
 // Explicitly switching a standalone group must hide the previous group atomically.
 const sibling=(await loadExamSet(another,db)).groups.find(g=>g.group_number===2)!
 const siblingSaved=await saveQuestionGroup(sibling.id,{lock_version:sibling.lock_version,passages:[{label:'A',content_blocks:[{type:'text',text:'Second synthetic passage'}]}]},{db})
 for(let i=0;i<8;i++)await saveQuestion(sample(another,8+i,{group_id:sibling.id,group_question_number:i+1,passage_references:[{passage_id:siblingSaved.passages[0]!.id,anchor_id:null}]}),{db,requireCompleteExam:false})
 const switchSet=await loadExamSet(another,db);await publishExamSet(another,switchSet.lock_version,{db,groupIds:[sibling.id]})
 const switched=(await listExams(u,db)).data.find(e=>e.exam_number===another)!
 assert.equal(switched.groups.length,1);assert.equal(switched.groups[0]!.id,sibling.id);assert.deepEqual(switched.question_numbers,[8,9,10,11,12,13,14,15])

}))
