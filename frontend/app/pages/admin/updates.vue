<script setup lang="ts">
import type {ServiceUpdate} from '../../../shared/types/updates'
definePageMeta({layout:'admin',middleware:'admin'})
const {$api:api}=useNuxtApp()
const {authHeaders}=useAuth()
const items=ref<ServiceUpdate[]>([]),error=ref(''),loading=ref(true),busy=ref(false)
const editing=ref<ServiceUpdate|null>(null),removing=ref<number|null>(null)
const date=ref(''),content=ref(''),message=ref('')
let active=true,version=0
onBeforeUnmount(()=>{active=false;version++})
const reload=async()=>{const v=++version;loading.value=true;error.value='';try{const r=await api<{data:ServiceUpdate[]}>('/api/v1/admin/updates',{headers:authHeaders.value});if(active&&v===version)items.value=r.data}catch{if(active&&v===version)error.value='更新履歴を読み込めませんでした。'}finally{if(active&&v===version)loading.value=false}}
const reset=()=>{editing.value=null;date.value='';content.value=''}
const edit=(item:ServiceUpdate)=>{editing.value={...item};date.value=item.published_on;content.value=item.content;message.value=''}
const save=async()=>{if(busy.value)return;busy.value=true;error.value='';message.value='';try{await api(editing.value?`/api/v1/admin/updates/${editing.value.id}`:'/api/v1/admin/updates',{method:editing.value?'PATCH':'POST',headers:authHeaders.value,body:{published_on:date.value,content:content.value,lock_version:editing.value?.lock_version},retry:0});if(!active)return;reset();message.value='更新履歴を保存しました。';await reload()}catch(e:any){if(active)error.value=e?.data?.error?.message??'保存できませんでした。'}finally{busy.value=false}}
const remove=async(item:ServiceUpdate)=>{if(busy.value)return;busy.value=true;error.value='';message.value='';try{await api(`/api/v1/admin/updates/${item.id}`,{method:'DELETE',headers:authHeaders.value,body:{lock_version:item.lock_version},retry:0});if(!active)return;if(editing.value?.id===item.id)reset();removing.value=null;message.value='更新履歴を削除しました。';await reload()}catch(e:any){if(active)error.value=e?.data?.error?.message??'削除できませんでした。'}finally{busy.value=false}}
onMounted(reload)
</script>
<template>
 <div class="updates-admin">
  <h1>更新履歴の管理</h1>
  <section class="content-panel"><h2>{{ editing ? '更新履歴を編集' : '更新履歴を追加' }}</h2>
   <form @submit.prevent="save"><fieldset :disabled="busy"><div class="field"><label for="update-date">日付</label><input id="update-date" v-model="date" type="date" min="0001-01-01" max="9999-12-31" required></div><div class="field"><label for="update-content">内容</label><textarea id="update-content" v-model="content" maxlength="2000" rows="4" required /></div><div class="actions"><button class="primary-link" type="submit">{{ busy ? '処理中です' : '保存' }}</button><button v-if="editing" class="secondary-link" type="button" @click="reset">編集をキャンセル</button></div></fieldset></form>
  </section>
  <p v-if="error" role="alert">{{ error }} <button type="button" :disabled="busy" @click="reload">再読み込み</button></p><p v-if="message" role="status">{{ message }}</p>
  <section class="content-panel"><h2>登録済みの更新履歴</h2><p v-if="loading" role="status">読み込んでいます。</p><p v-else-if="!error && !items.length">更新履歴はありません。</p>
   <ul><li v-for="item in items" :key="item.id"><time :datetime="item.published_on">{{ item.published_on.replaceAll('-', '/') }}</time><p>{{ item.content }}</p><div class="actions"><button class="secondary-link" type="button" :disabled="busy" @click="edit(item)">編集</button><button class="secondary-link" type="button" :disabled="busy" @click="removing=item.id">削除</button></div><div v-if="removing===item.id" class="delete-confirmation"><p>この更新履歴を削除しますか？</p><div class="actions"><button type="button" :disabled="busy" @click="remove(item)">削除する</button><button type="button" :disabled="busy" @click="removing=null">キャンセル</button></div></div></li></ul>
  </section>
 </div>
</template>
<style scoped>
.updates-admin { min-width:0; }.content-panel { margin-top:22px; background:var(--admin-surface); border-color:var(--admin-line); color:var(--admin-text); }
.content-panel p, time { color:var(--admin-muted); }
.field input, textarea { background:var(--admin-surface-2); color:var(--admin-text); border-color:var(--admin-line-strong); }h1 { font-size:1.75rem; }h2 { font-size:1.25rem; }
fieldset { margin:0; padding:0; border:0; min-width:0; }textarea { width:100%; padding:12px; border:1px solid var(--line-strong); border-radius:6px; background:var(--admin-surface-2); font:inherit; }input[type=date] { max-width:240px; }
.actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:16px; }ul { list-style:none; padding:0; margin:0; }li { padding:20px 0; border-bottom:1px solid var(--admin-line); }li p { white-space:pre-wrap; overflow-wrap:anywhere; }time { color:var(--admin-muted); }.delete-confirmation { margin-top:12px; padding:14px; border:1px solid var(--line-strong); }
</style>
