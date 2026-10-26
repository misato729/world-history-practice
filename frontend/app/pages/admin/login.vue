<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'admin-guest' })

const route = useRoute()
const { login, logout, user } = useAuth()
const email = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')

const redirectPath = computed(() => {
  const redirect = safeRedirectPath(route.query.redirect, '/admin/questions')
  return redirect.startsWith('/admin/') ? redirect : '/admin/questions'
})

const nonAdminSession = computed(() => user.value && user.value.role !== 'admin')

const submit = async () => {
  if (submitting.value) return

  submitting.value = true
  errorMessage.value = ''

  try {
    const loggedInUser = await login({ email: email.value, password: password.value })
    if (loggedInUser.role !== 'admin') {
      logout()
      errorMessage.value = 'このアカウントには管理者権限がありません。'
      return
    }

    await navigateTo(redirectPath.value)
  }
  catch (error: any) {
    errorMessage.value = error?.data?.error?.message ?? 'ログインできませんでした。もう一度お試しください。'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="admin-layout admin-login-shell">
    <header class="admin-login-header">
      <NuxtLink class="admin-brand" to="/admin/login" aria-label="管理画面ログイン">
        <span class="admin-brand-mark"><UIcon name="i-lucide-shield-check" /></span>
        <span><strong>{{ SITE.short_name }}</strong><small>管理画面</small></span>
      </NuxtLink>
      <NuxtLink class="admin-site-link" to="/"><UIcon name="i-lucide-arrow-left" />一般画面に戻る</NuxtLink>
    </header>

    <main class="admin-login-main">
      <section class="admin-login-card">
        <span class="admin-login-icon" aria-hidden="true"><UIcon name="i-lucide-lock-keyhole" /></span>
        <p class="admin-page-eyebrow">ADMINISTRATOR</p>
        <h1>管理画面ログイン</h1>
        <p class="admin-login-lead">管理者アカウントでログインしてください。</p>

        <p v-if="nonAdminSession || route.query.reason === 'forbidden'" class="admin-session-note">
          <UIcon name="i-lucide-info" />
          <span>現在のアカウントは管理画面を利用できません。管理者アカウントでログインし直してください。</span>
        </p>

        <form class="admin-login-form" @submit.prevent="submit">
          <div class="admin-field">
            <label for="admin-email">メールアドレス</label>
            <div class="admin-login-input"><UIcon name="i-lucide-mail" /><input id="admin-email" v-model="email" autocomplete="email" type="email" required placeholder="admin@example.com"></div>
          </div>
          <div class="admin-field">
            <label for="admin-password">パスワード</label>
            <div class="admin-login-input"><UIcon name="i-lucide-key-round" /><input id="admin-password" v-model="password" autocomplete="current-password" type="password" minlength="8" required></div>
          </div>
          <p v-if="errorMessage" class="admin-inline-error" role="alert">{{ errorMessage }}</p>
          <button class="admin-primary-button admin-login-button" type="submit" :disabled="submitting">
            <UIcon :name="submitting ? 'i-lucide-loader-circle' : 'i-lucide-log-in'" :class="{ spin: submitting }" />
            {{ submitting ? 'ログイン中です' : '管理画面にログイン' }}
          </button>
        </form>

        <p class="admin-login-help">一般画面で管理者としてログイン済みの場合、再ログインは不要です。</p>
      </section>
    </main>
    <SiteFooter admin />
  </div>
</template>

<style scoped>
.admin-login-shell { display: flex; flex-direction: column; }
.admin-login-header { min-height: 66px; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 0 28px; border-bottom: 1px solid var(--admin-line); background: var(--admin-chrome); }
.admin-login-main { flex: 1; display: grid; place-items: center; padding: 48px 20px 70px; }
.admin-login-card { width: min(460px, 100%); padding: 36px; border: 1px solid var(--admin-line); border-radius: 8px; background: var(--admin-surface); box-shadow: 0 24px 70px rgba(0, 0, 0, .24); }
.admin-login-icon { width: 48px; height: 48px; display: grid; place-items: center; margin-bottom: 22px; border-radius: 6px; background: var(--admin-selection); color: var(--admin-accent-hover); font-size: 1.5rem; }
.admin-login-card h1 { margin: 0; font-size: 1.6875rem; line-height: 1.35; }
.admin-login-lead { margin: 11px 0 0; color: var(--admin-muted); font-size: 0.8125rem; line-height: 1.75; }
.admin-session-note { display: flex; align-items: flex-start; gap: 8px; margin: 20px 0 0; padding: 12px 13px; border: 1px solid var(--admin-line-strong); border-radius: 5px; background: var(--admin-surface-2); color: var(--admin-muted); font-size: 0.75rem; line-height: 1.7; }
.admin-session-note :deep(svg) { flex: 0 0 auto; margin-top: 2px; color: var(--admin-accent-hover); }
.admin-login-form { display: grid; gap: 17px; margin-top: 26px; }
.admin-login-input { position: relative; }
.admin-login-input :deep(svg) { position: absolute; top: 50%; left: 12px; width: 17px; height: 17px; color: var(--admin-subtle); transform: translateY(-50%); }
.admin-login-input input { padding-left: 39px; }
.admin-login-button { width: 100%; margin-top: 3px; }
.admin-login-help { margin: 24px 0 0; padding-top: 20px; border-top: 1px solid var(--admin-line); color: var(--admin-subtle); font-size: 0.6875rem; line-height: 1.7; text-align: center; }
.spin { animation: admin-spin 1s linear infinite; }
@media (max-width: 560px) {
  .admin-login-header { min-height: 60px; padding: 0 14px; }
  .admin-login-header .admin-site-link { font-size: 0; }
  .admin-login-header .admin-site-link :deep(svg) { width: 21px; height: 21px; }
  .admin-login-main { align-items: start; padding: 28px 14px 50px; }
  .admin-login-card { padding: 26px 20px; }
  .admin-login-card h1 { font-size: 1.5rem; }
}
</style>
