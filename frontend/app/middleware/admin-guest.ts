export default defineNuxtRouteMiddleware(async (to) => {
  const { isLoggedIn, ensureCurrentUser } = useAuth()
  if (!isLoggedIn.value) return

  const currentUser = await ensureCurrentUser()
  if (currentUser?.role !== 'admin') return

  const redirect = safeRedirectPath(to.query.redirect, '/admin/questions')
  const redirectPath = redirect.startsWith('/admin/')
    ? redirect
    : '/admin/questions'

  return navigateTo(redirectPath)
})
