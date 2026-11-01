import type { PracticeAttempt } from './types/practiceAttempt.ts'
export function summarizeAttempt(attempt: PracticeAttempt) {
 if(attempt.status==='invalidated') return []
 return [...new Set(attempt.manifest.items.map(q=>q.exam_number))].map(exam=>{
  const items=attempt.manifest.items.filter(q=>q.exam_number===exam).sort((a,b)=>(a.group_number??0)-(b.group_number??0)||(a.group_question_number??a.question_number)-(b.group_question_number??b.question_number))
  const automatic=items.filter(q=>q.answer_type!=='essay'),essays=items.filter(q=>q.answer_type==='essay')
  const correct=automatic.filter(q=>attempt.answers[q.id]?.is_correct===true).length
  const answered=items.filter(q=>attempt.answers[q.id]).length
  const autoPoints=automatic.reduce((n,q)=>n+(attempt.answers[q.id]?.is_correct===true?q.points:0),0)
  const essayPoints=essays.reduce((n,q)=>n+(attempt.answers[q.id]?.essay_result?.confirmed_points??0),0)
  const pending=essays.some(q=>!attempt.answers[q.id]?.essay_result || attempt.answers[q.id]!.essay_result!.grading_status!=='complete')
  return {exam,items,full:attempt.manifest.full_exams.includes(exam),answered,unanswered:items.length-answered,correct,automaticCount:automatic.length,autoPoints,autoMax:automatic.reduce((n,q)=>n+q.points,0),essayPoints,essayAnswered:essays.filter(q=>Boolean(attempt.answers[q.id]?.essay_result)).length,essayMax:essays.reduce((n,q)=>n+q.points,0),pending,total:pending?null:autoPoints+essayPoints,max:items.reduce((n,q)=>n+q.points,0)}
 })
}
export function attemptItemLabel(item: PracticeAttempt['manifest']['items'][number]) {
 return item.group_number?`大問${item.group_number}・問${item.group_question_number}`:`問${item.question_number}`
}
export function attemptItemStatus(attempt: PracticeAttempt, id: number) {
 const answer=attempt.answers[id]
 if(!answer)return '未回答'
 if(answer.essay_result)return answer.essay_result.grading_status==='complete'?'参考採点済み':'判定保留'
 return answer.is_correct===true?'正解':answer.is_correct===false?'不正解':'判定保留'
}
