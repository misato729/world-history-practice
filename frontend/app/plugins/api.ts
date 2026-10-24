export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const route = useRoute()
  const { accessToken, logout } = useAuth()
  const { beginRequest, finishRequest } = useApiStatus()

  const api = $fetch.create({
    baseURL: import.meta.server && config.apiBaseInternal ? config.apiBaseInternal : config.public.apiBase,
    onRequest() {
      beginRequest()
    },
    onResponse({ response }) {
      finishRequest(response.status >= 500 ? 'failed' : 'connected')
    },
    onRequestError({ options }) {
      finishRequest(options.signal?.aborted ? undefined : 'failed')
    },
    async onResponseError({ response, options }) {
      const authorization = new Headers(options.headers).get('Authorization')
      if (response.status !== 401 || !accessToken.value || authorization !== `Bearer ${accessToken.value}`) return

      logout()
      if (import.meta.client && [route.meta.middleware].flat().includes('auth')) {
        await nuxtApp.runWithContext(() => navigateTo({ path: '/login', query: { redirect: route.fullPath } }))
      }
    },
  })

  return { provide: { api } }
})
