<script setup lang="ts">
import type { NitroFetchOptions } from 'nitropack/types'
import { EXAM_CATALOG, FREE_EXAM_MAX, publishedQuestionNumbers, type ExamCatalogEntry } from '~/utils/examCatalog'
import type { LearningBlock as ContentBlock, GroupPassage, PassageReference, InputConstraints, SourceReference as StructuredSource } from '../../../../shared/types/learning'
import { presentSources, shortAnswerIssue } from '~/utils/learningPresentation'
import { essayAnswerIssue, type EssayConstraints } from '~/utils/essayPresentation'
import type { EssayGrade } from '../../../../shared/types/essay'
import { canRetainPassageContext, isCurrentPracticeRequest, reconcilePassageContext, type PracticePassageContext, type PracticeRequestTag } from '~/utils/practicePassageState'
import type { CulturalHistoryCategoryCode } from '~/utils/examConfig'
import { culturalHistoryLabel, historyTopicFilterLabel } from '~/utils/historyTopics'
import {
  selectPracticePositions,
  shufflePracticeSequence,
  type PracticeOrder,
  type PracticePosition,
} from '~/utils/practiceSequence'

type Choice = {
  id: number
  choice_label: string
  content_blocks: ContentBlock[]
  display_order: number
}

type Question = {
  id: number
  exam_number: number
  question_number: number
  content_blocks: ContentBlock[]
  major_category_code: string
  category_code: string
  is_cultural_history: boolean
  is_art_history: boolean
  cultural_history_category: CulturalHistoryCategoryCode | null
  choices: Choice[]
  answer_type?: 'single_choice' | 'short_text' | 'essay'
  essay_constraints?: EssayConstraints
  input_constraints?: InputConstraints
  question_version?: number
  group_question_number?: number | null
  group?: { id: number; group_number: number; title: string; question_numbers: number[] } | null
  shared_passages?: GroupPassage[]
  passage_references?: PassageReference[]
  is_favorite?: boolean
}

type AnswerResult = {
  question_id: number
  selected_choice_id?: number | null
  answer_type?: string
  submitted_text?: string
  correct_answer?: string
  question_version?: number
  source_references?: StructuredSource[]
  is_correct: boolean | null
  essay_result?: EssayGrade
  model_answer?: string
  correct_choice?: Choice | null
  explanation_blocks: ContentBlock[]
  source_text: string | null
  answer_history_id: number | null
}

type AnswerHistoryDetail = {
  id: number
  question: { id: number }
  selected_choice?: { id: number } | null
  answer_type?: string
  submitted_text?: string
  correct_answer?: string
  question_version?: number
  source_references?: StructuredSource[]
  is_correct: boolean | null
  essay_result?: EssayGrade
  model_answer?: string
  correct_choice?: Choice | null
  explanation_blocks: ContentBlock[]
  source_text: string | null
}

type ApiResponse<T> = { data: T }
type TaggedQuestionResponse = ApiResponse<Question> & { requestContext: PracticeRequestTag }
type QuestionEndpoint = '/api/v1/questions/next'

definePageMeta({
  key: route => `practice:${String(route.params.examNumber)}`,
})

const route = useRoute()
const { $api: api } = useNuxtApp()
const { isLoggedIn, user, accessToken, authHeaders, logout } = useAuth()
const { canUseFavorites, isFavorite, setFavorite, toggleFavorite } = useFavorites()
const updatingFavorite = ref(false)

const allExamNumbers = EXAM_CATALOG.map(exam => exam.exam_number)
const allQuestionNumbers = computed(() => publishedQuestionNumbers(matchingCatalog.value?.data ?? []))

const parseNumberSelection = (value: unknown, allowedNumbers: readonly number[]) => {
  const serialized = Array.isArray(value) ? value.join(',') : typeof value === 'string' ? value : ''
  return [...new Set(
    serialized
      .split(',')
      .map(part => Number(part))
      .filter(number => Number.isInteger(number) && allowedNumbers.includes(number)),
  )].sort((left, right) => left - right)
}

const examNumber = computed(() => Number(route.params.examNumber))
const questionNumber = computed(() => Number(route.params.questionNumber))
const practiceSubjectQuery = computed<Record<string, string>>((previous) => {
  const next = Object.fromEntries(['major_category_code', 'category_code', 'history_topic']
    .map(key => [key, route.query[key]])
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '' && !(entry[0] === 'history_topic' && entry[1] === 'all')),
  )
  return previous && JSON.stringify(previous) === JSON.stringify(next) ? previous : next
})
const conditionScope = computed(() => JSON.stringify([
  ...['exams', 'questions', 'order', 'seed'].map(key => route.query[key] ?? null), practiceSubjectQuery.value,
]))
const scopeGeneration = ref(0)
const requestInstance = useId()
let pageActive = true
const navigationGeneration = ref(0)
const latestQuestionRequest = ref(0)
const passageContext = shallowRef<PracticePassageContext | null>(null)
const requestFailure = shallowRef<{ context: PracticeRequestTag; error: any } | null>(null)
const sharedPassagePanel = ref<{ showReference: (reference: PassageReference, isCurrent?: () => boolean) => Promise<void> } | null>(null)
const currentRequestContext = (): PracticeRequestTag => ({ instance: requestInstance, scope: scopeGeneration.value, navigation: navigationGeneration.value, request: latestQuestionRequest.value, examNumber: examNumber.value, questionNumber: questionNumber.value })
const requestIsCurrent = (context: PracticeRequestTag | undefined) => pageActive && isCurrentPracticeRequest(context, currentRequestContext())
const hasSubjectFilter = computed(() => Object.keys(practiceSubjectQuery.value).length > 0)
const hasConditionSelection = computed(() => (
  route.query.exams !== undefined || route.query.questions !== undefined || hasSubjectFilter.value
))
const selectedSubjectLabel = computed(() => [
  MAJOR_CATEGORIES.find(item => item.value === practiceSubjectQuery.value.major_category_code)?.label,
  CATEGORIES.find(item => item.value === practiceSubjectQuery.value.category_code)?.label,
  historyTopicFilterLabel(practiceSubjectQuery.value.history_topic),
].filter(Boolean).join(' / '))
const practiceOrder = computed<PracticeOrder>(() => (
  route.query.order === 'random' ? 'random' : 'sequential'
))
const practiceSeed = computed(() => {
  const value = Array.isArray(route.query.seed) ? route.query.seed[0] : route.query.seed
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null

  const seed = Number(value)
  return Number.isSafeInteger(seed) && seed >= 0 && seed <= 0xFFFFFFFF ? seed : null
})
const selectedPracticeExamNumbers = computed(() => {
  const selected = parseNumberSelection(route.query.exams, allExamNumbers)
  return selected.length > 0 ? selected : [examNumber.value]
})
const selectedPracticeQuestionNumbers = computed(() => {
  if (route.query.questions === undefined) return undefined
  const selected = parseNumberSelection(route.query.questions, allQuestionNumbers.value)
  if (selected.length > 0) return selected
  return [...allQuestionNumbers.value]
})
const {
  data: matchingCatalog,
  status: catalogStatus,
  error: catalogError,
  refresh: refreshCatalog,
} = await useFetch<ApiResponse<ExamCatalogEntry[]>>('/api/v1/exams', {
  $fetch: api,
  query: practiceSubjectQuery,
  headers: authHeaders,
  server: false,
  lazy: true,
  watch: false,
})
const basePracticeSequence = computed<PracticePosition[]>(() => selectPracticePositions(matchingCatalog.value?.data ?? [], selectedPracticeExamNumbers.value, selectedPracticeQuestionNumbers.value))
const isRandomPractice = computed(() => (
  hasConditionSelection.value
  && practiceOrder.value === 'random'
  && practiceSeed.value !== null
))
const practiceSequence = computed<PracticePosition[]>(() => (
  isRandomPractice.value
    ? shufflePracticeSequence(basePracticeSequence.value, practiceSeed.value!)
    : basePracticeSequence.value
))
const currentPracticeIndex = computed(() => practiceSequence.value.findIndex(position => (
  position.examNumber === examNumber.value && position.questionNumber === questionNumber.value
)))
const nextPracticePosition = computed(() => (
  currentPracticeIndex.value >= 0
    ? practiceSequence.value[currentPracticeIndex.value + 1] ?? null
    : null
))
const practiceNavigationQuery = computed(() => {
  if (hasConditionSelection.value) {
    const query: Record<string, string> = {
      exams: selectedPracticeExamNumbers.value.join(','),
      ...practiceSubjectQuery.value,
    }
    if (selectedPracticeQuestionNumbers.value !== undefined) query.questions = selectedPracticeQuestionNumbers.value.join(',')
    if (isRandomPractice.value) {
      query.order = 'random'
      query.seed = String(practiceSeed.value)
    }
    return query
  }
  return {}
})
const validRoutePosition = computed(() => (
  Number.isInteger(examNumber.value)
  && allExamNumbers.includes(examNumber.value)
  && Number.isInteger(questionNumber.value)
  && questionNumber.value > 0 && questionNumber.value <= 10000
))
const validPosition = computed(() => validRoutePosition.value && currentPracticeIndex.value >= 0)

const requestQuery = computed(() => ({
  exam_number: validRoutePosition.value ? examNumber.value : 0,
  question_number: validRoutePosition.value ? questionNumber.value : -1,
  ...practiceSubjectQuery.value,
}))

const questionFetch = (async (request: QuestionEndpoint, options?: NitroFetchOptions<QuestionEndpoint>): Promise<TaggedQuestionResponse> => {
  const context = { ...currentRequestContext(), request: ++latestQuestionRequest.value }
  requestFailure.value = null
  try {
    const response = await api<ApiResponse<Question>, QuestionEndpoint>(request, options)
    return { ...response, requestContext: context }
  }
  catch (error) {
    if (requestIsCurrent(context)) requestFailure.value = { context, error }
    throw error
  }
}) as typeof api

const {
  data: questionResponse,
  status,
  refresh,
} = await useFetch<TaggedQuestionResponse>('/api/v1/questions/next', {
  key: `practice-question:${requestInstance}`,
  $fetch: questionFetch,
  query: requestQuery,
  headers: authHeaders,
  server: false,
  // 画面遷移をAPIの応答待ちで止めず、起動待ち中も読み込み表示を出す。
  lazy: true,
  watch: false,
  getCachedData: () => undefined,
})

const question = computed(() => {
  const response = questionResponse.value
  if (status.value !== 'success' || !requestIsCurrent(response?.requestContext)) return null
  const loaded = response?.data
  if (!loaded || loaded.exam_number !== examNumber.value || loaded.question_number !== questionNumber.value) return null
  return loaded
})
const questionError = computed(() => requestIsCurrent(requestFailure.value?.context) ? requestFailure.value?.error : null)
const retainedPassageContext = computed(() => canRetainPassageContext(passageContext.value, { examNumber: examNumber.value, questionNumber: questionNumber.value, scope: scopeGeneration.value }) ? passageContext.value : null)
const displayedGroup = computed(() => question.value?.group ?? retainedPassageContext.value?.group)
const questionLoading = computed(() => status.value === 'idle' || status.value === 'pending' || catalogStatus.value === 'idle' || catalogStatus.value === 'pending' || (!requestIsCurrent(questionResponse.value?.requestContext) && !questionError.value))

const selectedChoiceId = ref<number | null>(null)
const submittedText = ref('')
const submissionKey = ref<string | null>(null)
let answerRequestVersion = 0
const answerResult = ref<AnswerResult | null>(null)
const answerError = ref('')
const submitting = ref(false)
const loadingNext = ref(false)
const completed = ref(false)
const favoriteModalOpen = ref(false)
const favoriteModalCloseButton = ref<HTMLButtonElement | null>(null)
const restoredHistoryId = ref<number | null>(null)

const majorCategoryLabel = computed(() => (
  MAJOR_CATEGORIES.find(item => item.value === question.value?.major_category_code)?.label
  ?? question.value?.major_category_code
  ?? ''
))
const categoryLabel = computed(() => getCategoryLabel(question.value?.category_code ?? ''))
const questionIsFavorite = computed(() => (
  isLoggedIn.value && question.value ? isFavorite(question.value.id) : false
))
const sourceReferences = computed(() => presentSources(answerResult.value?.source_references, answerResult.value?.source_text))
const displayedQuestionNumber = computed(() => question.value?.group_question_number ?? (displayedGroup.value ? displayedGroup.value.question_numbers.indexOf(questionNumber.value) + 1 : questionNumber.value))
const visibleGroupNumbers = computed(() => (displayedGroup.value?.question_numbers ?? []).filter(number => (
  practiceSequence.value.some(position => position.examNumber === examNumber.value && position.questionNumber === number)
)))
const referenceLabel = (reference: PassageReference) => {
  const passage = question.value?.shared_passages?.find(item => item.id === reference.passage_id)
  const anchor = passage?.content_blocks.flatMap(block => block.inlines ?? []).find(part => part.type !== 'text' && part.id === reference.anchor_id)
  if (anchor?.type === 'blank') return `【${passage?.label ?? ''}】 空欄${anchor.label}`
  return anchor?.type === 'anchor' ? `【${passage?.label ?? ''}】 (${anchor.label})` : `【${passage?.label ?? ''}】`
}
const showReference = async (reference: PassageReference) => {
  const context = currentRequestContext()
  await sharedPassagePanel.value?.showReference(reference, () => requestIsCurrent(context))
}
watch([selectedChoiceId, submittedText], () => { submissionKey.value = null })

const questionErrorStatus = computed(() => {
  const error = questionError.value as any
  return error?.statusCode ?? error?.status
})
const questionErrorCode = computed(() => (questionError.value as any)?.data?.error?.code)
const paywallRequired = computed(() => (
  PAYMENTS_ENABLED && examNumber.value > FREE_EXAM_MAX
  && (questionErrorStatus.value === 401 || questionErrorCode.value === 'paid_membership_required')
))
const paywallNeedsLogin = computed(() => questionErrorStatus.value === 401)

const loadErrorMessage = computed(() => {
  if (questionLoading.value) return ''
  if (catalogError.value) return '演習条件を確認できませんでした。もう一度お試しください。'
  if (!validPosition.value) return hasSubjectFilter.value ? '指定された条件に合う公開問題が見つかりませんでした。' : '試験ナンバーまたは問番号が正しくありません。'
  if (paywallRequired.value) return ''
  if (questionError.value || (questionResponse.value && !question.value)) return '指定された公開問題が見つかりませんでした。'
  return ''
})
const practiceProgress = computed(() => (
  hasConditionSelection.value && currentPracticeIndex.value >= 0
    ? `${isRandomPractice.value ? 'ランダム ' : ''}${currentPracticeIndex.value + 1} / ${practiceSequence.value.length}`
    : ''
))
const completionHeading = computed(() => (
  hasConditionSelection.value
    ? '選択した問題をすべて解き終えました'
    : '公開中の問題はここまでです'
))
const completionMessage = computed(() => {
  if (hasConditionSelection.value) {
    return `${selectedPracticeExamNumbers.value.length}件の模擬試験、全${practiceSequence.value.length}問の演習が完了しました。`
  }
  return `模擬試験 ${examNumber.value} の公開問題をすべて解き終えました。`
})

const resetAnswer = () => {
  answerRequestVersion++
  selectedChoiceId.value = null
  submittedText.value = ''
  answerResult.value = null
  restoredHistoryId.value = null
  submissionKey.value = null
  submitting.value = false
  answerError.value = ''
  completed.value = false
  favoriteModalOpen.value = false
}

watch([accessToken, () => user.value?.id, () => user.value?.role, () => user.value?.paid_content_access, conditionScope], () => {
  scopeGeneration.value++
  passageContext.value = null
  requestFailure.value = null
  resetAnswer()
}, { flush: 'sync' })

watch([examNumber, questionNumber], () => {
  navigationGeneration.value++
  requestFailure.value = null
  if (!canRetainPassageContext(passageContext.value, { examNumber: examNumber.value, questionNumber: questionNumber.value, scope: scopeGeneration.value })) passageContext.value = null
  resetAnswer()
}, { flush: 'sync' })
watch(() => route.query.answer_history_id, resetAnswer, { flush: 'sync' })
watch([() => question.value?.id, () => question.value?.question_version], resetAnswer, { flush: 'sync' })
watch([scopeGeneration, navigationGeneration], () => { if (pageActive) void refresh() }, { flush: 'post' })
watch([practiceSubjectQuery, accessToken, () => user.value?.id, () => user.value?.paid_content_access, () => user.value?.role], () => { if (pageActive) void refreshCatalog() }, { flush: 'post' })

watch(question, (loaded) => {
  if (!loaded) return
  passageContext.value = reconcilePassageContext(passageContext.value, loaded, scopeGeneration.value)
  if (loaded && typeof loaded.is_favorite === 'boolean') setFavorite(loaded, loaded.is_favorite)
}, { immediate: true })

watch([questionError, catalogError], ([failure, catalogFailure]) => {
  if (failure || catalogFailure) {
    passageContext.value = null
  }
}, { flush: 'sync' })

onBeforeUnmount(() => {
  pageActive = false
  answerRequestVersion++
  passageContext.value = null
})

watch(questionErrorStatus, (errorStatus) => {
  if (errorStatus === 401 && isLoggedIn.value) logout()
})

const submitAnswer = async () => {
  if (!question.value || submitting.value || answerResult.value) return
  if (question.value.answer_type === 'essay' ? Boolean(essayAnswerIssue(submittedText.value, question.value.essay_constraints)) : question.value.answer_type === 'short_text' ? Boolean(shortAnswerIssue(submittedText.value, question.value.input_constraints)) : selectedChoiceId.value === null) return
  const currentId = question.value.id
  const currentVersion = question.value.question_version ?? 1
  const requestVersion = ++answerRequestVersion
  const currentToken = accessToken.value
  const answerContext = currentRequestContext()
  submissionKey.value ??= crypto.randomUUID()

  submitting.value = true
  answerError.value = ''

  try {
    const response = await api<ApiResponse<AnswerResult>>(
      `/api/v1/questions/${question.value.id}/answer`,
      {
        method: 'POST',
        headers: authHeaders.value,
        body: { answer_type: question.value.answer_type ?? 'single_choice', question_version: currentVersion, submission_key: submissionKey.value, ...(['short_text', 'essay'].includes(question.value.answer_type ?? '') ? { submitted_text: submittedText.value } : { selected_choice_id: selectedChoiceId.value }) },
      },
    )
    if (requestVersion !== answerRequestVersion || currentId !== question.value?.id || currentToken !== accessToken.value) return
    answerResult.value = response.data
  }
  catch (error: any) {
    if (requestVersion !== answerRequestVersion || currentId !== question.value?.id || currentToken !== accessToken.value) return
    if ((error?.statusCode ?? error?.status) === 409) {
      await refresh()
      // Refresh changes the request counter and content version, not the answer's location.
      if (!pageActive || answerContext.instance !== requestInstance
        || answerContext.scope !== scopeGeneration.value || answerContext.navigation !== navigationGeneration.value
        || answerContext.examNumber !== examNumber.value || answerContext.questionNumber !== questionNumber.value
        || currentId !== question.value?.id || currentToken !== accessToken.value) return
      answerError.value = '問題が更新されました。内容を確認して回答し直してください。'
      return
    }
    if (error?.statusCode === 401 || error?.status === 401) {
      logout()
      answerError.value = 'ログインの有効期限が切れました。もう一度ログインしてください。'
      return
    }
    if (error?.data?.error?.code === 'paid_membership_required') {
      answerError.value = 'プレミアム会員資格を確認できません。プレミアム会員ページをご確認ください。'
      return
    }
    answerError.value = error?.data?.error?.message ?? '回答を送信できませんでした。通信状況を確認して、もう一度お試しください。'
  }
  finally {
    if (requestVersion === answerRequestVersion) submitting.value = false
  }
}

const answerHistoryId = computed(() => {
  const value = Number(route.query.answer_history_id)
  return Number.isInteger(value) && value > 0 ? value : null
})

const restoreAnswerHistory = async () => {
  if (!question.value || !isLoggedIn.value || !answerHistoryId.value) return
  if (restoredHistoryId.value === answerHistoryId.value) return
  const requestVersion = answerRequestVersion
  const token = accessToken.value

  try {
    const response = await api<ApiResponse<AnswerHistoryDetail>>(
      `/api/v1/answer_histories/${answerHistoryId.value}`,
      {
        headers: authHeaders.value,
      },
    )
    if (requestVersion !== answerRequestVersion || token !== accessToken.value) return
    const history = response.data
    if (history.question.id !== question.value.id || (history.question_version && history.question_version !== question.value.question_version)) {
      answerError.value = 'この解答履歴は表示中の問題と一致しません。'
      return
    }

    selectedChoiceId.value = history.selected_choice?.id ?? null
    submittedText.value = history.submitted_text ?? ''
    answerResult.value = {
      question_id: history.question.id,
      selected_choice_id: history.selected_choice?.id ?? null,
      answer_type: history.answer_type,
      submitted_text: history.submitted_text,
      correct_answer: history.correct_answer,
      question_version: history.question_version,
      source_references: history.source_references,
      is_correct: history.is_correct,
      essay_result: history.essay_result,
      model_answer: history.model_answer,
      correct_choice: history.correct_choice,
      explanation_blocks: history.explanation_blocks,
      source_text: history.source_text,
      answer_history_id: history.id,
    }
    restoredHistoryId.value = history.id
  }
  catch (error: any) {
    if (requestVersion !== answerRequestVersion || token !== accessToken.value) return
    if (error?.statusCode === 401 || error?.status === 401) logout()
    else answerError.value = '解答履歴を読み込めませんでした。'
  }
}

watch(
  [question, answerHistoryId, isLoggedIn, accessToken],
  restoreAnswerHistory,
  { immediate: true },
)

const goToNextQuestion = async () => {
  if (!question.value || loadingNext.value) return

  if (!nextPracticePosition.value) {
    completed.value = true
    return
  }

  loadingNext.value = true
  answerError.value = ''

  try {
    await navigateTo({
      path: `/practice/${nextPracticePosition.value.examNumber}/${nextPracticePosition.value.questionNumber}`,
      query: practiceNavigationQuery.value,
    })
  }
  catch (error: any) {
    answerError.value = '次の問題へ移動できませんでした。もう一度お試しください。'
  }
  finally {
    loadingNext.value = false
  }
}

const closeFavoriteModal = () => {
  favoriteModalOpen.value = false
}

const handleFavoriteClick = async () => {
  if (!question.value || updatingFavorite.value || (isLoggedIn.value && !user.value)) return

  if (!canUseFavorites.value) {
    favoriteModalOpen.value = true
    await nextTick()
    favoriteModalCloseButton.value?.focus()
    return
  }

  updatingFavorite.value = true
  try {
    await toggleFavorite(question.value)
  }
  catch (error: any) {
    if ((error?.statusCode ?? error?.status) === 401) logout()
    answerError.value = error?.data?.error?.message ?? 'お気に入りを更新できませんでした。'
  }
  finally {
    updatingFavorite.value = false
  }
}

const handleFavoriteModalKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && favoriteModalOpen.value) closeFavoriteModal()
}

onMounted(() => window.addEventListener('keydown', handleFavoriteModalKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleFavoriteModalKeydown))
</script>

<template>
  <div class="page-wrap practice-wrap">
    <div v-if="questionLoading && !retainedPassageContext" class="state-panel" role="status" aria-live="polite" aria-busy="true">
      <UIcon class="spin" name="i-lucide-loader-circle" aria-hidden="true" />
      <p>問題を読み込んでいます</p>
    </div>

    <div v-else-if="paywallRequired" class="state-panel paywall-panel">
      <UIcon name="i-lucide-lock-keyhole" />
      <h1>模擬試験{{ examNumber }}はプレミアム会員向けです</h1>
      <p v-if="paywallNeedsLogin">模擬試験{{ FREE_EXAM_MAX + 1 }}以降を利用するには、ログインしてプレミアム会員資格を確認してください。</p>
      <p v-else>{{ PRICE_LABEL }}の買い切りで、模擬試験{{ FREE_EXAM_MAX + 1 }}以降の公開問題を利用できます。</p>
      <div class="state-actions">
        <NuxtLink v-if="paywallNeedsLogin" class="secondary-link" :to="{ path: '/login', query: { redirect: route.fullPath } }">ログイン</NuxtLink>
        <NuxtLink class="primary-link" to="/premium">プレミアム会員について確認する</NuxtLink>
      </div>
    </div>

    <div v-else-if="!retainedPassageContext && (loadErrorMessage || !question)" class="state-panel error-panel">
      <UIcon name="i-lucide-circle-alert" />
      <h1>問題を表示できません</h1>
      <p>{{ loadErrorMessage || '指定された公開問題が見つかりませんでした。' }}</p>
      <div class="state-actions">
        <button class="secondary-link" type="button" @click="() => { refresh(); refreshCatalog() }">再読み込み</button>
        <NuxtLink class="primary-link" to="/practice/1/1">問1から始める</NuxtLink>
      </div>
    </div>

    <template v-else>
      <header class="practice-head">
        <div>
          <div class="practice-context">
            <span class="exam-label">模擬試験 {{ examNumber }}</span>
            <span v-if="practiceProgress" class="practice-progress">{{ practiceProgress }}</span>
          </div>
          <h1 v-if="displayedGroup"><span class="group-number">大問{{ displayedGroup.group_number }}</span> {{ displayedGroup.title }}</h1>
          <h1 v-else>模擬試験 {{ examNumber }}</h1>
          <p v-if="selectedSubjectLabel" class="selected-subject">{{ selectedSubjectLabel }}</p>
        </div>
        <div class="practice-meta">
          <div class="question-classification">
            <template v-if="question">
              <p>{{ majorCategoryLabel }} / {{ categoryLabel }}</p>
              <span v-if="question.is_cultural_history" class="history-topic-label">{{ culturalHistoryLabel(question) }}</span>
            </template>
          </div>
          <button
            class="favorite-button"
            :class="{ active: questionIsFavorite }"
            type="button"
            :disabled="!question || updatingFavorite || (isLoggedIn && !user)"
            :aria-pressed="isLoggedIn ? questionIsFavorite : false"
            :aria-label="questionIsFavorite ? 'お気に入りから解除する' : 'お気に入りに登録する'"
            :title="questionIsFavorite ? 'お気に入りから解除' : 'お気に入りに登録'"
            @click="handleFavoriteClick"
          >
            <FavoriteStarIcon :filled="questionIsFavorite" :size="34" />
          </button>
        </div>
      </header>

      <nav v-if="displayedGroup && visibleGroupNumbers.length > 1" class="group-question-nav" aria-label="大問内の小問">
        <NuxtLink v-for="number in visibleGroupNumbers" :key="number" :to="{ path: `/practice/${examNumber}/${number}`, query: practiceNavigationQuery }" :aria-current="number === questionNumber ? 'page' : undefined">問{{ displayedGroup.question_numbers.indexOf(number) + 1 }}</NuxtLink>
      </nav>
      <div class="practice-columns">
      <SharedPassagePanel v-if="retainedPassageContext" :key="`${retainedPassageContext.scope}:${retainedPassageContext.key}`" ref="sharedPassagePanel" :passages="retainedPassageContext.passages" />
      <section class="question-panel" :aria-busy="questionLoading">
        <h2 class="question-number">問{{ displayedQuestionNumber }}</h2>
        <div v-if="questionLoading" class="question-loading" role="status" aria-live="polite">
          <UIcon class="spin" name="i-lucide-loader-circle" aria-hidden="true" />
          <p>問題を読み込んでいます</p>
        </div>
        <div v-else-if="loadErrorMessage || !question" class="question-loading" role="alert">
          <p>{{ loadErrorMessage || '指定された公開問題が見つかりませんでした。' }}</p>
          <button class="secondary-link" type="button" @click="refresh()">再読み込み</button>
        </div>
        <template v-else>
        <div class="question-text">
          <QuestionContentBlocks :blocks="question.content_blocks" />
        </div>

        <div v-if="question.passage_references?.length" class="passage-references" aria-label="参照する本文">
          <button v-for="reference in question.passage_references" :key="`${reference.passage_id}-${reference.anchor_id ?? 'all'}`" type="button" @click="showReference(reference)">{{ referenceLabel(reference) }}を確認</button>
        </div>
        <QuestionAnswerForm v-model:selected-choice-id="selectedChoiceId" v-model:submitted-text="submittedText" :answer-type="question.answer_type" :choices="question.choices" :constraints="question.input_constraints" :essay-constraints="question.essay_constraints" :disabled="Boolean(answerResult)" :submitting="submitting" :correct-choice-id="answerResult?.correct_choice?.id" :is-correct="answerResult?.is_correct" @submit="submitAnswer" />

        <p v-if="answerError" class="inline-error" role="alert">{{ answerError }}</p>

        <section
          v-if="answerResult"
          class="answer-result"
          :class="{ correct: answerResult.is_correct, essay: answerResult.answer_type === 'essay' }"
          aria-live="polite"
        >
          <div v-if="answerResult.answer_type !== 'essay'" class="result-heading">
            <UIcon :name="answerResult.is_correct ? 'i-lucide-circle-check' : 'i-lucide-circle-x'" />
            <strong>{{ answerResult.is_correct ? '正解です' : '不正解です' }}</strong>
          </div>

          <template v-else>
            <div class="result-heading essay-heading"><UIcon name="i-lucide-clipboard-check" /><strong>論述の採点結果</strong></div>
            <EssayScoringResult v-if="answerResult.essay_result" :result="answerResult.essay_result" :model-answer="answerResult.model_answer" :submitted-text="answerResult.submitted_text" />
            <p v-else>採点結果を取得できませんでした。履歴を再読み込みしてください。</p>
          </template>

          <div v-if="answerResult.answer_type !== 'essay'" class="result-section">
            <h2>正答</h2>
            <p v-if="answerResult.answer_type === 'short_text'" class="correct-short-answer">{{ answerResult.correct_answer }}</p>
            <div v-else-if="answerResult.correct_choice" class="correct-answer">
              <span>{{ answerResult.correct_choice.choice_label }}</span>
              <QuestionContentBlocks :blocks="answerResult.correct_choice.content_blocks" />
            </div>
            <p v-if="answerResult.answer_type === 'short_text'" class="submitted-answer">入力した解答：{{ answerResult.submitted_text }}</p>
          </div>

          <div class="result-section">
            <h2>解答解説</h2>
            <QuestionContentBlocks :blocks="answerResult.explanation_blocks" />
          </div>

          <div v-if="sourceReferences.length" class="result-section source-section">
            <h2>根拠資料</h2>
            <ul>
              <li v-for="(source, index) in sourceReferences" :key="`${source.url ?? source.label}-${index}`">
                <a
                  v-if="source.url"
                  :href="source.url"
                  target="_blank"
                  rel="noopener noreferrer"
                >{{ source.label }}</a>
                <span v-else>{{ source.label }}</span>
              </li>
            </ul>
          </div>

          <div v-if="completed" class="completed-message">
            <strong>{{ completionHeading }}</strong>
            <p>{{ completionMessage }}</p>
            <NuxtLink class="secondary-link" to="/">トップへ戻る</NuxtLink>
          </div>
          <button v-else class="primary-link next-button" type="button" :disabled="loadingNext" @click="goToNextQuestion">
            {{ loadingNext ? '読み込み中です' : '次の問題' }}
            <UIcon name="i-lucide-arrow-right" />
          </button>
        </section>
        </template>
      </section>
      </div>
    </template>

    <Teleport to="body">
      <Transition name="favorite-modal">
        <div
          v-if="favoriteModalOpen"
          class="favorite-modal-backdrop"
          @click.self="closeFavoriteModal"
        >
          <section
            class="favorite-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="favorite-modal-title"
          >
            <button
              ref="favoriteModalCloseButton"
              class="favorite-modal-close"
              type="button"
              aria-label="閉じる"
              @click="closeFavoriteModal"
            >
              <UIcon name="i-lucide-x" />
            </button>
            <span class="favorite-modal-icon" aria-hidden="true">
              <UIcon name="i-lucide-star" />
            </span>
            <h2 id="favorite-modal-title">お気に入り機能について</h2>
            <p>{{ PAYMENTS_ENABLED ? 'お気に入り登録は、プレミアム会員向けの機能です。' : 'お気に入り登録にはログインが必要です。' }}</p>
            <div class="favorite-modal-actions">
              <NuxtLink v-if="PAYMENTS_ENABLED" class="primary-link" to="/premium" @click="closeFavoriteModal">プレミアム会員について</NuxtLink>
              <NuxtLink v-if="!isLoggedIn" class="secondary-link" :to="{ path: '/login', query: { redirect: route.fullPath } }" @click="closeFavoriteModal">ログインへ</NuxtLink>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.practice-wrap { max-width: 900px; }
.practice-columns { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; align-items: start; }
.group-question-nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.group-question-nav a { padding: 8px 13px; border: 1px solid var(--line); border-radius: 4px; color: var(--teal-dark); text-decoration: none; font-weight: 700; }
.group-question-nav a[aria-current="page"] { border-color: var(--teal); background: var(--surface-tint); }
.passage-references { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
.passage-references button { min-height: 40px; border: 1px solid var(--line); padding: 7px 12px; color: var(--teal-dark); background: var(--surface-soft); border-radius: 4px; cursor: pointer; }
.correct-short-answer { font-size: 1.25rem; font-weight: 800; overflow-wrap: anywhere; }.submitted-answer { color: var(--muted); overflow-wrap: anywhere; }

.practice-head { padding: 46px 0 22px; display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.practice-head > div:first-child { flex: 3 1 0; }
.practice-context { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; }
.practice-head .exam-label { color: var(--teal); font-size: 0.875rem; font-weight: 800; }
.practice-progress { padding-left: 12px; border-left: 1px solid var(--line-strong); color: var(--muted); font-size: 0.8125rem; font-weight: 800; }
.practice-head h1 { margin: 5px 0 0; font-size: 2.25rem; }
.group-number { white-space: nowrap; }
.practice-head p { margin: 0; color: var(--muted); }
.practice-meta { min-width: 0; min-height: 42px; flex: 2 1 0; align-self: stretch; display: flex; align-items: flex-start; justify-content: flex-end; gap: 10px; }
.practice-head > div { min-width: 0; }
.practice-head p.selected-subject { margin-top: 8px; font-size: .8125rem; line-height: 1.7; }
.question-classification { min-width: 0; flex: 1 1 0; overflow-wrap: anywhere; text-align: right; font-size: .8125rem; line-height: 1.7; }
.history-topic-label { display: inline-block; margin-top: 5px; color: var(--teal-dark); font-weight: 800; }
.favorite-button {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: color .15s, transform .15s;
}
.favorite-button:hover { color: #c78b00; transform: scale(1.08); }
.favorite-button.active { color: #f0b323; }
.favorite-button:disabled { opacity: .6; cursor: wait; }
.question-panel { min-width: 0; padding: 32px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); }
.question-number { margin: 0 0 18px; font-size: 1.25rem; font-weight: 800; }
.question-text { margin: 0; font-size: 1.1875rem; font-weight: 700; line-height: 1.8; }
.question-loading { min-height: 220px; display: grid; place-content: center; justify-items: center; gap: 12px; color: var(--muted); }
.choices { display: grid; gap: 10px; margin-top: 28px; }
.choices label { position: relative; min-width: 0; min-height: 62px; display: grid; grid-template-columns: 20px 34px minmax(0, 1fr) 24px; align-items: start; gap: 10px; padding: 16px; border: 1px solid var(--line); border-radius: 6px; cursor: pointer; transition: border-color .15s, background .15s; }
.choices label:hover:not(:has(input:disabled)) { border-color: var(--teal); }
.choices input,
.choice-label { margin-top: 3px; }
.choices label.selected { border-color: var(--teal); background: var(--surface-selected); }
.choices label.correct { border-color: var(--success); background: var(--success-soft); }
.choices label.incorrect { border-color: var(--coral); background: #fff4f1; }
.choice-label { min-width: 0; overflow-wrap: anywhere; color: var(--teal-dark); font-weight: 900; }
.choice-content { min-width: 0; line-height: 1.65; }
.choice-mark { width: 22px; height: 22px; margin-top: 1px; }
.correct-mark { color: var(--success); }
.incorrect-mark { color: var(--coral); }
.answer-button { width: 180px; margin-top: 24px; }
.answer-button:disabled,
.next-button:disabled { opacity: .45; cursor: not-allowed; }
.inline-error { margin: 16px 0 0; color: #a23b2a; font-weight: 700; }
.answer-result { margin-top: 28px; padding: 24px; border-left: 4px solid var(--coral); background: #fff8f6; }
.answer-result.essay { border-color: var(--teal); background: var(--surface-tint); }
.answer-result.correct { border-color: var(--success); background: var(--success-soft); }
.result-heading { display: flex; align-items: center; gap: 10px; color: var(--coral); }
.correct .result-heading { color: var(--success); }
.essay .essay-heading { color: var(--teal-dark); }
.result-heading :deep(svg) { width: 26px; height: 26px; }
.result-heading strong { font-size: 1.375rem; }
.result-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--line); }
.result-section h2 { margin: 0 0 12px; color: var(--ink); font-size: 1rem; }
.correct-answer { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 10px; align-items: start; }
.correct-answer > span { color: var(--teal-dark); font-weight: 900; }
.source-section ul { display: grid; gap: 8px; margin: 0; padding-left: 1.2em; color: var(--text-secondary); line-height: 1.7; }
.source-section a { color: var(--teal-dark); font-weight: 700; text-underline-offset: 3px; }
.next-button { margin-top: 24px; }
.completed-message { margin-top: 24px; padding: 18px; border: 1px solid var(--line); background: var(--surface); }
.completed-message p { color: var(--muted); }
.state-panel { min-height: 360px; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px; text-align: center; }
.state-panel :deep(svg) { width: 34px; height: 34px; color: var(--teal); }
.state-panel p { margin: 0; color: var(--muted); }
.error-panel h1 { margin: 4px 0 0; font-size: 1.625rem; }
.error-panel :deep(svg) { color: var(--coral); }
.paywall-panel h1 { margin: 4px 0 0; font-size: 1.625rem; }
.paywall-panel :deep(svg) { color: var(--muted); }
.state-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 12px; }
.spin { animation: spin 1s linear infinite; }
.favorite-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(var(--shadow-color), .55);
}
.favorite-modal {
  position: relative;
  width: min(460px, 100%);
  padding: 34px;
  border-radius: 10px;
  background: var(--surface);
  box-shadow: 0 22px 60px rgba(var(--shadow-color), .24);
  text-align: center;
}
.favorite-modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: var(--surface-tint);
  color: var(--text-secondary);
  cursor: pointer;
}
.favorite-modal-icon {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  margin: 0 auto 18px;
  border-radius: 50%;
  background: #fff4cf;
  color: #c78b00;
}
.favorite-modal-icon :deep(svg) { width: 29px; height: 29px; fill: currentColor; }
.favorite-modal h2 { margin: 0; font-size: 1.5rem; }
.favorite-modal p { margin: 14px 0 0; color: var(--muted); line-height: 1.8; }
.favorite-modal-actions { display: flex; justify-content: center; gap: 10px; margin-top: 26px; }
.favorite-modal-enter-active,
.favorite-modal-leave-active { transition: opacity .16s ease; }
.favorite-modal-enter-active .favorite-modal,
.favorite-modal-leave-active .favorite-modal { transition: transform .18s ease; }
.favorite-modal-enter-from,
.favorite-modal-leave-to { opacity: 0; }
.favorite-modal-enter-from .favorite-modal,
.favorite-modal-leave-to .favorite-modal { transform: translateY(8px) scale(.98); }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 640px) {
  .practice-head { align-items: flex-start; flex-direction: column; }
  .practice-head > div:first-child, .practice-meta { width: 100%; flex: none; }
  .question-panel { padding: 22px; }
  .question-text { font-size: 1.125rem; }
  .choices label { grid-template-columns: 18px 28px minmax(0, 1fr) 22px; padding: 11px; }
  .answer-result { padding: 20px 16px; }
  .favorite-modal { padding: 30px 20px 24px; }
  .favorite-modal-actions { flex-direction: column; }
  .favorite-modal-actions a { width: 100%; }
}
</style>
