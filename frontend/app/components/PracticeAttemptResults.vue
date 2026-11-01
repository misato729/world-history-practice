<script setup lang="ts">
import type {PracticeAttempt} from '../../shared/types/practiceAttempt'
import {summarizeAttempt,attemptItemLabel,attemptItemStatus} from '../../shared/practiceResults'
const props=defineProps<{attempt:PracticeAttempt}>()
const summaries=computed(()=>summarizeAttempt(props.attempt))
defineEmits<{restart:[]}>()
</script>
<template>
 <section class="attempt-results">
  <header><p class="eyebrow">今回の演習を振り返る</p><h1>演習結果</h1><p v-if="attempt.guest" class="notice">このタブでの参考結果です。再読込やタブを閉じると消えます。</p><p>世界史ラボの学習用参考配点です。公式の得点・合否判定ではありません。</p></header>
  <section v-for="summary in summaries" :key="summary.exam" class="exam-result">
   <h2>模擬試験{{ summary.exam }}{{ summary.full ? 'の演習結果' : '：選択した問題の演習結果' }}</h2>
   <p>{{ summary.items.length }}問中{{ summary.answered }}問回答・未回答{{ summary.unanswered }}問</p>
   <div class="score-grid">
    <div class="total"><span>{{ summary.pending ? '総合点は未確定です' : '学習用参考得点' }}</span><strong v-if="summary.total !== null">{{ summary.total }}<small> / {{ summary.max }}点</small></strong><p v-else>論述の未回答・判定保留を確認してください。</p></div>
    <div><h3>選択・語句記述</h3><strong v-if="summary.autoMax">{{ summary.autoPoints }} / {{ summary.autoMax }}点</strong><p v-else>自動採点対象なし</p><p v-if="summary.automaticCount">{{ summary.correct }} / {{ summary.automaticCount }}問正解</p></div>
    <div v-if="summary.essayMax"><h3>論述の参考採点</h3><strong v-if="summary.essayAnswered">確認できた参考点 {{ summary.essayPoints }} / {{ summary.essayMax }}点</strong><strong v-else>未採点（{{ summary.essayMax }}点分）</strong><p>{{ summary.pending ? '確認できた要素の参考点です。未回答・保留分は未確定です。' : 'すべての論述の参考採点を確認できました。' }}</p></div>
   </div>
   <h3>問題と解説を振り返る</h3>
   <ul class="question-results"><li v-for="item in summary.items" :key="item.id"><span>{{ attemptItemLabel(item) }}</span><span class="answer-status" :class="{'correct':attempt.answers[item.id]?.is_correct === true}">{{ attemptItemStatus(attempt,item.id) }}</span><NuxtLink :to="{path:`/practice/${item.exam_number}/${item.question_number}`,query:{attempt:attempt.id,review:'1'}}">{{ attempt.answers[item.id] ? '解答・解説を見る' : '問題を見る' }}</NuxtLink></li></ul>
  </section>
  <nav class="result-actions"><button class="primary-link" type="button" @click="$emit('restart')">新しい回として解き直す</button><NuxtLink class="secondary-link" to="/">トップへ戻る</NuxtLink></nav>
 </section>
</template>
<style scoped>
.attempt-results { min-width:0; overflow-wrap:anywhere; }.eyebrow { color:var(--muted);font-weight:700; }h1{font-size:1.8rem;margin:8px 0 16px;}header>p{line-height:1.8;color:var(--muted)}.notice{padding:12px 16px;background:var(--surface-tint);border-left:3px solid var(--teal)}.exam-result{margin:28px 0;padding:24px;border:1px solid var(--line);border-radius:8px;background:var(--surface)}h2{font-size:1.25rem;margin:0 0 12px;}h3{font-size:1rem}.score-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:24px 0}.score-grid>div{padding:18px;background:var(--surface-tint);border-radius:6px}.score-grid .total{grid-column:1/-1;background:var(--ink);color:#fff}.total>span{display:block}.total>strong{display:block;font-size:2.5rem;margin-top:8px}small{font-size:1rem;font-weight:400}.score-grid p{font-size:.875rem;line-height:1.8;margin-bottom:0}.question-results{list-style:none;padding:0;margin:16px 0}.question-results>li{display:flex;align-items:center;flex-wrap:wrap;gap:12px;padding:14px 0;border-bottom:1px solid var(--line)}.answer-status{font-size:.875rem;background:var(--surface-tint);padding:4px 9px;border-radius:4px}.answer-status.correct{color:var(--success)}.question-results a{margin-left:auto;min-height:44px;display:flex;align-items:center;font-size:.875rem;text-decoration:underline}.result-actions{display:flex;flex-wrap:wrap;gap:12px}.result-actions a,.result-actions button{min-height:44px;}@media(max-width:600px){.exam-result{padding:16px}.score-grid{grid-template-columns:1fr}.question-results a{margin-left:0}.result-actions{flex-direction:column}}
</style>
