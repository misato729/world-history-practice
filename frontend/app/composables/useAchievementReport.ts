import type { AchievementReport } from '../../shared/types/achievement'

export const useAchievementReport = () => {
  const { $api: api } = useNuxtApp()
  const { accessToken, authHeaders, user } = useAuth()
  const report = shallowRef<AchievementReport | null>(null)
  const loading = ref(false)
  const error = ref('')
  let generation = 0
  let active = true
  let controller: AbortController | undefined
  const reload = async () => {
    const version = ++generation
    const token = accessToken.value
    controller?.abort()
    controller = new AbortController()
    report.value = null
    error.value = ''
    loading.value = Boolean(token)
    if (!token || !active) return null
    try {
      const response = await api<{ data: AchievementReport }>('/api/v1/me/achievement', {
        headers: authHeaders.value, signal: controller.signal, retry: 0,
      })
      if (!active || version !== generation || token !== accessToken.value) return null
      report.value = response.data
      return response.data
    }
    catch {
      if (active && version === generation && token === accessToken.value) error.value = '学習の記録を読み込めませんでした。もう一度お試しください。'
      return null
    }
    finally { if (version === generation) loading.value = false }
  }
  watch([accessToken, () => user.value?.id, () => user.value?.paid_content_access], reload, { immediate: true, flush: 'sync' })
  onBeforeUnmount(() => { active = false; generation++; controller?.abort(); report.value = null })
  return { report, loading, error, reload }
}
