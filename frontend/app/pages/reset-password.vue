<script setup lang="ts">
import { passwordResetToken } from '../utils/passwordReset.ts'

const route = useRoute()
const router = useRouter()
const { $api: api } = useNuxtApp()
const { logout } = useAuth()
const token = ref('')
const ready = ref(false)
const password = ref('')
const confirmation = ref('')
const submitting = ref(false)
const completed = ref(false)
const errorMessage = ref('')
useHead({ meta: [{ name: 'referrer', content: 'no-referrer' }] })

const loadLink = async (fragment: string) => {
  token.value = passwordResetToken(fragment)
  password.value = ''
  confirmation.value = ''
  errorMessage.value = ''
  completed.value = false
  // Keep the secret in this component only; remove it from the address bar.
  if (fragment) await router.replace({ path: route.path, hash: '', query: {} })
  ready.value = true
}
onMounted(() => loadLink(route.hash))
watch(() => route.hash, fragment => {
  if (fragment) void loadLink(fragment)
})

const submit = async () => {
  if (submitting.value || !token.value) return
  errorMessage.value = ''
  if (password.value !== confirmation.value) {
    errorMessage.value = '確認用パスワードが一致していません。'
    return
  }
  if (new TextEncoder().encode(password.value).length > 72) {
    errorMessage.value = '新しいパスワードは72バイト以内で入力してください。'
    return
  }
  const requestToken = token.value
  submitting.value = true
  try {
    await api('/api/v1/auth/reset-password', {
      method: 'POST', body: { token: requestToken, password: password.value, password_confirmation: confirmation.value }, retry: 0,
    })
    if (token.value !== requestToken) return
    logout()
    token.value = ''
    password.value = ''
    confirmation.value = ''
    completed.value = true
  }
  catch (error: any) {
    if (token.value === requestToken) errorMessage.value = error?.data?.error?.message ?? 'パスワードを再設定できませんでした。もう一度お試しください。'
  }
  finally { submitting.value = false }
}
</script>

<template>
  <div class="page-wrap auth-page">
    <header class="page-intro"><h1>パスワードの再設定</h1><p>新しいパスワードを8文字以上で入力してください。</p></header>
    <section v-if="completed" class="content-panel">
      <p role="status">パスワードを再設定しました。新しいパスワードでログインしてください。</p>
      <NuxtLink class="primary-link" to="/login">ログインへ</NuxtLink>
    </section>
    <p v-else-if="!ready" role="status">再設定リンクを確認しています。</p>
    <section v-else-if="!token" class="content-panel">
      <p role="alert">再設定リンクが無効です。メールのリンクからもう一度開くか、再設定メールを依頼してください。</p>
      <NuxtLink class="primary-link" to="/forgot-password">再設定メールを依頼</NuxtLink>
    </section>
    <form v-else class="content-panel auth-form" @submit.prevent="submit">
      <div class="field"><label for="reset-new-password">新しいパスワード</label><input id="reset-new-password" v-model="password" type="password" autocomplete="new-password" minlength="8" :disabled="submitting" required></div>
      <div class="field"><label for="reset-confirmation">新しいパスワード（確認）</label><input id="reset-confirmation" v-model="confirmation" type="password" autocomplete="new-password" minlength="8" :disabled="submitting" required></div>
      <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
      <button class="primary-link" type="submit" :disabled="submitting">{{ submitting ? '再設定しています' : 'パスワードを再設定' }}</button>
      <p class="auth-note"><NuxtLink to="/forgot-password">再設定メールをもう一度依頼</NuxtLink></p>
    </form>
  </div>
</template>
