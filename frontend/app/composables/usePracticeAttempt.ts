import type {PracticeAttempt,AttemptAnswer} from '../../shared/types/practiceAttempt'
export const usePracticeAttempt = () => {
 const { $api:api }=useNuxtApp()
 const {authHeaders,accessToken,user}=useAuth()
 const attempts=useState<Record<string,PracticeAttempt>>('practice-attempts',()=>({}))
 const guestManifests=useState<Record<string,string>>('practice-guest-manifests',()=>({}))
 const identity=useState<string|null>('practice-attempt-identity',()=>null)
 // These are client-only, tab-local states. They are never written to cookies/localStorage.
 if(import.meta.client&&identity.value!==String(user.value?.id ?? 'guest')){attempts.value={};guestManifests.value={};identity.value=String(user.value?.id ?? 'guest')}
 watch([accessToken, () => user.value?.id],()=>{attempts.value={};guestManifests.value={};identity.value=String(user.value?.id ?? 'guest')})
 const get=async(id:string)=>{
  try {
  const token=accessToken.value
  const saved=attempts.value[id]
  if(saved?.guest){await api('/api/v1/practice_attempts/validate_guest',{method:'POST',body:{guest_manifest:guestManifests.value[id]}});if(token!==accessToken.value)throw Error('認証状態が変わりました');return saved}
  if(!accessToken.value)throw Error('このタブの演習結果はありません。新しい回として始めてください。')
  const response=await api<{data:PracticeAttempt}>(`/api/v1/practice_attempts/${id}`,{headers:authHeaders.value})
  if(token!==accessToken.value)throw Error('認証状態が変わりました')
  attempts.value[id]=response.data;return response.data
  } catch(error: any) { if (error?.data?.error?.code === 'attempt_invalidated') { delete attempts.value[id];delete guestManifests.value[id] } throw error }
 }
 const start=async(positions:{examNumber:number;questionNumber:number}[])=>{
  const token=accessToken.value
  const response=await api<{data:PracticeAttempt;guest_manifest?:string}>('/api/v1/practice_attempts',{method:'POST',headers:authHeaders.value,body:{positions}})
  if(token!==accessToken.value)throw Error('認証状態が変わりました')
  attempts.value[response.data.id]=response.data
  if(response.guest_manifest)guestManifests.value[response.data.id]=response.guest_manifest
  return response.data
 }
 const recordGuest=(id:string,questionId:number,result:AttemptAnswer)=>{
  const attempt=attempts.value[id]
  if(attempt?.guest&&attempt.status==='active'&&!attempt.answers[questionId])attempt.answers[questionId]=result
 }
 const finish=async(id:string,confirmUnanswered:boolean)=>{
  const token=accessToken.value,attempt=await get(id)
  if(attempt.guest){
   if(!confirmUnanswered&&attempt.manifest.items.some(q=>!attempt.answers[q.id]))throw Error('未回答の問題があります')
   attempt.status='completed';attempt.completed_at=new Date().toISOString();return attempt
  }
  const response=await api<{data:PracticeAttempt}>(`/api/v1/practice_attempts/${id}/finish`,{method:'POST',headers:authHeaders.value,body:{confirm_unanswered:confirmUnanswered}})
  if(token!==accessToken.value)throw Error('認証状態が変わりました')
  attempts.value[id]=response.data;return response.data
 }
 const message=(error:any,fallback:string)=>error?.data?.error?.message ?? (error?.name==='FetchError' ? '通信できませんでした。接続を確認して、もう一度お試しください。' : error?.message) ?? fallback
 return {attempts,start,get,finish,recordGuest,message}
}
