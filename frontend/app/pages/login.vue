<script setup lang="ts">
const route = useRoute()
const { login } = useAuth()
const email = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')

const redirectPath = computed(() => safeRedirectPath(route.query.redirect))

const submit = async () => {
  if (submitting.value) return

  submitting.value = true
  errorMessage.value = ''
  try {
    await login({ email: email.value, password: password.value })
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
  <div class="page-wrap auth-page">
    <header class="page-intro"><h1>ログイン</h1><p>解答履歴を保存できます。お気に入りはプレミアム会員向けです。</p></header>
    <form class="content-panel auth-form" @submit.prevent="submit">
      <div class="field"><label for="email">メールアドレス</label><input id="email" v-model="email" autocomplete="email" type="email" required></div>
      <div class="field"><label for="password">パスワード</label><input id="password" v-model="password" autocomplete="current-password" type="password" minlength="8" required></div>
      <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
      <button class="primary-link" type="submit" :disabled="submitting">{{ submitting ? 'ログイン中です' : 'ログイン' }}</button>
      <p class="auth-note">アカウントをお持ちでない方は <NuxtLink :to="{ path: '/signup', query: { redirect: redirectPath } }">会員登録</NuxtLink></p>
    </form>
  </div>
</template>
