<script setup lang="ts">
import type { ExamSet } from '../../../../shared/types/learning'
import type { ApiResponse } from '~/types/adminQuestion'

definePageMeta({ layout: 'admin', middleware: 'admin' })
const { $api: api } = useNuxtApp()
const { authHeaders } = useAuth()
const { data: response, status, error, refresh } = await useFetch<ApiResponse<ExamSet[]>>('/api/v1/admin/exams', { $fetch: api, headers: authHeaders, server: false })
const formatLabels: Record<string, string> = { legacy_practice: '従来の問題演習', group_practice: '単独大問の演習', rekiken_mock: '4大問・30問の模試' }
const formatLabel = (code: string) => formatLabels[code] ?? code
const availableNumbers = computed(() => Array.from({ length: EXAM_CONFIG.exam.set_count }, (_, index) => index + 1))
const selectedNumber = ref(1)
</script>

<template>
  <div class="admin-page">
    <header class="admin-page-head"><div><h1>教材・大問</h1><p>教材の構成、共通本文、小問、公開状態を管理します。</p></div><NuxtLink class="admin-secondary-button" to="/admin/questions">問題一覧</NuxtLink></header>
    <section class="admin-panel">
      <div class="admin-panel-head"><div><h2>教材を選ぶ</h2><p>単独大問と30問の模試を、それぞれの構成で作成できます。</p></div></div>
      <div class="admin-panel-body choose-exam"><div class="admin-field"><label for="manage-exam-number">試験ナンバー</label><select id="manage-exam-number" v-model.number="selectedNumber"><option v-for="number in availableNumbers" :key="number" :value="number">{{ number }}</option></select></div><NuxtLink class="admin-primary-button" :to="`/admin/exams/${selectedNumber}`">教材を管理</NuxtLink></div>
    </section>
    <p v-if="status === 'pending'" class="load-message" role="status">教材を読み込んでいます。</p>
    <div v-else-if="error" class="admin-panel admin-empty"><div><h2>教材を読み込めませんでした</h2><button class="admin-secondary-button" type="button" @click="() => refresh()">再読み込み</button></div></div>
    <section v-else class="exam-list">
      <article v-for="exam in response?.data ?? []" :key="exam.exam_number" class="admin-panel exam-entry">
        <div><span class="exam-label">試験 {{ exam.exam_number }}・{{ formatLabel(exam.format_code) }}</span><h2>{{ exam.title || `試験 ${exam.exam_number}` }}</h2><p>{{ exam.groups?.length ?? 0 }}大問・{{ getMasterDataLabel(PUBLICATION_STATUSES, exam.publication_status) }}</p></div><NuxtLink class="admin-secondary-button" :to="`/admin/exams/${exam.exam_number}`">構成を編集<UIcon name="i-lucide-chevron-right" /></NuxtLink>
      </article>
      <p v-if="!response?.data.length" class="load-message">登録済みの教材はありません。試験ナンバーを選んで作成してください。</p>
    </section>
  </div>
</template>

<style scoped>
.choose-exam { display: flex; gap: 16px; align-items: end; }
.choose-exam .admin-field { width: min(260px, 100%); }
.exam-list { display: grid; gap: 14px; margin-top: 20px; }
.exam-entry { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 22px; }
.exam-entry h2 { margin: 7px 0; font-size: 1.125rem; }
.exam-label,.exam-entry p,.load-message { color: var(--admin-muted); font-size: .8125rem; line-height: 1.7; }
.exam-entry p { margin: 0; }
.load-message { padding: 18px 0; }
@media (max-width: 640px) { .choose-exam,.exam-entry { align-items: stretch; flex-direction: column; } .choose-exam .admin-field { width: 100%; } }
</style>
