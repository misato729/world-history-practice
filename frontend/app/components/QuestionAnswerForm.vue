<script setup lang="ts">
import type { InputConstraints, LearningBlock } from '../../shared/types/learning'
import { inputConstraintLabel, shortAnswerIssue } from '../utils/learningPresentation'
import { essayAnswerIssue, essayCharacterCount, type EssayConstraints } from '../utils/essayPresentation'

type Choice = { id: number; choice_label: string; content_blocks: LearningBlock[] }
const props = defineProps<{ answerType?: string; choices: Choice[]; selectedChoiceId: number | null; submittedText: string; constraints?: InputConstraints; disabled: boolean; submitting: boolean; correctChoiceId?: number; isCorrect?: boolean | null; essayConstraints?: EssayConstraints }>()
const emit = defineEmits<{ 'update:selectedChoiceId': [value: number]; 'update:submittedText': [value: string]; submit: [] }>()
const constraintLabel = computed(() => inputConstraintLabel({ ...props.constraints, hint: undefined }))
const inputIssue = computed(() => props.answerType === 'essay' ? essayAnswerIssue(props.submittedText, props.essayConstraints) : shortAnswerIssue(props.submittedText, props.constraints))
const canSubmit = computed(() => ['short_text', 'essay'].includes(props.answerType ?? '') ? !inputIssue.value : props.selectedChoiceId !== null)
</script>

<template>
  <form class="question-answer-form" @submit.prevent="emit('submit')">
    <div v-if="answerType === 'short_text'" class="short-answer">
      <label for="short-answer-input">解答<span v-if="constraintLabel">（{{ constraintLabel }}）</span></label>
      <input id="short-answer-input" :value="submittedText" type="text" autocomplete="off" :disabled="disabled || submitting" @input="emit('update:submittedText', ($event.target as HTMLInputElement).value)">
      <p v-if="submittedText && inputIssue && !disabled" class="input-issue" role="status">{{ inputIssue }}</p>
    </div>
    <div v-else-if="answerType === 'essay'" class="essay-answer">
      <label for="essay-answer-input">論述の解答</label>
      <textarea id="essay-answer-input" :value="submittedText" rows="6" maxlength="4000" :disabled="disabled || submitting" aria-describedby="essay-answer-hint essay-answer-count" @input="emit('update:submittedText', ($event.target as HTMLTextAreaElement).value)" />
      <p id="essay-answer-hint" class="input-hint">{{ essayConstraints?.max_characters ?? 1000 }}字以内。空白・改行を除き、句読点も1字と数えます。<span v-if="essayConstraints?.required_terms.length">指定語：{{ essayConstraints.required_terms.join('、') }}</span></p>
      <p id="essay-answer-count" class="input-hint" aria-live="polite">{{ essayCharacterCount(submittedText) }}字</p>
      <p v-if="submittedText && inputIssue && !disabled" class="input-issue" role="status">{{ inputIssue }}</p>
    </div>
    <div v-else class="choices" role="radiogroup" aria-label="選択肢">
      <label v-for="choice in choices" :key="choice.id" :class="{ selected: selectedChoiceId === choice.id, correct: correctChoiceId === choice.id, incorrect: disabled && selectedChoiceId === choice.id && !isCorrect }">
        <input type="radio" name="answer" :value="choice.id" :checked="selectedChoiceId === choice.id" :disabled="disabled || submitting" @change="emit('update:selectedChoiceId', choice.id)">
        <span class="choice-label">{{ choice.choice_label }}</span>
        <QuestionContentBlocks class="choice-content" :blocks="choice.content_blocks" />
        <UIcon v-if="correctChoiceId === choice.id" class="correct-mark" name="i-lucide-circle-check" />
        <UIcon v-else-if="disabled && selectedChoiceId === choice.id" class="incorrect-mark" name="i-lucide-circle-x" />
      </label>
    </div>
    <button v-if="!disabled" class="primary-link answer-button" type="submit" :disabled="!canSubmit || submitting">
      <UIcon v-if="submitting" class="spin" name="i-lucide-loader-circle" />{{ submitting ? '採点中です' : '回答する' }}
    </button>
  </form>
</template>

<style scoped>
.choices { display: grid; gap: 10px; margin-top: 28px; }
.choices label { position: relative; min-width: 0; min-height: 62px; display: grid; grid-template-columns: 20px 34px minmax(0, 1fr) 24px; align-items: start; gap: 10px; padding: 16px; border: 1px solid var(--line); border-radius: 6px; cursor: pointer; }
.choices label:hover:not(:has(input:disabled)) { border-color: var(--teal); }
.choices label.selected { border-color: var(--teal); background: var(--surface-tint); }
.choices label.correct { border-color: var(--success); background: var(--success-soft); }
.choices label.incorrect { border-color: var(--coral); background: #fff0ec; }
.choices input { margin-top: 5px; accent-color: var(--teal); }
.choice-label { font-size: 1.125rem; font-weight: 800; }
.choice-content { min-width: 0; overflow-wrap: anywhere; }
.correct-mark { color: var(--success); }.incorrect-mark { color: var(--coral); }
.answer-button { min-width: 180px; margin-top: 24px; }.answer-button:disabled { opacity: .45; cursor: not-allowed; }
.short-answer { display: grid; gap: 10px; margin-top: 28px; }.short-answer label { font-weight: 800; }.short-answer label span { color: var(--muted); font-weight: 500; }
.short-answer input { width: min(100%, 440px); min-height: 48px; padding: 10px 12px; border: 1px solid var(--line-strong); border-radius: 4px; background: var(--surface); color: var(--ink); font-size: 1.125rem; }
.essay-answer { display: grid; gap: 10px; margin-top: 28px; }.essay-answer label { font-weight: 800; }.essay-answer textarea { width: 100%; min-height: 160px; padding: 12px; border: 1px solid var(--line-strong); border-radius: 4px; background: var(--surface); color: var(--ink); font: inherit; line-height: 1.8; resize: vertical; }.essay-answer .input-hint span { display: block; }
.input-hint,.input-issue { margin: 0; color: var(--muted); font-size: .875rem; }.input-issue { color: #a23b2a; }
.spin { animation: spin 1s linear infinite; }@keyframes spin { to { transform: rotate(360deg); } }
@media(max-width:640px) { .choices label { grid-template-columns: 18px 28px minmax(0, 1fr) 22px; padding: 11px; } }
</style>
