<script setup lang="ts">
import type { ServiceUpdate } from '../../shared/types/updates'
const { $api: api } = useNuxtApp()
const { data, status, refresh } = useAsyncData('service-updates', () => api<{data:ServiceUpdate[]}>('/api/v1/updates'), {server:false})
const dateLabel = (date:string) => date.replaceAll('-', '/')
</script>
<template>
 <section class="updates-history" aria-labelledby="updates-title">
  <h2 id="updates-title">更新履歴</h2>
  <p v-if="status === 'pending' || status === 'idle'" role="status">更新履歴を読み込んでいます。</p>
  <div v-else-if="status === 'error'" role="alert">更新履歴を読み込めませんでした。<button type="button" @click="refresh()">再読み込み</button></div>
  <ul v-else-if="data?.data.length"><li v-for="item in data.data" :key="item.id"><time :datetime="item.published_on">{{ dateLabel(item.published_on) }}</time><span>{{ item.content }}</span></li></ul>
  <p v-else>更新履歴はありません。</p>
 </section>
</template>
<style scoped>
.updates-history { padding:36px var(--home-gutter,24px) 48px; border-top:1px solid var(--line); }
h2 { margin:0 0 22px; font-size:1.5rem; }
ul { margin:0; padding:0; list-style:none; }
li { display:grid; grid-template-columns:110px minmax(0,1fr); gap:18px; padding:16px 0; border-bottom:1px solid var(--line); }
time { color:var(--muted); font-variant-numeric:tabular-nums; }
span { white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.8; }
button { margin-left:10px; text-decoration:underline; cursor:pointer; }
@media(max-width:520px){li { grid-template-columns:1fr; gap:6px; }}
</style>
