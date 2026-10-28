<script setup lang="ts">
import type { ExamSet, QuestionGroup, GroupPassage, PassageReference } from '../../../../shared/types/learning'
import type { AdminQuestion, ApiResponse, ContentBlock, PaginatedApiResponse, AdminQuestionSummary } from '~/types/adminQuestion'

definePageMeta({ layout: 'admin', middleware: 'admin' })
type DraftPassage = Omit<GroupPassage, 'id' | 'content_blocks'> & { id?: number; content_blocks: ContentBlock[] }
type GroupQuestion = { id: number; question_number: number; group_question_number: number; answer_type?: string; publication_status: string; content_blocks: ContentBlock[]; passage_references?: PassageReference[]; answer_history_count?: number }
type EditableGroup = Omit<QuestionGroup, 'passages' | 'questions'> & { passages: DraftPassage[]; questions: GroupQuestion[]; affected_history_count?: number }
const route = useRoute()
const examNumber = computed(() => Number(route.params.examNumber))
const { $api: api } = useNuxtApp()
const { authHeaders, logout } = useAuth()
const { data: response, status, error, refresh } = await useFetch<ApiResponse<ExamSet>>(() => `/api/v1/admin/exams/${examNumber.value}`, { $fetch: api, headers: authHeaders, server: false })
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
const exam = ref<ExamSet | null>(null)
const selectedGroupId = ref<number | null>(null)
const group = ref<EditableGroup | null>(null)
const savedGroup = ref<EditableGroup | null>(null)
const loadingGroup = ref(false)
const busy = ref(false)
const actionError = ref('')
const successMessage = ref('')
const validation = ref<{ valid: boolean; errors: string[] } | null>(null)
const previewOpen = ref(false)
const previewLoading = ref(false)
const previewQuestions = ref<AdminQuestion[]>([])
const usedNumbers = ref<number[]>([])
const newGroupSize = ref(8)
let groupRequest = 0
const affectedQuestions = computed(() => {
  if (!group.value || !savedGroup.value) return []
  const changedPassageIds = savedGroup.value.passages.filter(previous => {
    const current = group.value!.passages.find(passage => passage.id === previous.id)
    return !current || current.label !== previous.label || JSON.stringify(current.content_blocks) !== JSON.stringify(previous.content_blocks)
  }).map(passage => passage.id)
  return savedGroup.value.questions.filter(question => question.passage_references?.some(reference => changedPassageIds.includes(reference.passage_id)))
})
const affectedHistoryCount = computed(() => affectedQuestions.value.reduce((count, question) => count + (question.answer_history_count ?? 0), 0))

watch(() => response.value?.data, (value) => {
  if (!value) return
  exam.value = clone(value)
  if (!value.groups?.some(item => item.id === selectedGroupId.value)) {
    const requestedId = Number(route.query.group_id)
    selectedGroupId.value = value.groups?.find(item => item.id === requestedId)?.id ?? value.groups?.[0]?.id ?? null
  }
}, { immediate: true })

const requestError = async (failure: any) => {
  const code = failure?.statusCode ?? failure?.status
  if (code === 401 || code === 403) {
    logout()
    await navigateTo({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  actionError.value = failure?.data?.error?.message ?? '保存できませんでした。入力内容と通信状態を確認してください。'
}
const run = async (action: () => Promise<void>) => {
  if (busy.value) return
  busy.value = true; actionError.value = ''; successMessage.value = ''; validation.value = null
  try { await action() } catch (failure) { await requestError(failure) } finally { busy.value = false }
}
const loadUsedNumbers = async () => {
  try {
    const value = await api<PaginatedApiResponse<AdminQuestionSummary>>('/api/v1/admin/questions', { headers: authHeaders.value, query: { exam_number: examNumber.value, per_page: 100 } })
    usedNumbers.value = value.data.map(question => question.question_number)
  } catch { /* The server still validates duplicate numbers when creating a question. */ }
}
const nextQuestionNumber = computed(() => {
  let number = 1
  while (usedNumbers.value.includes(number)) number += 1
  return number
})
const newQuestionLink = computed(() => ({ path: '/admin/questions/new', query: { exam_number: examNumber.value, question_number: nextQuestionNumber.value, group_id: group.value?.id, group_question_number: (group.value?.questions.length ?? 0) + 1 } }))

watch(selectedGroupId, async (id) => {
  const request = ++groupRequest
  group.value = null; savedGroup.value = null; previewOpen.value = false; previewQuestions.value = []
  if (!id) { loadingGroup.value = false; return }
  loadingGroup.value = true
  try {
    const value = await api<ApiResponse<QuestionGroup>>(`/api/v1/admin/question_groups/${id}`, { headers: authHeaders.value })
    if (request === groupRequest) { group.value = clone(value.data) as EditableGroup; savedGroup.value = clone(value.data) as EditableGroup }
  } catch (failure) { if (request === groupRequest) await requestError(failure) }
  finally { if (request === groupRequest) loadingGroup.value = false }
}, { immediate: true })
onMounted(loadUsedNumbers)

const saveExam = () => run(async () => {
  if (!exam.value) return
  await api(`/api/v1/admin/exams/${examNumber.value}`, { method: 'PATCH', headers: authHeaders.value, body: { exam: { title: exam.value.title, format_code: exam.value.format_code, publication_status: exam.value.publication_status, lock_version: exam.value.lock_version } } })
  await refresh(); successMessage.value = '教材の設定を保存しました。'
})
const addGroup = () => run(async () => {
  const number = Math.max(0, ...(exam.value?.groups.map(item => item.group_number) ?? [])) + 1
  const value = await api<ApiResponse<QuestionGroup>>(`/api/v1/admin/exams/${examNumber.value}/groups`, { method: 'POST', headers: authHeaders.value, body: { group: { group_number: number, title: `大問${number}`, planned_question_count: newGroupSize.value, publication_status: 'draft', passages: [] } } })
  await refresh(); selectedGroupId.value = value.data.id; successMessage.value = '大問の下書きを作成しました。'
})
const addPassage = () => {
  if (!group.value) return
  const labels = new Set(group.value.passages.map(passage => passage.label))
  let index = 0
  while (labels.has(String.fromCharCode(65 + index))) index += 1
  group.value.passages.push({ label: String.fromCharCode(65 + index), display_order: group.value.passages.length + 1, content_blocks: [{ type: 'text', text: '' }] })
}
const movePassage = (index: number, direction: -1 | 1) => {
  if (!group.value) return
  const target = index + direction
  if (target < 0 || target >= group.value.passages.length) return
  const [passage] = group.value.passages.splice(index, 1)
  if (passage) group.value.passages.splice(target, 0, passage)
}
const moveQuestion = (index: number, direction: -1 | 1) => {
  if (!group.value) return
  const target = index + direction
  if (target < 0 || target >= group.value.questions.length) return
  const [question] = group.value.questions.splice(index, 1)
  if (question) group.value.questions.splice(target, 0, question)
}
const saveGroup = () => run(async () => {
  if (!group.value) return
  const value = await api<ApiResponse<QuestionGroup>>(`/api/v1/admin/question_groups/${group.value.id}`, { method: 'PUT', headers: authHeaders.value, body: { group: { group_number: group.value.group_number, title: group.value.title, planned_question_count: group.value.planned_question_count, publication_status: group.value.publication_status, lock_version: group.value.lock_version, passages: group.value.passages.map((passage, index) => ({ ...passage, display_order: index + 1 })), question_ids: group.value.questions.map(question => question.id) } } })
  group.value = clone(value.data) as EditableGroup; savedGroup.value = clone(value.data) as EditableGroup; previewOpen.value = false
  await refresh(); await loadUsedNumbers(); successMessage.value = '大問と共通本文を保存しました。'
})
const validateExam = () => run(async () => {
  const value = await api<ApiResponse<{ valid: boolean; errors: string[] }>>(`/api/v1/admin/exams/${examNumber.value}/validate`, { method: 'POST', headers: authHeaders.value, body: { lock_version: exam.value?.lock_version } })
  validation.value = value.data
})
const publishExam = () => run(async () => {
  await api(`/api/v1/admin/exams/${examNumber.value}/publish`, { method: 'POST', headers: authHeaders.value, body: { lock_version: exam.value?.lock_version } })
  await refresh()
  if (selectedGroupId.value) {
    const value = await api<ApiResponse<QuestionGroup>>(`/api/v1/admin/question_groups/${selectedGroupId.value}`, { headers: authHeaders.value }); group.value = clone(value.data) as EditableGroup; savedGroup.value = clone(value.data) as EditableGroup
  }
  successMessage.value = '公開条件を確認し、教材を公開しました。'
})
const deleteGroup = () => run(async () => {
  if (!group.value || group.value.questions.length) return
  await api(`/api/v1/admin/question_groups/${group.value.id}`, { method: 'DELETE', headers: authHeaders.value })
  selectedGroupId.value = null; group.value = null; savedGroup.value = null; await refresh(); successMessage.value = '空の大問を削除しました。'
})
const togglePreview = async () => {
  if (previewOpen.value) { previewOpen.value = false; return }
  if (!group.value || previewLoading.value) return
  const previewGroupId = group.value.id
  previewLoading.value = true
  try {
    const values = await Promise.all(group.value.questions.map(question => api<ApiResponse<AdminQuestion>>(`/api/v1/admin/questions/${question.id}`, { headers: authHeaders.value })))
    if (group.value?.id === previewGroupId) { previewQuestions.value = values.map(value => value.data); previewOpen.value = true }
  } catch (failure) { await requestError(failure) } finally { previewLoading.value = false }
}
const excerpt = (blocks: ContentBlock[]) => blocks.map(block => block.text ?? block.inlines?.map(part => part.type === 'blank' ? `【${part.label}】` : part.text).join('') ?? '').join(' ').slice(0, 100)
</script>

<template>
  <div class="admin-page exam-editor-page">
    <header class="admin-page-head"><div><h1>教材・大問を編集</h1><p>試験 {{ examNumber }} の構成と共通本文を管理します。</p></div><NuxtLink class="admin-secondary-button" to="/admin/exams">教材一覧</NuxtLink></header>
    <p v-if="successMessage" class="editor-success" role="status">{{ successMessage }}</p>
    <p v-if="actionError" class="admin-inline-error" role="alert">{{ actionError }}</p>
    <div v-if="status === 'pending'" class="admin-panel admin-loading"><div>教材を読み込んでいます。</div></div>
    <div v-else-if="error || !exam" class="admin-panel admin-empty"><div><h2>教材を読み込めませんでした</h2><button class="admin-secondary-button" type="button" @click="() => refresh()">再読み込み</button></div></div>
    <template v-else>
      <section class="admin-panel">
        <div class="admin-panel-head"><div><h2>教材の設定</h2><p>未完成の内容を保存するときは、教材全体を非公開にして編集します。</p></div></div>
        <form class="admin-panel-body exam-settings" novalidate @submit.prevent="saveExam">
          <div class="admin-field"><label for="exam-title">教材名</label><input id="exam-title" v-model="exam.title" type="text"></div>
          <div class="admin-field"><label for="exam-format">教材の構成</label><select id="exam-format" v-model="exam.format_code"><option value="legacy_practice">従来の問題演習</option><option value="group_practice">単独大問（7〜8問）</option><option value="rekiken_mock">模試（4大問・30問）</option></select></div>
          <div class="admin-field"><label for="exam-status">教材の公開状態</label><select id="exam-status" v-model="exam.publication_status"><option value="draft">下書き</option><option value="private">非公開</option><option value="published">公開</option></select></div>
          <button class="admin-primary-button" type="submit" :disabled="busy">教材の設定を保存</button>
        </form>
      </section>
      <div class="group-workspace">
        <aside class="admin-panel group-navigation">
          <details open><summary>大問の構成</summary><nav aria-label="大問の構成"><button v-for="item in exam.groups" :key="item.id" type="button" :class="{ selected: selectedGroupId === item.id }" :disabled="busy" @click="selectedGroupId = item.id"><strong>大問{{ item.group_number }}</strong><span>{{ item.title }}</span><small>{{ item.questions?.length ?? 0 }} / {{ item.planned_question_count }}問</small></button></nav></details>
          <div class="new-group"><div class="admin-field"><label for="new-group-size">追加する大問の予定問数</label><select id="new-group-size" v-model.number="newGroupSize"><option :value="7">7問</option><option :value="8">8問</option></select></div><button class="admin-secondary-button" type="button" :disabled="busy || response?.data.format_code === 'legacy_practice'" @click="addGroup"><UIcon name="i-lucide-plus" />大問を追加</button><p v-if="response?.data.format_code === 'legacy_practice'" class="editor-note">教材の構成を単独大問又は模試に変更して保存してください。</p></div>
        </aside>
        <div class="group-content">
          <div v-if="loadingGroup" class="admin-panel admin-loading"><div>大問を読み込んでいます。</div></div>
          <div v-else-if="!group" class="admin-panel admin-empty"><div><h2>大問を選択してください</h2><p>新しい教材は「大問を追加」から作成できます。</p></div></div>
          <form v-else class="group-form" novalidate @submit.prevent="saveGroup">
            <section class="admin-panel"><div class="admin-panel-head"><div><h2>大問{{ group.group_number }}</h2><p>共通本文と小問の並びを設定します。</p></div></div><div class="admin-panel-body admin-form-grid"><div class="admin-field"><label for="group-number">大問番号</label><input id="group-number" v-model.number="group.group_number" type="number" min="1"></div><div class="admin-field"><label for="group-title">大問のタイトル</label><input id="group-title" v-model="group.title" type="text"></div><div class="admin-field"><label for="group-size">予定する小問数</label><select id="group-size" v-model.number="group.planned_question_count"><option :value="7">7問</option><option :value="8">8問</option></select></div><div class="admin-field"><label for="group-status">大問の公開状態</label><select id="group-status" v-model="group.publication_status"><option v-for="item in PUBLICATION_STATUSES" :key="item.value" :value="item.value">{{ item.label }}</option></select></div></div></section>
            <section class="admin-panel"><div class="admin-panel-head"><div><h2>共通本文</h2><p>A・Bなどの本文を登録し、文章内に参照箇所や空欄を付けられます。</p></div><button class="admin-secondary-button" type="button" @click="addPassage">本文を追加</button></div><div class="admin-panel-body passages-editor"><p v-if="!group.passages.length" class="editor-note">本文を追加して保存すると、小問の編集画面から参照できます。</p><article v-for="(passage, index) in group.passages" :key="passage.id ?? `new-${index}`" class="passage-editor"><header><div class="admin-field"><label :for="`passage-label-${index}`">本文のラベル</label><input :id="`passage-label-${index}`" v-model="passage.label" type="text" placeholder="A"></div><div class="passage-actions"><button class="admin-icon-button" type="button" title="本文を上へ" :disabled="index === 0" @click="movePassage(index, -1)"><UIcon name="i-lucide-arrow-up" /></button><button class="admin-icon-button" type="button" title="本文を下へ" :disabled="index === group.passages.length - 1" @click="movePassage(index, 1)"><UIcon name="i-lucide-arrow-down" /></button><button class="admin-icon-button" type="button" title="本文を削除" @click="group.passages.splice(index, 1)"><UIcon name="i-lucide-trash-2" /></button></div></header><AdminContentBlockEditor v-model="passage.content_blocks" context="question" allow-references /></article></div></section>
            <section class="admin-panel"><div class="admin-panel-head"><div><h2>小問（{{ group.questions.length }} / {{ group.planned_question_count }}問）</h2><p>並びを変更しても、問題IDと通し番号は維持されます。</p></div><NuxtLink class="admin-secondary-button" :to="newQuestionLink">小問を作成</NuxtLink></div><div class="admin-panel-body"><ol class="group-questions"><li v-for="(question, index) in group.questions" :key="question.id"><div><strong>問{{ index + 1 }} <small>通し問{{ question.question_number }}・{{ question.answer_type === 'essay' ? '論述' : question.answer_type === 'short_text' ? '語句記述' : '選択式' }}</small></strong><p>{{ excerpt(question.content_blocks) }}</p></div><div class="question-actions"><button class="admin-icon-button" type="button" title="小問を上へ" :disabled="index === 0" @click="moveQuestion(index, -1)"><UIcon name="i-lucide-arrow-up" /></button><button class="admin-icon-button" type="button" title="小問を下へ" :disabled="index === group.questions.length - 1" @click="moveQuestion(index, 1)"><UIcon name="i-lucide-arrow-down" /></button><NuxtLink class="admin-secondary-button" :to="`/admin/questions/${question.id}/edit`">編集</NuxtLink></div></li></ol><p v-if="!group.questions.length" class="editor-note">共通本文を保存してから、小問を作成してください。</p></div></section>
            <div class="group-save-bar"><p v-if="affectedQuestions.length" class="editor-note">共通本文の変更は、通し{{ affectedQuestions.map(question => `問${question.question_number}`).join('・') }}に影響します。保存すると、これらの回答履歴{{ affectedHistoryCount }}件が削除されます。</p><div><button class="admin-secondary-button" type="button" :disabled="previewLoading" @click="togglePreview">{{ previewLoading ? '読み込み中' : previewOpen ? '全体プレビューを閉じる' : '大問全体をプレビュー' }}</button><button class="admin-primary-button" type="submit" :disabled="busy">{{ busy ? '保存中です' : '大問・共通本文を保存' }}</button><button v-if="!group.questions.length" class="admin-secondary-button" type="button" :disabled="busy" @click="deleteGroup">空の大問を削除</button></div></div>
          </form>
          <section v-if="previewOpen && group" class="admin-panel"><div class="admin-panel-head"><h2>大問全体のプレビュー</h2></div><div class="admin-panel-body group-preview"><header><h2>{{ group.title }}</h2><article v-for="passage in group.passages" :key="passage.id ?? passage.label"><h3>【{{ passage.label }}】</h3><QuestionContentBlocks :blocks="passage.content_blocks" /></article></header><AdminQuestionPreview v-for="question in previewQuestions" :key="question.id" :question="question" /></div></section>
        </div>
      </div>
      <section class="admin-panel publish-panel"><div class="admin-panel-head"><div><h2>公開前の確認</h2><p>保存済みの内容を検査します。未完成のまま公開することはできません。</p></div></div><div class="admin-panel-body"><div class="publish-actions"><button class="admin-secondary-button" type="button" :disabled="busy" @click="validateExam">公開条件を検査</button><button class="admin-primary-button" type="button" :disabled="busy" @click="publishExam">検査して教材を公開</button></div><div v-if="validation" class="validation-result" :class="{ valid: validation.valid }" role="status"><strong>{{ validation.valid ? '公開条件を満たしています。' : '次の内容を確認してください。' }}</strong><ul v-if="validation.errors.length"><li v-for="(message, index) in validation.errors" :key="index">{{ message }}</li></ul></div></div></section>
    </template>
  </div>
</template>

<style scoped>
.editor-success { margin: 0 0 18px; padding: 13px 15px; border: 1px solid #287b78; border-radius: 5px; color: #8dd8d4; background: #112323; font-size: .8125rem; }
.exam-settings { display: grid; grid-template-columns: 2fr 1.3fr 1fr auto; align-items: end; gap: 14px; }
.exam-settings .admin-field { min-width: 0; }
.group-workspace { display: grid; grid-template-columns: 245px minmax(0, 1fr); align-items: start; gap: 18px; margin-top: 18px; }
.group-navigation { min-width: 0; position: sticky; top: 80px; }
.group-navigation summary { padding: 16px; font-weight: 800; cursor: pointer; font-size: .875rem; }
.group-navigation nav { display: grid; gap: 4px; padding: 0 8px 12px; }
.group-navigation nav button { display: grid; gap: 5px; min-width: 0; padding: 12px; border: 1px solid transparent; border-radius: 5px; background: transparent; color: var(--admin-text); text-align: left; cursor: pointer; }
.group-navigation nav button.selected { border-color: var(--admin-line-strong); background: var(--admin-selection); }
.group-navigation nav span,.group-navigation nav small { overflow-wrap: anywhere; color: var(--admin-muted); font-size: .75rem; }
.new-group { display: grid; gap: 12px; padding: 16px; border-top: 1px solid var(--admin-line); }
.group-content,.group-form { min-width: 0; display: grid; gap: 18px; }
.passages-editor { display: grid; gap: 18px; }
.passage-editor { min-width: 0; padding: 14px; border: 1px solid var(--admin-line); border-radius: 6px; }
.passage-editor > header { display: flex; align-items: end; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.passage-editor > header .admin-field { width: min(180px, 100%); }
.passage-actions,.question-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.admin-icon-button { width: 34px; min-height: 34px; padding: 0; }
.group-questions { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
.group-questions li { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--admin-line); }
.group-questions li:last-child { border-bottom: 0; }
.group-questions strong { font-size: .875rem; }
.group-questions small { color: var(--admin-muted); font-size: .6875rem; font-weight: 500; }
.group-questions p,.editor-note { margin: 7px 0 0; color: var(--admin-muted); font-size: .75rem; line-height: 1.7; overflow-wrap: anywhere; }
.group-save-bar { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--admin-line-strong); border-radius: 6px; background: var(--admin-chrome); }
.group-save-bar > div,.publish-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.group-preview { display: grid; gap: 20px; }
.group-preview > header { padding: 22px; background: var(--surface); color: var(--ink); border-radius: 6px; }
.group-preview > header h2 { margin: 0 0 20px; font-size: 1.25rem; }
.group-preview article + article { margin-top: 24px; }
.publish-panel { margin-top: 18px; }
.validation-result { margin-top: 18px; padding: 16px; border: 1px solid var(--admin-line); border-radius: 5px; font-size: .8125rem; line-height: 1.8; }
.validation-result.valid { border-color: #287b78; color: #8dd8d4; }
.validation-result ul { margin: 10px 0 0; padding-left: 20px; }
@media (max-width: 1250px) { .exam-settings { grid-template-columns: 1fr 1fr; } .group-workspace { grid-template-columns: 200px minmax(0, 1fr); } }
@media (max-width: 900px) { .group-workspace { grid-template-columns: 1fr; } .group-navigation { position: static; } .group-navigation nav { grid-template-columns: repeat(2, minmax(0, 1fr)); } .group-questions li { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .exam-settings,.group-navigation nav { grid-template-columns: 1fr; } .passage-editor { padding: 10px; } .passage-editor > header { align-items: stretch; flex-direction: column; } .group-save-bar > div,.publish-actions { display: grid; grid-template-columns: 1fr; } .group-preview > header { padding: 16px; } }
</style>
