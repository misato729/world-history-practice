<script setup lang="ts">
import type { AdminQuestionInput, ApiResponse } from '~/types/adminQuestion'
import { createEmptyQuestion } from '~/types/adminQuestion'
import type { ExamSet, QuestionGroup, PassageReference, TopicLink, SourceReference } from '../../../shared/types/learning'
import type { CulturalHistoryCategoryCode } from '~/utils/examConfig'
import { changeCulturalHistory, CULTURAL_HISTORY_CATEGORIES, normalizeHistoryFlags, selectCulturalHistoryCategory } from '~/utils/historyTopics'
import { normalizeAdminQuestion, prepareAdminQuestion, referenceKey, setPassageReference, essayProfileKey, selectEssayProfile } from '~/utils/adminQuestionForm'

const props = defineProps<{
  initialValue: AdminQuestionInput
  submitLabel: string
  submitting: boolean
  errorMessage?: string
  answerHistoryCount?: number
}>()

const emit = defineEmits<{
  submit: [value: AdminQuestionInput]
}>()

const normalizedForm = (value: AdminQuestionInput): AdminQuestionInput => ({ ...normalizeAdminQuestion(value), ...normalizeHistoryFlags(value) })
const form = reactive<AdminQuestionInput>(normalizedForm(props.initialValue))
const previewOpen = ref(false)
type EssayProfile = { id: string; version: number; title: string; max_characters: number; required_terms: string[]; elements: { id: string; label: string; points: number }[] }
const essayProfiles = ref<EssayProfile[]>([])
const essayProfilesError = ref('')
const essayConfig = computed(() => form.essay_config!)
const essayProfileSelection = computed({ get: () => essayConfig.value.profile_id ? `${essayConfig.value.profile_id}:${essayConfig.value.profile_version}` : '', set: (key: string) => { form.essay_config = selectEssayProfile(essayConfig.value, essayProfiles.value, key) } })
const selectedEssayProfile = computed(() => essayProfiles.value.find(profile => profile.id === essayConfig.value.profile_id && profile.version === essayConfig.value.profile_version))
const { $api: api } = useNuxtApp()
const { authHeaders } = useAuth()
const exam = ref<ExamSet | null>(null)
const group = ref<QuestionGroup | null>(null)
const contextError = ref('')
let examRequest = 0
let groupRequest = 0
const constraints = computed(() => form.input_constraints!)
const sources = computed({ get: () => form.source_references ?? [], set: (value: SourceReference[]) => { form.source_references = value } })
const relatedTopics = computed(() => form.related_topics ?? [])
const acceptedAnswers = computed({ get: () => (form.accepted_answers ?? []).join('\n'), set: (text: string) => { form.accepted_answers = text.split('\n') } })
const relatedMajor = ref(MAJOR_CATEGORIES[0]?.value ?? '')
const relatedCategory = ref(getCategoriesByMajorCategory(relatedMajor.value)[0]?.value ?? '')
const relatedCategories = computed(() => getCategoriesByMajorCategory(relatedMajor.value))
watch(relatedMajor, () => { relatedCategory.value = relatedCategories.value[0]?.value ?? '' })
const addRelatedTopic = () => {
  const topic: TopicLink = { major_category_code: relatedMajor.value, category_code: relatedCategory.value }
  if (!topic.category_code || relatedTopics.value.some(item => item.category_code === topic.category_code)) return
  form.related_topics = [...relatedTopics.value, topic]
}
const loadExam = async () => {
  const request = ++examRequest
  if (import.meta.server) return
  try {
    const response = await api<ApiResponse<ExamSet>>(`/api/v1/admin/exams/${form.exam_number}`, { headers: authHeaders.value })
    if (request === examRequest) { exam.value = response.data; contextError.value = '' }
  } catch { if (request === examRequest) { exam.value = null; contextError.value = '教材情報を読み込めませんでした。' } }
}
const loadGroup = async () => {
  const request = ++groupRequest
  group.value = null
  if (import.meta.server || !form.group_id) return
  try {
    const response = await api<ApiResponse<QuestionGroup>>(`/api/v1/admin/question_groups/${form.group_id}`, { headers: authHeaders.value })
    if (request === groupRequest) { group.value = response.data; contextError.value = '' }
  } catch { if (request === groupRequest) contextError.value = '共通本文を読み込めませんでした。' }
}
watch(() => form.exam_number, loadExam, { immediate: true })
watch(() => form.group_id, loadGroup, { immediate: true })
const changeExam = () => { form.group_id = null; form.group_question_number = null; form.passage_references = [] }
const changeGroup = () => { form.group_question_number = form.group_id ? (exam.value?.groups.find(item => item.id === form.group_id)?.questions?.length ?? 0) + 1 : null; form.passage_references = [] }
const loadEssayProfiles = async () => {
  if (import.meta.server || form.answer_type !== 'essay' || essayProfiles.value.length) return
  try {
    const response = await api<ApiResponse<EssayProfile[]>>('/api/v1/admin/essay_profiles', { headers: authHeaders.value })
    essayProfiles.value = response.data
    essayProfilesError.value = ''
  } catch { essayProfilesError.value = '採点ルールを読み込めませんでした。再読み込みしてください。' }
}
watch(() => form.answer_type, loadEssayProfiles, { immediate: true })
const referenceOptions = computed(() => (group.value?.passages ?? []).flatMap(passage => [
  { passage_id: passage.id, anchor_id: null, label: `【${passage.label}】 全体` },
  ...passage.content_blocks.flatMap(block => (block.inlines ?? []).filter(part => part.type !== 'text' && part.label).map(part => ({ passage_id: passage.id, anchor_id: 'id' in part ? part.id : '', label: `【${passage.label}】 の (${ 'label' in part ? part.label : '' })` }))),
]))
const hasReference = (reference: PassageReference) => (form.passage_references ?? []).some(item => referenceKey(item) === referenceKey(reference))
const toggleReference = (reference: PassageReference, event: Event) => { form.passage_references = setPassageReference(form.passage_references ?? [], reference, (event.target as HTMLInputElement).checked) }
const culturalHistory = computed({
  get: () => form.is_cultural_history,
  set: (checked: boolean) => Object.assign(form, changeCulturalHistory(form, checked)),
})
const culturalHistoryCategory = computed({
  get: () => form.cultural_history_category ?? 'other_cultural_history',
  set: (category: CulturalHistoryCategoryCode) => Object.assign(form, selectCulturalHistoryCategory(category)),
})

watch(() => props.initialValue, (value) => Object.assign(form, normalizedForm(value)), { deep: true })
watch(() => form.answer_type, (type) => { if (type === 'single_choice' && !form.choices.length) form.choices = createEmptyQuestion().choices })

const categories = computed(() => getCategoriesByMajorCategory(form.major_category_code))

watch(() => form.major_category_code, () => {
  if (!categories.value.some(item => item.value === form.category_code)) {
    form.category_code = categories.value[0]?.value ?? ''
  }
})

const setCorrectChoice = (index: number) => {
  form.choices.forEach((choice, choiceIndex) => { choice.is_correct = choiceIndex === index })
}

const submit = () => {
  emit('submit', prepareAdminQuestion(form))
}
</script>

<template>
  <form class="admin-question-form" novalidate @submit.prevent="submit">
    <section class="admin-panel">
      <div class="admin-panel-head"><div><h2>基本情報</h2><p>問題の配置、分類、公開状態を設定します。</p></div></div>
      <div class="admin-panel-body admin-form-grid">
        <div class="admin-field"><label for="question-exam-number">試験ナンバー</label><input id="question-exam-number" v-model.number="form.exam_number" type="number" min="1" :max="EXAM_CONFIG.exam.set_count" required @change="changeExam"></div>
        <div class="admin-field"><label for="question-number">問番号（セット内の通し番号）</label><input id="question-number" v-model.number="form.question_number" type="number" min="1" required></div>
        <div class="admin-field"><label for="question-group">所属する大問</label><select id="question-group" v-model="form.group_id" @change="changeGroup"><option :value="null">所属なし</option><option v-for="item in exam?.groups ?? []" :key="item.id" :value="item.id">大問{{ item.group_number }} {{ item.title }}</option></select><small><NuxtLink :to="`/admin/exams/${form.exam_number}`">教材・共通本文を管理</NuxtLink></small></div>
        <div v-if="form.group_id" class="admin-field"><label for="group-question-number">大問内の小問番号</label><input id="group-question-number" v-model.number="form.group_question_number" type="number" min="1" :max="group?.planned_question_count ?? 8"></div>
        <div class="admin-field"><label for="question-answer-type">回答形式</label><select id="question-answer-type" v-model="form.answer_type" :disabled="form.answer_type_locked"><option value="single_choice">選択式（正答1件）</option><option value="short_text">語句記述</option><option value="essay">論述（要素別ルール採点）</option></select><small v-if="form.answer_type_locked">公開済みの回答形式は変更できません。別の形式にする場合は新しい小問を作成してください。</small></div>
        <div class="admin-field"><label for="question-major-category">大分類</label><select id="question-major-category" v-model="form.major_category_code" required><option v-for="item in MAJOR_CATEGORIES" :key="item.value" :value="item.value">{{ item.label }}</option></select></div>
        <div class="admin-field"><label for="question-category">小分類</label><select id="question-category" v-model="form.category_code" required><option v-for="item in categories" :key="item.value" :value="item.value">{{ item.label }}</option></select></div>
        <fieldset class="history-flags-field">
          <legend>文化史</legend>
          <p>章・節とは別に、問題の主題に応じて1区分を設定します。</p>
          <div>
            <label><input v-model="culturalHistory" type="checkbox"><span>文化史</span></label>
            <div v-if="culturalHistory" class="cultural-history-category admin-field">
              <label for="question-cultural-history-category">文化史の区分</label>
              <select id="question-cultural-history-category" v-model="culturalHistoryCategory" required>
                <option v-for="item in CULTURAL_HISTORY_CATEGORIES" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </div>
          </div>
        </fieldset>
        <fieldset class="publication-field">
          <legend>公開状態</legend>
          <label v-for="item in PUBLICATION_STATUSES" :key="item.value" :class="[`status-${item.value}`, { selected: form.publication_status === item.value }]">
            <input v-model="form.publication_status" type="radio" name="publication-status" :value="item.value">
            <span class="publication-dot" />
            <span><strong>{{ item.label }}</strong><small v-if="item.value === 'draft'">編集中</small><small v-else-if="item.value === 'published'">一般公開</small><small v-else>公開停止</small></span>
          </label>
        </fieldset>
        <p v-if="contextError" class="admin-inline-error full-width" role="alert">{{ contextError }}</p>
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel-head"><div><h2>関連する学習範囲</h2><p>回答の判断に使う章・節を、主分類に加えて複数登録できます。</p></div></div>
      <div class="admin-panel-body">
        <div class="related-topic-input"><div class="admin-field"><label for="related-major">大分類</label><select id="related-major" v-model="relatedMajor"><option v-for="item in MAJOR_CATEGORIES" :key="item.value" :value="item.value">{{ item.label }}</option></select></div><div class="admin-field"><label for="related-category">小分類</label><select id="related-category" v-model="relatedCategory"><option v-for="item in relatedCategories" :key="item.value" :value="item.value">{{ item.label }}</option></select></div><button class="admin-secondary-button" type="button" @click="addRelatedTopic">範囲を追加</button></div>
        <ul v-if="relatedTopics.length" class="related-topic-list"><li v-for="(topic, index) in relatedTopics" :key="topic.category_code"><span>{{ getMasterDataLabel(MAJOR_CATEGORIES, topic.major_category_code) }} / {{ getCategoryLabel(topic.category_code) }}</span><button type="button" :aria-label="`${getCategoryLabel(topic.category_code)}を関連範囲から削除`" @click="form.related_topics = relatedTopics.filter((_, itemIndex) => itemIndex !== index)">削除</button></li></ul>
      </div>
    </section>

    <section v-if="form.group_id" class="admin-panel">
      <div class="admin-panel-head"><div><h2>共通本文の参照</h2><p>必要な本文全体、又は参照箇所を指定します。</p></div></div>
      <div class="admin-panel-body reference-list"><p v-if="!referenceOptions.length" class="form-note">共通本文を大問の画面で保存すると、ここで選べるようになります。</p><label v-for="reference in referenceOptions" :key="referenceKey(reference)"><input type="checkbox" :checked="hasReference(reference)" @change="toggleReference(reference, $event)"><span>{{ reference.label }}</span></label></div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel-head"><div><h2>問題文</h2><p>表示ブロックは上から順に表示されます。</p></div></div>
      <div class="admin-panel-body"><AdminContentBlockEditor v-model="form.content_blocks" context="question" /></div>
    </section>

    <section v-if="!form.answer_type || form.answer_type === 'single_choice'" class="admin-panel">
      <div class="admin-panel-head"><div><h2>選択肢と正答</h2><p>{{ CHOICE_LABELS.length }}件の選択肢を入力し、正答を1件選びます。</p></div></div>
      <div class="admin-panel-body choice-list">
        <article v-for="(choice, index) in form.choices" :key="choice.choice_label" class="choice-editor" :class="{ correct: choice.is_correct }">
          <header>
            <span class="choice-label">{{ choice.choice_label }}</span>
            <label class="correct-control"><input :checked="choice.is_correct" type="radio" name="correct-choice" @change="setCorrectChoice(index)"><span><UIcon name="i-lucide-check" />正答に設定</span></label>
          </header>
          <AdminContentBlockEditor v-model="choice.content_blocks" context="choice" />
        </article>
      </div>
    </section>

    <section v-else-if="form.answer_type === 'short_text'" class="admin-panel">
      <div class="admin-panel-head"><div><h2>語句記述の正答</h2><p>1行目を模範解答とし、2行目以降に許容する別表記を入力します。</p></div></div>
      <div class="admin-panel-body admin-form-grid">
        <div class="admin-field full-width"><label for="accepted-answers">模範解答・許容表記</label><textarea id="accepted-answers" v-model="acceptedAnswers" /></div>
        <div class="admin-field"><label for="answer-script">文字の条件</label><select id="answer-script" v-model="constraints.script"><option value="any">指定なし</option><option value="kanji">漢字</option><option value="katakana">カタカナ</option></select></div>
        <div class="admin-field"><label for="answer-length">指定文字数（任意）</label><input id="answer-length" v-model.number="constraints.exact_length" type="number" min="1"></div>
        <div class="admin-field"><label for="answer-max-length">最大文字数（任意）</label><input id="answer-max-length" v-model.number="constraints.max_length" type="number" min="1"></div>
        <div class="admin-field"><label for="answer-hint">入力欄の案内（任意）</label><input id="answer-hint" v-model="constraints.hint" type="text" placeholder="漢字3字で入力してください"></div>
      </div>
    </section>

    <section v-if="form.answer_type === 'essay'" class="admin-panel">
      <div class="admin-panel-head"><div><h2>論述の採点設定</h2><p>登録済みの12問に対応する要素別ルールを選びます。未知の表現は判定保留になります。</p></div></div>
      <div class="admin-panel-body admin-form-grid">
        <div class="admin-field full-width"><label for="essay-profile">採点ルール</label><select id="essay-profile" v-model="essayProfileSelection"><option value="">選択してください</option><option v-for="profile in essayProfiles" :key="`${profile.id}:${profile.version}`" :value="essayProfileKey(profile)">{{ profile.title }}（第{{ profile.version }}版）</option></select><p v-if="essayProfilesError" role="alert">{{ essayProfilesError }} <button type="button" @click="loadEssayProfiles">再読み込み</button></p></div>
        <div v-if="selectedEssayProfile" class="admin-field full-width"><p>{{ selectedEssayProfile.max_characters }}字以内<template v-if="selectedEssayProfile.required_terms.length">・指定語：{{ selectedEssayProfile.required_terms.join('、') }}</template></p><ul><li v-for="element in selectedEssayProfile.elements" :key="element.id">{{ element.label }}（{{ element.points }}点）</li></ul></div>
        <div class="admin-field full-width"><label for="essay-model">模範解答</label><textarea id="essay-model" v-model="essayConfig.model_answer" maxlength="4000" /><small>公開するには、選んだルールで模範解答の全要素が確認でき、字数・指定語を満たす必要があります。</small></div>
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel-head"><div><h2>解答解説</h2><p>回答後に表示する解説を入力します。</p></div></div>
      <div class="admin-panel-body"><AdminContentBlockEditor v-model="form.explanation_blocks" context="explanation" /></div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel-head"><div><h2>根拠資料</h2><p>問題作成時に参考にした出題範囲や資料を入力します。</p></div></div>
      <div class="admin-panel-body source-panel"><AdminSourceEditor v-model="sources" /><div v-if="!sources.length" class="admin-field"><label for="source-text">従来形式の根拠資料</label><textarea id="source-text" v-model="form.source_text" placeholder="資料名・章節 | https://...（1行につき1出典）" /><small>書籍・Web資料を追加すると、新しい出典欄の内容を保存します。</small></div></div>
    </section>

    <p v-if="errorMessage" class="admin-inline-error" role="alert">{{ errorMessage }}</p>

    <section v-if="previewOpen" class="admin-panel preview-panel">
      <div class="admin-panel-head"><div><h2>プレビュー</h2><p>一般の問題演習画面に近い表示で確認できます。</p></div><button class="admin-icon-button" type="button" aria-label="プレビューを閉じる" @click="previewOpen = false"><UIcon name="i-lucide-x" /></button></div>
      <div class="admin-panel-body"><AdminQuestionPreview :question="form" :passages="group?.passages ?? []" :essay-profile="selectedEssayProfile" /></div>
    </section>

    <div class="form-action-bar">
      <div><span class="save-status"><UIcon name="i-lucide-info" />保存するまで公開内容は変更されません。</span><p v-if="answerHistoryCount" class="form-note">内容を変更すると、この小問の回答履歴{{ answerHistoryCount }}件が削除されます。</p></div>
      <div class="form-actions">
        <NuxtLink class="admin-secondary-button" to="/admin/questions">キャンセル</NuxtLink>
        <button class="admin-secondary-button" type="button" @click="previewOpen = !previewOpen"><UIcon name="i-lucide-eye" />{{ previewOpen ? 'プレビューを閉じる' : 'プレビュー' }}</button>
        <button class="admin-primary-button" type="submit" :disabled="submitting"><UIcon :name="submitting ? 'i-lucide-loader-circle' : 'i-lucide-save'" :class="{ spin: submitting }" />{{ submitting ? '保存中です' : submitLabel }}</button>
      </div>
    </div>
  </form>
</template>

<style scoped>
.admin-question-form { display: grid; gap: 18px; padding-bottom: 86px; }
.full-width { grid-column: 1 / -1; }
.form-note { margin: 8px 0 0; color: var(--admin-muted); font-size: .75rem; line-height: 1.7; }
.source-panel { display: grid; gap: 18px; }
.related-topic-input { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; align-items: end; gap: 12px; }
.related-topic-input .admin-field { min-width: 0; }
.related-topic-list { display: grid; gap: 9px; margin: 16px 0 0; padding: 0; list-style: none; }
.related-topic-list li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 9px; border-top: 1px solid var(--admin-line); font-size: .75rem; }
.related-topic-list button { flex: 0 0 auto; min-height: 34px; padding: 5px 10px; border: 1px solid var(--admin-line); border-radius: 4px; background: transparent; color: var(--admin-muted); cursor: pointer; }
.reference-list { display: grid; gap: 12px; }
.reference-list label { display: flex; align-items: center; gap: 10px; color: var(--admin-text); font-size: .8125rem; }
.reference-list input { width: 18px; height: 18px; }
.history-flags-field { grid-column: 1 / -1; margin: 0; padding: 14px 0; border: 0; border-top: 1px solid var(--admin-line); }
.history-flags-field legend { padding: 0; color: var(--admin-text); font-size: .8125rem; font-weight: 800; }
.history-flags-field p { margin: 0 0 12px; color: var(--admin-muted); font-size: .75rem; line-height: 1.7; }
.history-flags-field > div { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; }
.history-flags-field label { display: flex; align-items: center; gap: 8px; color: var(--admin-text); cursor: pointer; }
.history-flags-field input { width: 18px; height: 18px; accent-color: var(--admin-accent); }
.cultural-history-category { flex: 1 1 200px; max-width: 300px; min-width: 0; }
.publication-field { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 2px 0 0; padding: 0; border: 0; }
.publication-field legend { margin-bottom: 8px; color: var(--admin-text); font-size: 0.8125rem; font-weight: 800; }
.publication-field label { min-height: 58px; display: grid; grid-template-columns: 17px 9px 1fr; align-items: center; gap: 9px; padding: 9px 12px; border: 1px solid var(--admin-line); border-radius: 5px; background: var(--admin-chrome); cursor: pointer; }
.publication-field label.selected { border-color: var(--admin-line-strong); background: var(--admin-selection); }
.publication-field input { width: 15px; height: 15px; accent-color: var(--admin-accent); }
.publication-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--admin-subtle); }
.status-draft .publication-dot { background: #d4aa4b; }
.status-published .publication-dot { background: #35b979; }
.publication-field strong,
.publication-field small { display: block; }
.publication-field strong { color: var(--admin-text); font-size: 0.75rem; }
.publication-field small { margin-top: 2px; color: var(--admin-muted); font-size: 0.625rem; }
.choice-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.choice-editor { min-width: 0; padding: 13px; border: 1px solid var(--admin-line); border-radius: 6px; background: var(--admin-chrome); }
.choice-editor.correct { border-color: #287b78; background: #112323; }
.choice-editor > header { min-height: 40px; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 11px; }
.choice-label { min-width: 34px; max-width: 110px; min-height: 34px; padding: 5px 8px; overflow-wrap: anywhere; display: grid; place-items: center; border-radius: 5px; background: var(--admin-surface-3); color: var(--admin-text); font-weight: 900; }
.correct .choice-label { background: #1d615f; }
.correct-control { cursor: pointer; }
.correct-control input { position: absolute; opacity: 0; pointer-events: none; }
.correct-control span { min-height: 32px; display: inline-flex; align-items: center; gap: 5px; padding: 0 9px; border: 1px solid var(--admin-line); border-radius: 4px; color: var(--admin-muted); font-size: 0.6875rem; font-weight: 800; }
.correct-control input:checked + span { border-color: #287b78; background: #153d3c; color: #8dd8d4; }
.preview-panel .admin-icon-button { width: 36px; min-height: 36px; padding: 0; border-color: var(--admin-line); background: transparent; color: var(--admin-muted); }
.form-action-bar { position: sticky; bottom: 14px; z-index: 25; min-height: 66px; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 11px 14px; border: 1px solid var(--admin-line-strong); border-radius: 7px; background: color-mix(in srgb, var(--admin-chrome) 96%, transparent); box-shadow: 0 14px 35px rgba(0, 0, 0, .32); backdrop-filter: blur(10px); }
.save-status { display: inline-flex; align-items: center; gap: 7px; color: var(--admin-muted); font-size: 0.6875rem; }
.form-actions { display: flex; gap: 8px; }
.spin { animation: admin-spin 1s linear infinite; }
@media (max-width: 860px) {
  .choice-list { grid-template-columns: 1fr; }
  .form-action-bar { position: static; align-items: stretch; flex-direction: column; }
  .form-actions { display: grid; grid-template-columns: 1fr 1fr; }
  .form-actions .admin-primary-button { grid-column: 1 / -1; }
}
@media (max-width: 640px) {
  .related-topic-input { grid-template-columns: 1fr; }
  .publication-field { grid-template-columns: 1fr; }
  .choice-editor { padding: 10px; }
  .save-status { align-items: flex-start; }
  .form-actions { grid-template-columns: 1fr; }
  .form-actions .admin-primary-button { grid-column: auto; }
}
</style>
