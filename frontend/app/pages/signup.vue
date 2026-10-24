<script setup lang="ts">
const route = useRoute()
const { signup } = useAuth()
const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const submitting = ref(false)
const errorMessage = ref('')

const redirectPath = computed(() => safeRedirectPath(route.query.redirect))

const submit = async () => {
  if (submitting.value) return
  if (password.value !== passwordConfirmation.value) {
    errorMessage.value = '確認用パスワードが一致していません。'
    return
  }

  submitting.value = true
  errorMessage.value = ''
  try {
    await signup({
      name: name.value,
      email: email.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })
    await navigateTo(redirectPath.value)
  }
  catch (error: any) {
    errorMessage.value = error?.data?.error?.message ?? '会員登録できませんでした。入力内容を確認してください。'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page-wrap auth-page">
    <header class="page-intro"><h1>会員登録</h1><p>登録後は、解答履歴を保存できます。お気に入りはプレミアム会員向けです。</p></header>
    <form class="content-panel auth-form" @submit.prevent="submit">
      <div class="field"><label for="name">ユーザー名</label><input id="name" v-model="name" autocomplete="name" type="text" required></div>
      <div class="field"><label for="email">メールアドレス</label><input id="email" v-model="email" autocomplete="email" type="email" required></div>
      <div class="field"><label for="password">パスワード</label><input id="password" v-model="password" autocomplete="new-password" type="password" minlength="8" required></div>
      <div class="field"><label for="password-confirmation">確認用パスワード</label><input id="password-confirmation" v-model="passwordConfirmation" autocomplete="new-password" type="password" minlength="8" required></div>
      <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
      <button class="primary-link" type="submit" :disabled="submitting">{{ submitting ? '登録中です' : '登録する' }}</button>
      <p class="auth-note">登録済みの方は <NuxtLink :to="{ path: '/login', query: { redirect: redirectPath } }">ログイン</NuxtLink></p>
    </form>
  </div>
</template>
