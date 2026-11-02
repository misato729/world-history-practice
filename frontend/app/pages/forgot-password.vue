<script setup lang="ts">
const { $api: api } = useNuxtApp()
const email = ref('')
const submitting = ref(false)
const message = ref('')
const errorMessage = ref('')

const submit = async () => {
  if (submitting.value) return
  submitting.value = true
  errorMessage.value = ''
  try {
    const response = await api<{ data: { message: string } }>('/api/v1/auth/forgot-password', {
      method: 'POST', body: { email: email.value }, retry: 0,
    })
    message.value = response.data.message
  }
  catch (error: any) { errorMessage.value = error?.data?.error?.message ?? 'メールの依頼を受け付けられませんでした。もう一度お試しください。' }
  finally { submitting.value = false }
}
</script>

<template>
  <div class="page-wrap auth-page">
    <header class="page-intro"><h1>パスワードを忘れた場合</h1><p>登録したメールアドレスに、パスワード再設定用のリンクを送ります。</p></header>
    <section v-if="message" class="content-panel">
      <p role="status">{{ message }}</p>
      <p class="auth-note">メールが届かない場合は、迷惑メールフォルダーもご確認ください。リンクの有効期限は30分です。</p>
      <button class="secondary-link" type="button" @click="message = ''">もう一度依頼する</button>
      <p class="auth-note"><NuxtLink to="/login">ログインへ戻る</NuxtLink></p>
    </section>
    <form v-else class="content-panel auth-form" @submit.prevent="submit">
      <div class="field"><label for="reset-email">メールアドレス</label><input id="reset-email" v-model="email" type="email" autocomplete="email" maxlength="255" :disabled="submitting" required></div>
      <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
      <button class="primary-link" type="submit" :disabled="submitting">{{ submitting ? '受け付けています' : '再設定メールを依頼' }}</button>
      <p class="auth-note"><NuxtLink to="/login">ログインへ戻る</NuxtLink></p>
    </form>
  </div>
</template>
