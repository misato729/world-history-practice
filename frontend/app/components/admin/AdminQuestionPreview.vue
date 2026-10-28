<script setup lang="ts">
import type { AdminQuestionInput } from '~/types/adminQuestion'
import type { GroupPassage } from '../../../shared/types/learning'
import { culturalHistoryLabel } from '~/utils/historyTopics'

const props = defineProps<{ question: AdminQuestionInput; passages?: GroupPassage[]; essayProfile?: { max_characters: number; required_terms: string[] } }>()

const majorCategoryLabel = computed(() => getMasterDataLabel(
  MAJOR_CATEGORIES,
  props.question.major_category_code,
))
</script>

<template>
  <section class="question-preview" aria-label="問題のプレビュー">
    <header class="preview-head">
      <div><span>試験 {{ question.exam_number }}<template v-if="question.group_id">・通し問{{ question.question_number }}</template></span><h2>問{{ question.group_question_number ?? question.question_number }}</h2></div>
      <div class="preview-classification"><p>{{ majorCategoryLabel }} / {{ getCategoryLabel(question.category_code) }}</p><p v-if="question.is_cultural_history">{{ culturalHistoryLabel(question) }}</p></div>
    </header>

    <div class="preview-paper">
      <section v-if="passages?.length" class="preview-passages"><article v-for="passage in passages" :key="passage.id"><h3>【{{ passage.label }}】</h3><QuestionContentBlocks :blocks="passage.content_blocks" /></article></section>
      <div class="preview-question"><QuestionContentBlocks :blocks="question.content_blocks" /></div>
      <div v-if="!question.answer_type || question.answer_type === 'single_choice'" class="preview-choices">
        <div v-for="choice in question.choices" :key="choice.choice_label" :class="{ correct: choice.is_correct }">
          <span class="preview-radio" />
          <strong>{{ choice.choice_label }}</strong>
          <QuestionContentBlocks :blocks="choice.content_blocks" />
          <span v-if="choice.is_correct" class="correct-label"><UIcon name="i-lucide-check" />正答</span>
        </div>
      </div>
      <div v-else-if="question.answer_type === 'short_text'" class="preview-short-answer"><label>語句記述 <small>{{ question.input_constraints?.hint }}</small><input type="text" disabled placeholder="解答を入力"></label><p>模範解答：{{ question.accepted_answers?.[0] || '未設定' }}</p><p v-if="(question.accepted_answers?.length ?? 0) > 1">許容表記：{{ question.accepted_answers?.slice(1).join(' ／ ') }}</p></div>

      <div v-else class="preview-short-answer"><label>論述<textarea rows="5" disabled placeholder="論述の解答を入力" /></label><p v-if="essayProfile">{{ essayProfile.max_characters }}字以内。<template v-if="essayProfile.required_terms.length">指定語：{{ essayProfile.required_terms.join('、') }}</template></p><p>模範解答：{{ question.essay_config?.model_answer || '未設定' }}</p></div>

      <section class="preview-explanation">
        <h3>解答解説</h3>
        <QuestionContentBlocks :blocks="question.explanation_blocks" />
        <div v-if="question.source_text" class="preview-source"><h3>根拠資料</h3><p>{{ question.source_text }}</p></div>
        <div v-if="question.source_references?.length" class="preview-source"><h3>根拠資料</h3><p v-for="(source, index) in question.source_references" :key="index">{{ [source.title, source.publisher, source.edition, source.publication_year, source.section, source.locator].filter(Boolean).join('・') }}<template v-if="source.url"> | {{ source.url }}</template></p></div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.question-preview {
  overflow: hidden;
  border-radius: 7px;
  background: var(--surface-soft);
  color: var(--ink);
  color-scheme: light;
}
.preview-head { min-height: 92px; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; padding: 20px 25px; border-bottom: 1px solid var(--line); }
.preview-head span { color: var(--teal); font-size: 0.75rem; font-weight: 800; }
.preview-head h2 { margin: 3px 0 0; font-size: 1.75rem; }
.preview-head p { margin: 0; color: var(--muted); font-size: 0.8125rem; }
.preview-paper { margin: 20px; padding: 25px; border: 1px solid var(--line); border-radius: 7px; background: var(--surface); }
.preview-question { font-size: 1.125rem; font-weight: 700; line-height: 1.8; }
.preview-passages { display: grid; gap: 20px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid var(--line); }
.preview-passages h3 { margin: 0 0 12px; font-size: .9375rem; }
.preview-short-answer { margin-top: 22px; }
.preview-short-answer label { display: grid; gap: 9px; }
.preview-short-answer input,.preview-short-answer textarea { width: 100%; max-width: 380px; min-height: 44px; border: 1px solid var(--line-strong); border-radius: 4px; background: var(--surface); color: var(--ink); padding: 8px 12px; }
.preview-short-answer p { font-size: .8125rem; }
.preview-choices { display: grid; gap: 9px; margin-top: 24px; }
.preview-choices > div { position: relative; min-width: 0; display: grid; grid-template-columns: 18px 28px minmax(0, 1fr) auto; align-items: start; gap: 9px; padding: 13px; border: 1px solid var(--line-strong); border-radius: 5px; }
.preview-choices > div.correct { border-color: #68aaa9; background: #eef8f7; }
.preview-radio { width: 15px; height: 15px; margin-top: 4px; border: 1px solid var(--muted); border-radius: 50%; }
.preview-choices strong { min-width: 0; overflow-wrap: anywhere; margin-top: 1px; color: var(--teal-dark); }
.correct-label { display: inline-flex; align-items: center; gap: 4px; padding: 3px 7px; border-radius: 4px; background: #d5efec; color: #176861; font-size: 0.625rem; font-weight: 900; white-space: nowrap; }
.preview-explanation { margin-top: 24px; padding: 20px; border-left: 4px solid var(--teal); background: var(--surface-tint); }
.preview-explanation h3 { margin: 0 0 13px; color: var(--ink); font-size: 0.875rem; }
.preview-source { margin-top: 19px; padding-top: 16px; border-top: 1px solid var(--line); }
.preview-source p { margin: 0; color: var(--text-secondary); font-size: 0.8125rem; line-height: 1.7; white-space: pre-wrap; }
@media (max-width: 640px) {
  .preview-head { align-items: flex-start; flex-direction: column; }
  .preview-paper { margin: 10px; padding: 17px; }
  .preview-question { font-size: 1rem; }
  .preview-choices > div { grid-template-columns: 16px 24px minmax(0, 1fr); }
  .correct-label { grid-column: 3; justify-self: start; }
}
</style>
