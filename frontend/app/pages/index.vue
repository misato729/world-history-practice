<script setup lang="ts">
import { FREE_EXAM_MAX, catalogExamLabel, catalogExamStartNumber, type ExamCatalogEntry } from '~/utils/examCatalog'
import { HISTORY_TOPICS, type HistoryTopic } from '~/utils/historyTopics'
import {
  createPracticeSeed,
  selectPracticePositions,
  shufflePracticeSequence,
  type PracticeOrder,
} from '~/utils/practiceSequence'

type LauncherMode = 'exam' | 'conditions'

const title = SITE.name
const description = SITE.description

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
})

const { data: publicCatalog, status: publicCatalogStatus, error: publicCatalogError, refresh: refreshPublicCatalog } = await usePublicExamCatalog()
const catalogExams = computed(() => (publicCatalog.value?.data ?? []).filter(exam => catalogExamStartNumber(exam) !== undefined))

const { user, authHeaders } = useAuth()
const { $api: api } = useNuxtApp()
const launcherMode = ref<LauncherMode>('exam')
const selectedMajorCategory = ref('')
const selectedCategory = ref('')
const selectedHistoryTopic = ref<HistoryTopic>('all')
const startingPractice = ref(false)
const practiceStartError = ref('')
const availableCategories = computed(() => selectedMajorCategory.value
  ? getCategoriesByMajorCategory(selectedMajorCategory.value)
  : [])
const hasSubjectFilter = computed(() => Boolean(selectedMajorCategory.value || selectedCategory.value || selectedHistoryTopic.value !== 'all'))
watch(selectedMajorCategory, () => {
  if (!availableCategories.value.some(item => item.value === selectedCategory.value)) selectedCategory.value = ''
})
watch([selectedMajorCategory, selectedCategory, selectedHistoryTopic], () => {
  practiceStartError.value = ''
})

const hasFullAccess = computed(() => (
  hasFullExamAccess(user.value)
))
const freeExams = computed(() => catalogExams.value.filter(exam => exam.access !== 'paid_membership_required' && exam.exam_number <= FREE_EXAM_MAX))
const availableExams = computed(() => (
  hasFullAccess.value ? catalogExams.value.filter(exam => exam.access !== 'paid_membership_required') : freeExams.value
))
const availableExamNumbers = computed(() => availableExams.value.map(exam => exam.exam_number))
const selectedExamNumbers = ref<number[]>([...availableExamNumbers.value])

const allExamsSelected = computed({
  get: () => (
    availableExamNumbers.value.length > 0
    && selectedExamNumbers.value.length === availableExamNumbers.value.length
    && availableExamNumbers.value.every(examNumber => selectedExamNumbers.value.includes(examNumber))
  ),
  set: (selected: boolean) => {
    selectedExamNumbers.value = selected ? [...availableExamNumbers.value] : []
  },
})
const someExamsSelected = computed(() => (
  selectedExamNumbers.value.length > 0 && !allExamsSelected.value
))
const sortedSelectedExamNumbers = computed(() => (
  [...selectedExamNumbers.value].sort((left, right) => left - right)
))
const selectedQuestionCount = computed(() => (
  conditionSequence.value.length
))
const conditionSequence = computed(() => selectPracticePositions(
  catalogExams.value, sortedSelectedExamNumbers.value,
))
const hasConditionSelection = computed(() => conditionSequence.value.length > 0)

const examIsLocked = (examNumber: number) => examNumber > FREE_EXAM_MAX && !hasFullAccess.value
const examTarget = (exam: ExamCatalogEntry) => (
  examIsLocked(exam.exam_number) ? '/premium' : `/practice/${exam.exam_number}/${catalogExamStartNumber(exam)!}`
)
const startConditionalPractice = async (order: PracticeOrder) => {
  if (!hasConditionSelection.value || startingPractice.value) return
  startingPractice.value = true
  practiceStartError.value = ''

  const query: Record<string, string> = {
    exams: sortedSelectedExamNumbers.value.join(','),
  }
  if (selectedMajorCategory.value) query.major_category_code = selectedMajorCategory.value
  if (selectedCategory.value) query.category_code = selectedCategory.value
  if (selectedHistoryTopic.value !== 'all') query.history_topic = selectedHistoryTopic.value

  try {
    let sequence = conditionSequence.value
    {
      const result = await api<{ data: ExamCatalogEntry[] }>('/api/v1/exams', {
        headers: authHeaders.value,
        query: {
          ...(selectedMajorCategory.value ? { major_category_code: selectedMajorCategory.value } : {}),
          ...(selectedCategory.value ? { category_code: selectedCategory.value } : {}),
          history_topic: selectedHistoryTopic.value,
        },
      })
      sequence = selectPracticePositions(result.data, sortedSelectedExamNumbers.value)
    }
    if (order === 'random') {
      const seed = createPracticeSeed()
      sequence = shufflePracticeSequence(sequence, seed)
      query.order = order
      query.seed = String(seed)
    }
    const firstPosition = sequence[0]
    if (!firstPosition) {
      practiceStartError.value = 'この条件に合う公開問題はまだありません。分野や対象模擬試験を変更してください。'
      return
    }
    await navigateTo({
      path: `/practice/${firstPosition.examNumber}/${firstPosition.questionNumber}`,
      query,
    })
  }
  catch {
    practiceStartError.value = '演習を開始できませんでした。通信状況を確認して、もう一度お試しください。'
  }
  finally {
    startingPractice.value = false
  }
}

watch(availableExamNumbers, (examNumbers, previousExamNumbers) => {
  const previouslySelectedAll = (
    (previousExamNumbers.length === 0 && selectedExamNumbers.value.length === 0)
    || previousExamNumbers.length > 0 && previousExamNumbers.every(examNumber => selectedExamNumbers.value.includes(examNumber))
  )
  selectedExamNumbers.value = previouslySelectedAll
    ? [...examNumbers]
    : selectedExamNumbers.value.filter(examNumber => examNumbers.includes(examNumber))
})

</script>

<template>
  <div class="home-main">
    <section class="overview-section">
      <div class="overview-copy">
        <h1 class="section-heading">
          <span>{{ SITE.tagline }}</span>
        </h1>
        <p>
          {{ SITE.description }}
        </p>
        <div class="overview-actions">
          <NuxtLink class="secondary-link" to="/exam-overview">試験概要を見る</NuxtLink>
        </div>
      </div>
    </section>

    <section id="practice-launcher" class="practice-launcher" aria-labelledby="practice-launcher-title">
      <p v-if="publicCatalogStatus === 'pending' || publicCatalogStatus === 'idle'" role="status">公開中の模擬試験を読み込んでいます。</p>
      <p v-else-if="publicCatalogError" class="practice-start-error" role="alert">模擬試験を読み込めませんでした。<button class="secondary-link" type="button" @click="refreshPublicCatalog()">再読み込み</button></p>
      <p v-else-if="!availableExams.length" role="status">現在利用できる公開問題はありません。</p>
      <div class="launcher-heading">
        <div>
          <h2 id="practice-launcher-title" class="section-heading">
            <span>問題演習を始める</span>
          </h2>
        </div>
        <p>公開中の模擬試験を1問ずつ解いて、理解を確かめられます。章・節や文化史の区分を指定した演習にも取り組めます。</p>
      </div>

      <div class="launcher-tabs" role="tablist" aria-label="問題演習の開始方法">
        <button
          id="exam-mode-tab"
          type="button"
          role="tab"
          :aria-selected="launcherMode === 'exam'"
          aria-controls="exam-mode-panel"
          :class="{ active: launcherMode === 'exam' }"
          @click="launcherMode = 'exam'"
        >
          <UIcon name="i-lucide-files" />
          模擬試験を選ぶ
        </button>
        <button
          id="conditions-mode-tab"
          type="button"
          role="tab"
          :aria-selected="launcherMode === 'conditions'"
          aria-controls="conditions-mode-panel"
          :class="{ active: launcherMode === 'conditions' }"
          @click="launcherMode = 'conditions'"
        >
          <UIcon name="i-lucide-list-filter" />
          条件を指定
        </button>
      </div>

      <div
        v-if="launcherMode === 'exam'"
        id="exam-mode-panel"
        class="launcher-panel"
        role="tabpanel"
        aria-labelledby="exam-mode-tab"
      >
        <div class="exam-grid-heading">
          <p><strong>公開中 {{ catalogExams.length }}回</strong><span>大問の順に演習</span></p>
          <NuxtLink v-if="!hasFullAccess" class="premium-info-link" to="/premium">
            <UIcon name="i-lucide-lock-keyhole" />
            模擬試験{{ FREE_EXAM_MAX + 1 }}以降はプレミアム会員向けです
          </NuxtLink>
        </div>
        <div class="exam-grid">
          <NuxtLink
            v-for="exam in catalogExams"
            :key="exam.exam_number"
            class="exam-card"
            :to="examTarget(exam)"
            :aria-label="examIsLocked(exam.exam_number) ? `模擬試験${exam.exam_number}はプレミアム会員向けです` : `模擬試験${exam.exam_number}を始める`"
          >
            <span class="exam-card-copy">
              <strong>{{ catalogExamLabel(exam.exam_number) }}</strong>
              <span>{{ exam.groups?.length ? `${exam.groups.length}大問・` : '' }}{{ exam.question_numbers.length }}問収録</span>
            </span>
            <UIcon :name="examIsLocked(exam.exam_number) ? 'i-lucide-lock-keyhole' : 'i-lucide-arrow-right'" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>

      <div
        v-else
        id="conditions-mode-panel"
        class="launcher-panel"
        role="tabpanel"
        aria-labelledby="conditions-mode-tab"
      >
        <form class="condition-form" @submit.prevent="startConditionalPractice('sequential')">
          <div class="condition-fields">
            <fieldset class="condition-fieldset" :disabled="startingPractice">
              <legend>分野</legend>
              <p class="condition-help">山川の章・節に沿って選べます。文化史全体や各区分の条件も組み合わせられます。</p>
              <div class="subject-select-grid">
                <div><label for="practice-major-category">大分類（章）</label><select id="practice-major-category" v-model="selectedMajorCategory"><option value="">すべての章</option><option v-for="item in MAJOR_CATEGORIES" :key="item.value" :value="item.value">{{ item.label }}</option></select></div>
                <div><label for="practice-category">小分類（節）</label><select id="practice-category" v-model="selectedCategory" :disabled="!selectedMajorCategory"><option value="">すべての節</option><option v-for="item in availableCategories" :key="item.value" :value="item.value">{{ item.label }}</option></select></div>
                <div><label for="practice-history-topic">文化史の絞り込み</label><select id="practice-history-topic" v-model="selectedHistoryTopic"><option v-for="item in HISTORY_TOPICS" :key="item.value" :value="item.value">{{ item.filterLabel }}</option></select></div>
              </div>
              <p class="condition-help">文化史全般には、美術史・音楽史・文学史も含まれます。選んだ範囲の知識を使う横断問題も含みます。</p>
            </fieldset>
            <fieldset class="condition-fieldset" :disabled="startingPractice">
              <legend>対象模擬試験</legend>
              <div class="condition-field-heading">
                <p>複数選択できます</p>
                <label class="all-selector">
                  <input
                    v-model="allExamsSelected"
                    type="checkbox"
                    :indeterminate="someExamsSelected"
                  >
                  <span>全選択</span>
                </label>
              </div>
              <div class="number-checkbox-grid exam-number-grid">
                <label
                  v-for="exam in availableExams"
                  :key="exam.exam_number"
                  :class="{ selected: selectedExamNumbers.includes(exam.exam_number) }"
                >
                  <input
                    v-model="selectedExamNumbers"
                    type="checkbox"
                    name="exam-numbers"
                    :value="exam.exam_number"
                  >
                  <span>{{ catalogExamLabel(exam.exam_number) }}</span>
                </label>
              </div>
            </fieldset>


          </div>

          <p v-if="practiceStartError" class="practice-start-error" role="alert">{{ practiceStartError }}</p>
          <div class="condition-submit">
            <p v-if="hasConditionSelection">
              <span>選択中</span>
              {{ sortedSelectedExamNumbers.length }}回の模擬試験・選択した公開問題
              <strong>{{ hasSubjectFilter ? `最大${selectedQuestionCount}問から条件で絞り込み` : `全${selectedQuestionCount}問` }}</strong>
            </p>
            <p v-else class="selection-required">
              <span>選択内容を確認してください</span>
              模擬試験を1つ以上選択してください
            </p>
            <div class="condition-actions">
              <button class="primary-link" type="submit" :disabled="!hasConditionSelection || startingPractice">
                <UIcon name="i-lucide-list-ordered" />
                {{ startingPractice ? '確認中です' : '順番に始める' }}
              </button>
              <button
                class="secondary-link"
                type="button"
                :disabled="!hasConditionSelection || startingPractice"
                @click="startConditionalPractice('random')"
              >
                <UIcon name="i-lucide-shuffle" />
                ランダムに始める
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>

    <section id="usage-guide" class="home-section policy-section" aria-labelledby="usage-guide-title">
      <div class="section-title">
        <h2 id="usage-guide-title" class="section-heading">
          <span>利用にあたって</span>
        </h2>
      </div>
      <dl class="usage-details">
        <div class="usage-row">
          <dt>{{ PAYMENTS_ENABLED ? (FREE_EXAM_MAX > 0 ? `模擬試験1〜${FREE_EXAM_MAX}は無料` : '会員資格に応じて演習') : 'すべての公開問題を無料で演習' }}</dt>
          <dd>
            <p>{{ PAYMENTS_ENABLED && FREE_EXAM_MAX === 0 ? '問題の演習にはプレミアム会員資格が必要です。' : '無料の公開問題はログインなしで利用できます。' }}解答履歴の保存にはログインが必要です。</p>
          </dd>
        </div>
        <div v-if="PAYMENTS_ENABLED" class="usage-row">
          <dt>{{ PRICE_LABEL }}の買い切り</dt>
          <dd>
            <p>プレミアム会員は模擬試験{{ FREE_EXAM_MAX + 1 }}以降も利用できます。月額料金や自動更新はありません。</p>
            <NuxtLink class="usage-premium-link" to="/premium">
              <span>プレミアム会員について</span>
              <UIcon name="i-lucide-arrow-right" aria-hidden="true" />
            </NuxtLink>
          </dd>
        </div>
        <div class="usage-row">
          <dt>根拠資料も確認</dt>
          <dd>
            <p>各問題の解説と、出題の根拠となる資料を確認できます。</p>
          </dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.home-main { min-width: 0; background: var(--surface-soft); }
.practice-launcher {
  scroll-margin-top: calc(var(--site-navigation-height, var(--header-height)) + 20px);
  padding: 52px clamp(28px, 6vw, 86px) 58px;
  border-top: 1px solid var(--line);
  background: var(--surface-tint);
}
.launcher-heading { display: flex; align-items: end; justify-content: space-between; gap: 28px; }
.launcher-heading h2 { margin: 0; font-size: 1.875rem; line-height: 1.3; }
.launcher-heading > p { max-width: 480px; margin: 0; color: var(--muted); line-height: 1.8; }
.section-heading { display: flex; align-items: center; gap: 10px; }
.section-heading::before { content: ''; flex: 0 0 4px; width: 4px; height: 26px; background: var(--teal-dark); }
.section-heading > span { min-width: 0; }
.launcher-tabs {
  width: min(400px, 100%);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 30px;
  border-bottom: 1px solid var(--line);
}
.launcher-tabs button {
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-bottom: 3px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 800;
  cursor: pointer;
}
.launcher-tabs button.active { border-color: var(--teal); color: var(--teal-dark); }
.launcher-tabs :deep(svg) { width: 19px; height: 19px; }
.launcher-panel { padding-top: 28px; }
.exam-grid-heading {
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}
.exam-grid-heading p { display: flex; align-items: baseline; gap: 10px; margin: 0; }
.exam-grid-heading strong { font-size: 1rem; }
.exam-grid-heading span { color: var(--muted); font-size: 0.8125rem; font-weight: 700; }
.exam-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 12px; }
.exam-card {
  min-height: 90px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 22px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: var(--ink);
  text-decoration: none;
  transition: border-color .15s, background .15s, transform .15s;
}
.exam-card:hover { border-color: var(--teal); background: var(--surface-soft); transform: translateY(-1px); }
.exam-card-copy { min-width: 0; display: grid; gap: 7px; }
.exam-card strong { color: var(--teal-dark); font-size: 1.125rem; line-height: 1.4; }
.exam-card-copy > span { color: var(--muted); font-size: 0.8125rem; }
.exam-card :deep(.iconify) { flex: 0 0 20px; width: 20px; height: 20px; color: var(--teal-dark); }
.premium-info-link { display: inline-flex; align-items: center; gap: 5px; color: var(--teal-dark); font-size: 0.8125rem; font-weight: 800; }
.condition-form { border: 1px solid var(--line); border-radius: 8px; background: var(--surface); }
.condition-fields { display: grid; gap: 28px; padding: 28px; }
.condition-help { margin: 10px 0; color: var(--muted); font-size: .8125rem; line-height: 1.7; }
.subject-select-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
.subject-select-grid > div { min-width: 0; }
.subject-select-grid label { display: block; margin-bottom: 7px; color: var(--text-secondary); font-size: .8125rem; font-weight: 800; }
.subject-select-grid select { width: 100%; min-width: 0; min-height: 44px; padding: 8px 10px; border: 1px solid var(--line-strong); border-radius: 5px; background: var(--surface); color: var(--ink); font-size: .875rem; }
.practice-start-error { margin: 0; padding: 0 28px 20px; color: #a23b2a; font-weight: 700; line-height: 1.7; }
.condition-fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
.condition-fieldset + .condition-fieldset { padding-top: 26px; border-top: 1px solid var(--line); }
.condition-fieldset legend { padding: 0; color: var(--ink); font-size: 1.0625rem; font-weight: 900; }
.condition-field-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 7px 0 13px;
}
.condition-field-heading p { margin: 0; color: var(--muted); font-size: 0.8125rem; }
.all-selector {
  min-height: 36px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid var(--line-strong);
  border-radius: 5px;
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-size: 0.8125rem;
  font-weight: 800;
  cursor: pointer;
}
.all-selector input { width: 17px; height: 17px; margin: 0; accent-color: var(--teal); }
.number-checkbox-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); gap: 8px; }
.number-checkbox-grid label {
  min-width: 0;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 6px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--surface);
  color: var(--text-secondary);
  font-weight: 900;
  cursor: pointer;
  transition: border-color .15s, background .15s;
}
.number-checkbox-grid label:hover { border-color: var(--teal); }
.number-checkbox-grid label.selected { border-color: var(--teal); background: var(--surface-selected); color: var(--teal-dark); }
.number-checkbox-grid input { width: 16px; height: 16px; flex: 0 0 16px; margin: 0; accent-color: var(--teal); }
.condition-submit {
  min-height: 82px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 26px;
  border-top: 1px solid var(--line);
  background: var(--surface-soft);
}
.condition-submit p { margin: 0; color: var(--text-secondary); font-weight: 800; }
.condition-submit p span { display: block; margin-bottom: 3px; color: var(--muted); font-size: 0.6875rem; }
.condition-submit p strong { margin-left: 8px; color: var(--teal-dark); }
.condition-submit .selection-required { color: #a23b2a; }
.condition-actions { display: flex; flex: 0 0 auto; gap: 10px; }
.condition-actions button { white-space: nowrap; }
.condition-actions button:disabled { opacity: .45; cursor: not-allowed; }
.subject-label { white-space: nowrap; }
.overview-section {
  min-height: 280px;
  padding: 52px clamp(28px, 6vw, 86px);
  display: flex;
  align-items: center;
  background: var(--surface);
}
.overview-copy { max-width: 680px; }
.overview-copy h1 { margin: 0; font-size: 1.875rem; line-height: 1.3; }
.overview-copy > p { margin: 22px 0 0; color: var(--muted); font-size: 1rem; line-height: 1.9; }
.overview-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 30px; }
.home-section { padding: 62px clamp(28px, 6vw, 86px); }
.section-title { display: flex; align-items: baseline; gap: 14px; margin-bottom: 26px; }
.section-title h2 { margin: 0; font-size: 1.875rem; }
.updates-section { background: var(--surface-soft); }
.update-list { border-top: 1px solid var(--line); }
.update-list article { min-height: 68px; display: grid; grid-template-columns: 120px 1fr; align-items: center; gap: 18px; border-bottom: 1px solid var(--line); }
.update-list time { color: var(--teal-dark); font-weight: 800; }
.update-list p { margin: 0; color: var(--text-secondary); }
.policy-section {
  scroll-margin-top: calc(var(--site-navigation-height, var(--header-height)) + 20px);
  background: var(--surface);
}
.usage-details { margin: 0; border-top: 1px solid var(--line); }
.usage-row {
  display: grid;
  grid-template-columns: minmax(180px, .3fr) minmax(0, 1fr);
  gap: 32px;
  padding: 26px 0;
  border-bottom: 1px solid var(--line);
}
.usage-row dt { color: var(--ink); font-size: 1rem; font-weight: 700; line-height: 1.9; }
.usage-row dd { min-width: 0; margin: 0; color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.9; }
.usage-row p { margin: 0; }
.usage-premium-link {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  color: var(--teal-dark);
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: underline;
  text-decoration-color: var(--line-strong);
  text-underline-offset: 4px;
}
.usage-premium-link:hover { text-decoration-color: currentColor; }
.usage-premium-link:focus-visible { outline: 2px solid var(--teal-dark); outline-offset: 4px; }
.usage-premium-link :deep(.iconify) { flex: 0 0 16px; width: 16px; height: 16px; }

@media (max-width: 960px) {
  .usage-row { grid-template-columns: minmax(0, 1fr); gap: 8px; }
}

@media (max-width: 640px) {
  .subject-select-grid { grid-template-columns: 1fr; }
  .practice-launcher { padding: 32px 20px 38px; }
  .launcher-heading { align-items: flex-start; flex-direction: column; gap: 12px; }
  .launcher-heading h2 { font-size: 1.6875rem; }
  .launcher-heading > p { font-size: 0.875rem; }
  .launcher-tabs { width: 100%; margin-top: 24px; }
  .exam-grid-heading { align-items: flex-start; flex-direction: column; gap: 8px; }
  .exam-grid { grid-template-columns: minmax(0, 1fr); }
  .exam-card { min-height: 86px; padding: 18px; }
  .condition-fields { padding: 20px; }
  .condition-field-heading { align-items: flex-end; }
  .number-checkbox-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
  .number-checkbox-grid label { min-height: 46px; gap: 6px; padding: 8px 6px; }
  .number-checkbox-grid input { width: 15px; height: 15px; flex-basis: 15px; }
  .condition-submit { align-items: stretch; flex-direction: column; padding: 18px 20px 20px; }
  .condition-actions { width: 100%; flex-direction: column; }
  .condition-actions button { width: 100%; }
  .overview-section { min-height: auto; padding: 36px 20px; }
  .overview-actions { align-items: stretch; flex-direction: column; }
  .home-section { padding: 44px 20px; }
  .update-list article { grid-template-columns: 1fr; gap: 5px; padding: 15px 0; }
  .usage-row { padding: 22px 0; }
}
</style>
