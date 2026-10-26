<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { $api: api } = useNuxtApp()
const { isLoggedIn, user, authHeaders, logout, ensureCurrentUser } = useAuth()
if (isLoggedIn.value) await ensureCurrentUser()
const deleteFormOpen = ref(false)
const currentPassword = ref('')
const deleteConfirmed = ref(false)
const deleting = ref(false)
const deleteError = ref('')
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
    <header class="page-intro"><h1>アカウント設定</h1><p>登録情報の確認とログアウト、アカウント削除を行います。</p></header>
    <div v-if="!isLoggedIn" class="empty-state">
      <h2>ログインが必要です</h2>
      <p>アカウント設定はログイン後に利用できます。</p>
      <NuxtLink class="primary-link" to="/login">ログインへ</NuxtLink>
    </div>
    <template v-else>
      <section class="content-panel account-info">
        <div><span>ユーザー名</span><strong>{{ user?.name }}</strong></div>
        <div><span>メールアドレス</span><strong>{{ user?.email }}</strong></div>
        <div><span>会員区分</span><strong>{{ membershipLabel }}</strong></div>
        <div v-if="PAYMENTS_ENABLED && user?.membership.purchased_at"><span>購入確認日時</span><strong>{{ new Date(user.membership.purchased_at).toLocaleString('ja-JP') }}</strong></div>
        <div v-if="PAYMENTS_ENABLED && user?.membership.status === 'active'"><span>有効期限</span><strong>なし（買い切り）</strong></div>
        <div v-if="PAYMENTS_ENABLED && user?.verification_access && user?.membership.status !== 'active'"><span>検証用資格の期限</span><strong>{{ new Date(user.verification_access.expires_at).toLocaleString('ja-JP') }}</strong></div>
      </section>
      <section v-if="PAYMENTS_ENABLED && !user?.paid_content_access" class="content-panel membership-action">
        <h2>プレミアム会員</h2>
        <p>{{ PRICE_LABEL }}の買い切りで、演習セット{{ EXAM_CONFIG.payments.free_exam_count + 1 }}以降を利用できます。</p>
        <NuxtLink class="primary-link" to="/premium">プレミアム会員の詳細を見る</NuxtLink>
      </section>
      <section class="content-panel account-actions">
        <h2>ログイン状態</h2>
        <button class="secondary-link" type="button" @click="handleLogout">
          <UIcon name="i-lucide-log-out" />
          ログアウト
        </button>
      </section>
      <section class="content-panel danger-zone">
        <h2>アカウント削除</h2>
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
    </template>
  </div>
</template>

<style scoped>
.account-info { display: grid; gap: 18px; }
.account-info div { display: grid; grid-template-columns: 160px 1fr; gap: 20px; }
.account-info span { color: var(--muted); }
.account-actions h2, .danger-zone h2 { font-size: 1.25rem; }
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
