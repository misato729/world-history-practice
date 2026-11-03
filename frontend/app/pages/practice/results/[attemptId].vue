<script setup lang="ts">
import type {PracticeAttempt} from '../../../../shared/types/practiceAttempt'
const route=useRoute(),{get,start,message}=usePracticeAttempt()
const attempt=ref<PracticeAttempt|null>(null),error=ref(''),loading=ref(true),restarting=ref(false)
const load=async()=>{loading.value=true;error.value='';try{const data=await get(String(route.params.attemptId));if(data.status!=='completed')throw Error('この演習はまだ終了していません。');attempt.value=data}catch(e:any){attempt.value=null;error.value=message(e,'結果を読み込めませんでした。')}finally{loading.value=false}}
const {accessToken}=useAuth()
watch(accessToken,()=>{attempt.value=null;void load()})
onMounted(load)
const restart=async()=>{if(!attempt.value||restarting.value)return;restarting.value=true;try{const next=await start(attempt.value.manifest.items.map(q=>({examNumber:q.exam_number,questionNumber:q.question_number})));const first=next.manifest.items[0]!;await navigateTo({path:`/practice/${first.exam_number}/${first.question_number}`,query:{attempt:next.id}})}catch(e:any){error.value=e?.data?.error?.message??'演習を開始できませんでした。'}finally{restarting.value=false}}
</script>
<template><div class="page-wrap result-wrap"><p v-if="loading" role="status">結果を読み込んでいます</p><div v-else-if="error" role="alert"><h1>結果を表示できません</h1><p>{{ error }}</p><button class="secondary-link" type="button" @click="load">再読み込み</button><NuxtLink class="secondary-link" to="/">トップへ戻る</NuxtLink></div><template v-else-if="attempt"><IncorrectReviewCompletion v-if="route.query.review === 'incorrect'" /><PracticeAttemptResults :attempt="attempt" @restart="restart" /></template></div></template>
<style scoped>.result-wrap{max-width:960px;min-height:60vh;padding-top:32px;padding-bottom:48px}</style>
