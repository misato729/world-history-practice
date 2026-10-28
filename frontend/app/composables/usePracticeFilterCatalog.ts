import { computed, onMounted, onScopeDispose, ref, shallowRef, watch, type ComputedRef } from 'vue'
import type { ExamCatalogEntry } from '../utils/examCatalog.ts'
import { createPracticeFilterCatalogLoader, practiceFilterScopeKey, type PracticeFilterCatalogState, type PracticeFilterCatalogStatus } from '../utils/practiceFilterCatalog.ts'

export const usePracticeFilterCatalog = (subjectQuery: ComputedRef<Record<string, string>>, enabled: ComputedRef<boolean>) => {
  const { $api: api } = useNuxtApp()
  const { accessToken, authHeaders, user } = useAuth()
  const authGeneration = ref(0)
  const refreshTicket = ref(0)
  const state = shallowRef<PracticeFilterCatalogState>({ scope: null, status: 'idle', data: null, error: null })
  let mounted = false

  // A replacement token may belong to the same user. Keep the token out of request keys and diagnostics.
  watch([accessToken, () => user.value?.id, () => user.value?.role, () => user.value?.paid_content_access], () => {
    authGeneration.value++
  }, { flush: 'sync' })
  const scopeKey = computed(() => practiceFilterScopeKey(subjectQuery.value, authGeneration.value))
  const loader = createPracticeFilterCatalogLoader({
    scope: () => enabled.value ? scopeKey.value : null,
    fetchCatalog: async (query, headers, signal) => {
      const response = await api<{ data: ExamCatalogEntry[] }>('/api/v1/exams', { query, headers, signal })
      return response.data
    },
    onState: value => { state.value = value },
  })
  const refresh = () => mounted && enabled.value
    ? loader.refresh(subjectQuery.value, authHeaders.value)
    : Promise.resolve(null)

  // Invalidate synchronously, including A -> B -> A changes inside a single render batch.
  watch([scopeKey, enabled], () => {
    loader.invalidate()
    refreshTicket.value++
  }, { flush: 'sync' })
  watch(refreshTicket, () => {
    if (mounted && enabled.value) void refresh()
  }, { flush: 'post' })
  onMounted(() => {
    mounted = true
    if (enabled.value) void refresh()
  })
  onScopeDispose(() => {
    mounted = false
    loader.dispose()
  })

  const data = computed<ExamCatalogEntry[] | null>(() => (
    enabled.value && state.value.scope === scopeKey.value && state.value.status === 'success' ? state.value.data : null
  ))
  const status = computed<PracticeFilterCatalogStatus>(() => {
    if (!enabled.value) return 'idle'
    return state.value.scope === scopeKey.value ? state.value.status : 'pending'
  })
  const error = computed(() => enabled.value && state.value.scope === scopeKey.value ? state.value.error : null)
  return { data, status, error, refresh, scopeKey }
}
