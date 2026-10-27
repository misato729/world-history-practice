<script setup lang="ts">
import type { EssayGrade } from '../../shared/types/essay'

defineProps<{ result: EssayGrade; modelAnswer?: string; submittedText?: string }>()
const statusLabel = { matched: '確認できた', contradicted: '誤りの条件に一致', pending: '判定保留' }
</script>

<template>
  <div class="essay-score">
    <p v-if="result.grading_status === 'invalid'" class="essay-score-summary">字数・指定語の条件を確認してください。参考点は未確定です。</p>
    <p v-else-if="result.score !== null" class="essay-score-summary">ルール採点の参考点：<strong>{{ result.score }} / {{ result.max_points }}点</strong></p>
    <p v-else class="essay-score-summary">確認できた得点：<strong>{{ result.confirmed_points }} / {{ result.max_points }}点</strong><span>残り{{ result.pending_points }}点分は判定保留です。</span></p>
    <p class="essay-score-note">登録した表現と誤りの条件による学習用の参考採点です。判定保留は不正解を意味しません。模範解答と各要素を照らして確認してください。</p>
    <div class="essay-conditions">
      <span>字数：{{ result.constraints.character_count }} / {{ result.constraints.max_characters }}字</span>
      <span v-if="!result.constraints.within_limit">字数の条件を満たしていません</span>
      <span v-if="result.constraints.missing_required_terms.length">指定語の不足：{{ result.constraints.missing_required_terms.join('、') }}</span>
    </div>
    <ol class="essay-elements" aria-label="採点要素ごとの結果">
      <li v-for="element in result.elements" :key="element.id" :class="element.status">
        <div class="essay-element-head"><strong>{{ element.label }}</strong><span>{{ statusLabel[element.status] }}：{{ element.awarded_points === null ? '保留' : `${element.awarded_points}点` }} / {{ element.points }}点</span></div>
        <p>{{ element.reason }}</p>
        <div v-if="element.evidence.length" class="essay-evidence"><span>判定に使った箇所</span><blockquote v-for="(text, index) in element.evidence" :key="index">{{ text }}</blockquote></div>
      </li>
    </ol>
    <section v-if="modelAnswer" class="essay-model"><h2>模範解答</h2><p>{{ modelAnswer }}</p></section>
    <section v-if="submittedText" class="essay-submitted"><h2>入力した解答</h2><p>{{ submittedText }}</p></section>
  </div>
</template>

<style scoped>
.essay-score { min-width: 0; margin-top: 20px; overflow-wrap: anywhere; }
.essay-score-summary { margin: 0 0 10px; font-size: 1.0625rem; line-height: 1.7; }
.essay-score-summary strong { font-size: 1.25rem; }.essay-score-summary > span { display: block; }
.essay-score-note,.essay-conditions { color: var(--muted); font-size: .875rem; line-height: 1.7; }
.essay-conditions { display: flex; flex-wrap: wrap; gap: 5px 16px; }
.essay-elements { display: grid; gap: 12px; margin: 18px 0; padding: 0; list-style: none; }
.essay-elements > li { min-width: 0; padding: 14px; border: 1px solid var(--line); border-left: 4px solid var(--line-strong); border-radius: 4px; background: var(--surface); }
.essay-elements > li.matched { border-left-color: var(--success); }.essay-elements > li.contradicted { border-left-color: var(--coral); }
.essay-element-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 18px; }
.essay-element-head > span { font-size: .8125rem; }.essay-elements p { margin: 9px 0 0; font-size: .875rem; line-height: 1.7; }
.essay-evidence { margin-top: 10px; font-size: .8125rem; color: var(--muted); }.essay-evidence blockquote { margin: 5px 0 0; padding-left: 10px; border-left: 2px solid var(--line); white-space: pre-wrap; }
.essay-model,.essay-submitted { margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--line); }
.essay-model h2,.essay-submitted h2 { margin: 0 0 10px; font-size: 1rem; }.essay-model p,.essay-submitted p { line-height: 1.9; white-space: pre-wrap; }
</style>
