<script setup lang="ts">
import type { AdminQuestionInput } from '~/types/adminQuestion'
import { changeHistoryFlag } from '~/utils/historyTopics'

const props = defineProps<{
  initialValue: AdminQuestionInput
  submitLabel: string
  submitting: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  submit: [value: AdminQuestionInput]
}>()

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
const form = reactive<AdminQuestionInput>(clone(props.initialValue))
const previewOpen = ref(false)
const culturalHistory = computed({
  get: () => form.is_cultural_history,
  set: (checked: boolean) => Object.assign(form, changeHistoryFlag(form, 'is_cultural_history', checked)),
})
const artHistory = computed({
  get: () => form.is_art_history,
  set: (checked: boolean) => Object.assign(form, changeHistoryFlag(form, 'is_art_history', checked)),
})

watch(() => props.initialValue, (value) => Object.assign(form, clone(value)), { deep: true })

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
  const value = clone(form)
  value.choices.forEach((choice, index) => { choice.display_order = index + 1 })
  emit('submit', value)
}
</script>

<template>
  <form class="admin-question-form" @submit.prevent="submit">
    <section class="admin-panel">
      <div class="admin-panel-head"><div><h2>基本情報</h2><p>問題の配置、分類、公開状態を設定します。</p></div></div>
      <div class="admin-panel-body admin-form-grid">
        <div class="admin-field"><label for="question-exam-number">試験ナンバー</label><input id="question-exam-number" v-model.number="form.exam_number" type="number" min="1" :max="EXAM_CONFIG.exam.set_count" required></div>
        <div class="admin-field"><label for="question-number">問番号</label><input id="question-number" v-model.number="form.question_number" type="number" min="1" :max="EXAM_CONFIG.exam.questions_per_exam" required></div>
        <div class="admin-field"><label for="question-major-category">大分類</label><select id="question-major-category" v-model="form.major_category_code" required><option v-for="item in MAJOR_CATEGORIES" :key="item.value" :value="item.value">{{ item.label }}</option></select></div>
        <div class="admin-field"><label for="question-category">小分類</label><select id="question-category" v-model="form.category_code" required><option v-for="item in categories" :key="item.value" :value="item.value">{{ item.label }}</option></select></div>
        <fieldset class="history-flags-field">
          <legend>文化史・美術史</legend>
          <p>章・節とは別に、問題の主題に応じて設定します。美術史は文化史に含まれます。</p>
          <div>
            <label><input v-model="culturalHistory" type="checkbox"><span>文化史</span></label>
            <label><input v-model="artHistory" type="checkbox"><span>美術史</span></label>
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
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel-head"><div><h2>問題文</h2><p>表示ブロックは上から順に表示されます。</p></div></div>
      <div class="admin-panel-body"><AdminContentBlockEditor v-model="form.content_blocks" context="question" /></div>
    </section>

    <section class="admin-panel">
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

    <section class="admin-panel">
      <div class="admin-panel-head"><div><h2>解答解説</h2><p>回答後に表示する解説を入力します。</p></div></div>
      <div class="admin-panel-body"><AdminContentBlockEditor v-model="form.explanation_blocks" context="explanation" /></div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel-head"><div><h2>根拠資料</h2><p>問題作成時に参考にした出題範囲や資料を入力します。</p></div></div>
      <div class="admin-panel-body"><div class="admin-field"><label for="source-text">参考にした出題範囲・根拠資料</label><textarea id="source-text" v-model="form.source_text" placeholder="資料名・章節 | https://...（1行につき1出典）" /></div></div>
    </section>

    <p v-if="errorMessage" class="admin-inline-error" role="alert">{{ errorMessage }}</p>

    <section v-if="previewOpen" class="admin-panel preview-panel">
      <div class="admin-panel-head"><div><h2>プレビュー</h2><p>一般の問題演習画面に近い表示で確認できます。</p></div><button class="admin-icon-button" type="button" aria-label="プレビューを閉じる" @click="previewOpen = false"><UIcon name="i-lucide-x" /></button></div>
      <div class="admin-panel-body"><AdminQuestionPreview :question="form" /></div>
    </section>

    <div class="form-action-bar">
      <div><span class="save-status"><UIcon name="i-lucide-info" />保存するまで公開内容は変更されません。</span></div>
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
.history-flags-field { grid-column: 1 / -1; margin: 0; padding: 14px 0; border: 0; border-top: 1px solid var(--admin-line); }
.history-flags-field legend { padding: 0; color: var(--admin-text); font-size: .8125rem; font-weight: 800; }
.history-flags-field p { margin: 0 0 12px; color: var(--admin-muted); font-size: .75rem; line-height: 1.7; }
.history-flags-field > div { display: flex; flex-wrap: wrap; gap: 12px 24px; }
.history-flags-field label { display: flex; align-items: center; gap: 8px; color: var(--admin-text); cursor: pointer; }
.history-flags-field input { width: 18px; height: 18px; accent-color: var(--admin-accent); }
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
  .publication-field { grid-template-columns: 1fr; }
  .choice-editor { padding: 10px; }
  .save-status { align-items: flex-start; }
  .form-actions { grid-template-columns: 1fr; }
  .form-actions .admin-primary-button { grid-column: auto; }
}
</style>
