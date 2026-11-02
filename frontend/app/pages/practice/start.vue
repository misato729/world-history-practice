<script setup lang="ts">
import { selectPracticePositions, shufflePracticeSequence } from '~/utils/practiceSequence'
import type { ExamCatalogEntry } from '~/utils/examCatalog'

useSeoMeta({ title: '演習を準備しています', robots: 'noindex' })
const route = useRoute()
const { $api: api } = useNuxtApp()
const { accessToken, authHeaders, ensureCurrentUser } = useAuth()
const error = ref('')
let generation = 0
let mounted = false
const prepare = async () => {
  const request = ++generation
  const path = route.fullPath
  const token = accessToken.value
  const current = () => mounted && request === generation && path === route.fullPath && token === accessToken.value
  error.value = ''
  try {
    if (token && !await ensureCurrentUser(true)) throw new Error('qualification')
    if (!current()) return
    const query = Object.fromEntries(['exams', 'major_category_code', 'category_code', 'history_topic', 'order', 'seed']
      .flatMap(key => typeof route.query[key] === 'string' ? [[key, route.query[key] as string]] : []))
    const exams = (query.exams ?? '').split(',').map(Number).filter(value => Number.isSafeInteger(value) && value > 0)
    if (!exams.length) { error.value = '模擬試験を選択してください。'; return }
    const subjectQuery = Object.fromEntries(['major_category_code', 'category_code', 'history_topic'].flatMap(key => query[key] ? [[key, query[key]!]] : []))
    const response = await api<{ data: ExamCatalogEntry[] }>('/api/v1/exams', { query: subjectQuery, headers: authHeaders.value })
    if (!current()) return
    let sequence = selectPracticePositions(response.data.filter(exam => exam.access !== 'paid_membership_required'), exams)
    if (query.order === 'random') {
      const seed = Number(query.seed)
      if (!query.seed || !/^\d+$/.test(query.seed) || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xFFFFFFFF) {
        error.value = 'ランダム演習の指定が正しくありません。条件を選び直してください。'
        return
      }
      sequence = shufflePracticeSequence(sequence, seed)
    }
    const first = sequence[0]
    if (!first) { error.value = 'この条件に合う公開問題はまだありません。分野や対象模擬試験を変更してください。'; return }
    await navigateTo({ path: `/practice/${first.examNumber}/${first.questionNumber}`, query }, { replace: true })
  }
  catch { if (current()) error.value = '演習を開始できませんでした。通信状況を確認して、もう一度お試しください。' }
}
onMounted(() => { mounted = true; void prepare() })
watch([() => route.fullPath, accessToken], () => { if (mounted) void prepare() }, { flush: 'sync' })
onScopeDispose(() => { mounted = false; generation++ })
</script>

<template>
  <section class="practice-start" aria-label="演習の開始">
    <h1>演習を準備しています</h1>
    <p v-if="!error" role="status">条件に合う公開問題を確認しています。</p>
    <div v-else role="alert"><p>{{ error }}</p><button type="button" @click="prepare">再確認</button></div>
    <NuxtLink to="/#practice-launcher">条件を選び直す</NuxtLink>
  </section>
</template>

<style scoped>
.practice-start { padding: 32px; max-width: 900px; margin: auto; overflow-wrap: anywhere; }
.practice-start h1 { font-size: 1.5rem; }
.practice-start p { margin: 20px 0; }
.practice-start button { min-height: 44px; margin: 0 16px 20px 0; }
</style>
