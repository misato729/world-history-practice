<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const settingsSection = useTemplateRef<HTMLElement>('settingsSection')
const alignAccountSettings = async () => {
  // The map loads after navigation and can move the fragment target.
  if (route.hash !== '#account-settings') return
  await nextTick()
  if (route.hash === '#account-settings') settingsSection.value?.scrollIntoView({ block: 'start' })
}

const { $api: api } = useNuxtApp()
const { isLoggedIn, user, authHeaders, logout, ensureCurrentUser, changePassword } = useAuth()
if (isLoggedIn.value) await ensureCurrentUser()
const deleteFormOpen = ref(false)
const currentPassword = ref('')
const deleteConfirmed = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const passwordCurrent = ref('')
const newPassword = ref('')
const passwordConfirmation = ref('')
const passwordChanging = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')
const submitPasswordChange = async () => {
  if (passwordChanging.value) return
  passwordError.value = ''
  passwordSuccess.value = ''
  if (newPassword.value !== passwordConfirmation.value) {
    passwordError.value = '確認用パスワードが一致していません。'
    return
  }
  if (new TextEncoder().encode(newPassword.value).length > 72) {
    passwordError.value = '新しいパスワードは72バイト以内で入力してください。'
    return
  }
  passwordChanging.value = true
  try {
    await changePassword({ current_password: passwordCurrent.value, password: newPassword.value, password_confirmation: passwordConfirmation.value })
    passwordCurrent.value = ''
    newPassword.value = ''
    passwordConfirmation.value = ''
    currentPassword.value = ''
    passwordSuccess.value = 'パスワードを変更しました。他の端末では再ログインが必要です。'
  }
  catch (error: any) {
    passwordError.value = error?.data?.error?.message ?? 'パスワードを変更できませんでした。'
  }
  finally { passwordChanging.value = false }
}
const handleLogout = async () => {
  logout()
  await navigateTo('/')
}

const membershipLabel = computed(() => {
  if (!PAYMENTS_ENABLED) return user.value?.role === 'admin' ? '管理者' : '一般会員'
  if (user.value?.role === 'admin') return '管理者（全問題利用可）'
  if (user.value?.membership.status === 'active') return 'プレミアム会員'
  if (user.value?.verification_access) return '検証用（有料機能利用可）'
  if (user.value?.membership.status === 'revoked') return '無料会員（有料資格は失効）'
  return '無料会員'
})

const deleteAccount = async () => {
  if (!deleteConfirmed.value || !currentPassword.value || deleting.value) return

  deleting.value = true
  deleteError.value = ''
  try {
    await api('/api/v1/me', {
      method: 'DELETE',
      headers: authHeaders.value,
      body: { current_password: currentPassword.value },
    })
    logout()
    await navigateTo('/')
  }
  catch (error: any) {
    deleteError.value = error?.data?.error?.message ?? 'アカウントを削除できませんでした。'
  }
  finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="page-wrap">
    <header class="page-intro"><h1>マイページ</h1><p>登録情報や学習状況の確認、アカウント設定を行います。</p></header>
    <div v-if="!isLoggedIn" class="empty-state">
      <h2>ログインが必要です</h2>
      <p>マイページはログイン後に利用できます。</p>
      <NuxtLink class="primary-link" to="/login">ログインへ</NuxtLink>
    </div>
    <template v-else>
      <section class="content-panel account-info" aria-labelledby="registration-heading">
        <h2 id="registration-heading">登録情報</h2>
        <div><span>ユーザー名</span><strong>{{ user?.name }}</strong></div>
        <div><span>メールアドレス</span><strong>{{ user?.email }}</strong></div>
        <div><span>会員区分</span><strong>{{ membershipLabel }}</strong></div>
        <div v-if="PAYMENTS_ENABLED && user?.membership.purchased_at"><span>購入確認日時</span><strong>{{ new Date(user.membership.purchased_at).toLocaleString('ja-JP') }}</strong></div>
        <div v-if="PAYMENTS_ENABLED && user?.membership.status === 'active'"><span>有効期限</span><strong>なし（買い切り）</strong></div>
        <div v-if="PAYMENTS_ENABLED && user?.verification_access && user?.membership.status !== 'active'"><span>検証用資格の期限</span><strong>{{ new Date(user.verification_access.expires_at).toLocaleString('ja-JP') }}</strong></div>
      </section>
      <AchievementReport @settled.once="alignAccountSettings" />
      <section id="account-settings" ref="settingsSection" class="account-settings" aria-labelledby="account-settings-heading">
        <h2 id="account-settings-heading">アカウント設定</h2>
        <section v-if="PAYMENTS_ENABLED && !user?.paid_content_access" class="content-panel membership-action">
          <h3>プレミアム会員</h3>
          <p>{{ PRICE_LABEL }}の買い切りで、演習セット{{ EXAM_CONFIG.payments.free_exam_count + 1 }}以降を利用できます。</p>
          <NuxtLink class="primary-link" to="/premium">プレミアム会員の詳細を見る</NuxtLink>
        </section>
        <section class="content-panel password-settings">
          <h3>パスワード変更</h3>
          <p id="password-help">新しいパスワードは8文字以上で入力してください。変更すると、他の端末では再ログインが必要になります。</p>
          <form class="password-form" @submit.prevent="submitPasswordChange">
            <fieldset :disabled="passwordChanging">
              <div class="field"><label for="password-current">現在のパスワード</label><input id="password-current" v-model="passwordCurrent" type="password" autocomplete="current-password" required></div>
              <div class="field"><label for="new-password">新しいパスワード</label><input id="new-password" v-model="newPassword" type="password" autocomplete="new-password" minlength="8" aria-describedby="password-help" required></div>
              <div class="field"><label for="password-confirmation">新しいパスワード（確認）</label><input id="password-confirmation" v-model="passwordConfirmation" type="password" autocomplete="new-password" minlength="8" required></div>
              <button class="primary-link" type="submit">{{ passwordChanging ? '変更しています' : 'パスワードを変更' }}</button>
            </fieldset>
            <p v-if="passwordError" class="form-error" role="alert">{{ passwordError }}</p>
            <p v-if="passwordSuccess" class="password-success" role="status">{{ passwordSuccess }}</p>
          </form>
        </section>
        <section class="content-panel account-actions">
          <h3>ログイン状態</h3>
          <button class="secondary-link" type="button" @click="handleLogout">
            <UIcon name="i-lucide-log-out" />
            ログアウト
          </button>
        </section>
        <section class="content-panel danger-zone">
          <h3>アカウント削除</h3>
          <p>アカウントを削除すると、解答履歴とお気に入りを復元できなくなります。<template v-if="PAYMENTS_ENABLED">プレミアム会員資格も削除され、再登録による復元や自動返金は行われません。</template></p>
          <button v-if="!deleteFormOpen" type="button" @click="deleteFormOpen = true">アカウントを削除</button>
          <form v-else class="delete-form" @submit.prevent="deleteAccount">
            <div class="field">
              <label for="current-password">現在のパスワード</label>
              <input id="current-password" v-model="currentPassword" type="password" autocomplete="current-password" required>
            </div>
            <label class="delete-confirmation"><input v-model="deleteConfirmed" type="checkbox"><span>削除後にデータ{{ PAYMENTS_ENABLED ? 'とプレミアム会員資格' : '' }}を復元できないことを確認しました。</span></label>
            <p v-if="deleteError" class="form-error" role="alert">{{ deleteError }}</p>
            <div class="delete-actions">
              <button type="button" @click="deleteFormOpen = false">キャンセル</button>
              <button class="danger-button" type="submit" :disabled="!deleteConfirmed || !currentPassword || deleting">{{ deleting ? '削除しています' : '完全に削除する' }}</button>
            </div>
          </form>
        </section>
      </section>
    </template>
  </div>
</template>

<style scoped>
.account-info { display: grid; gap: 18px; }
.account-info div { display: grid; grid-template-columns: 160px 1fr; gap: 20px; }
.account-info span { color: var(--muted); }
.account-info strong { overflow-wrap: anywhere; }
.account-info h2 { margin-bottom: 0; font-size: 1.25rem; }
.account-settings { margin-top: 28px; scroll-margin-top: calc(var(--site-navigation-height, var(--header-height)) + 20px); }
.account-settings > h2 { margin: 0 0 18px; font-size: 1.5rem; }
.account-actions h3, .danger-zone h3 { font-size: 1.25rem; }
.password-settings h3 { font-size: 1.25rem; }
.password-form { max-width: 480px; margin-top: 20px; }
.password-form fieldset { display: grid; gap: 18px; min-width: 0; margin: 0; padding: 0; border: 0; }
.password-form button { justify-self: start; cursor: pointer; }
.password-form fieldset:disabled { opacity: .65; }
.password-success { margin-top: 16px; color: var(--ink); }
.membership-action p { margin-bottom: 18px; }
.danger-zone { border-color: #e8b9af; }
.danger-zone button { min-height: 42px; padding: 0 14px; border: 1px solid #d65e49; border-radius: 6px; background: var(--surface); color: #b33b29; font-weight: 700; cursor: pointer; }
.delete-form { margin-top: 22px; padding-top: 22px; border-top: 1px solid #efd8d3; }
.delete-confirmation { display: grid; grid-template-columns: 20px 1fr; gap: 9px; margin-top: 18px; color: #6a4740; line-height: 1.7; }
.delete-confirmation input { width: 18px; height: 18px; margin-top: 4px; accent-color: #b33b29; }
.delete-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
.delete-actions button:first-child { border-color: var(--line-strong); color: var(--ink); }
.delete-actions button:disabled { opacity: .45; cursor: not-allowed; }
@media (max-width: 520px) { .account-info div { grid-template-columns: 1fr; gap: 5px; } }
</style>
