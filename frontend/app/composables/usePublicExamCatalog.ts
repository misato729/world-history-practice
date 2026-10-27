import type { ExamCatalogEntry } from '../utils/examCatalog'

/** One shared, server-authorized catalog for the launcher, sidebar and practice. */
export const usePublicExamCatalog = () => {
  const { $api: api } = useNuxtApp()
  const { authHeaders, user } = useAuth()
  return useFetch<{ data: ExamCatalogEntry[] }>('/api/v1/exams', {
    key: 'public-exam-catalog',
    $fetch: api,
    headers: authHeaders,
    server: false,
    lazy: true,
    watch: [() => user.value?.id, () => user.value?.role, () => user.value?.paid_content_access],
  })
}
