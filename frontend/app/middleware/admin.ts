export default defineNuxtRouteMiddleware(async (to) => {
  const { isLoggedIn, ensureCurrentUser } = useAuth()

  if (!isLoggedIn.value) {
    return navigateTo({ path: '/admin/login', query: { redirect: to.fullPath } })
  }

  const currentUser = await ensureCurrentUser()
  if (!currentUser) {
    return navigateTo({ path: '/admin/login', query: { redirect: to.fullPath } })
  }

  if (currentUser.role !== 'admin') {
    return navigateTo({
      path: '/admin/login',
      query: { redirect: to.fullPath, reason: 'forbidden' },
    })
  }
})
