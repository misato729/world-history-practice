<script setup lang="ts">
import { hasFullExamAccess } from '~/utils/examConfig'
import type { AuthUser } from '../../../shared/types/auth.ts'

definePageMeta({ middleware: 'auth' })

useSeoMeta({
  title: `決済確認｜${SITE.name}`,
  robots: 'noindex',
})

const { isLoggedIn, user, ensureCurrentUser } = useAuth()
const resolvedMembershipState = (current: AuthUser | null): 'complete' | 'available' | null => {
  if (!current) return null
  if (current.membership.status === 'active') return 'complete'
  return hasFullExamAccess(current) ? 'available' : null
}
const state = ref<'checking' | 'complete' | 'available' | 'pending'>('checking')
const accessLabel = ref('全問題を利用できます')
let stopped = false
let checking = false
let checkGeneration = 0

const checkMembership = async () => {
  if (stopped || checking || !isLoggedIn.value) return

  checking = true
  const generation = ++checkGeneration
  const owner = user.value?.id
  const isCurrent = () => !stopped && generation === checkGeneration && isLoggedIn.value && user.value?.id === owner
  state.value = 'checking'
  try {
    for (let attempt = 0; attempt < 8 && isCurrent(); attempt += 1) {
      // Cached application state can predate a refund or verification expiry.
      // Only a successful forced response can confirm this purchase/access.
      const current = await ensureCurrentUser(true)
      if (!isCurrent()) return
      const resolved = current?.id === owner ? resolvedMembershipState(current) : null
      if (resolved) {
        accessLabel.value = current?.role === 'admin'
          ? '管理者権限で全問題を利用できます'
          : current?.verification_access ? '検証用資格で全問題を利用できます' : '全問題を利用できます'
        state.value = resolved
        return
      }
      if (attempt < 7) await new Promise(resolve => window.setTimeout(resolve, 1500))
    }
    if (isCurrent()) state.value = 'pending'
  }
  finally {
    if (generation === checkGeneration) checking = false
  }
}

watch(() => user.value?.id, () => {
  checkGeneration += 1
  checking = false
  state.value = 'pending'
}, { flush: 'sync' })
watch(() => JSON.stringify([
  user.value?.membership.status, user.value?.paid_content_access,
  user.value?.role, user.value?.verification_access?.expires_at,
]), () => {
  // A shared-state change may conceal a previous confirmation, but may not
  // turn an unverified cached snapshot into a purchase confirmation.
  if (state.value === 'complete' || state.value === 'available') state.value = 'pending'
}, { flush: 'sync' })

onMounted(async () => {
  // A cold bearer-token session can reach this page before /me has populated user.
  // Establish the owner first; only the following forced check confirms payment.
  if (!user.value && isLoggedIn.value) await ensureCurrentUser()
  if (!stopped) void checkMembership()
})
onBeforeUnmount(() => { stopped = true; checkGeneration += 1; checking = false })
</script>

<template>
  <div class="page-wrap complete-page">
    <div v-if="!isLoggedIn" class="completion-card">
      <UIcon class="state-icon" name="i-lucide-log-in" />
      <h1>ログインして決済結果を確認してください</h1>
      <p>購入時に使用したアカウントでログインすると、プレミアム会員資格の反映を確認できます。</p>
      <NuxtLink class="primary-link" to="/login?redirect=/premium/complete">ログイン</NuxtLink>
    </div>

    <div v-else-if="state === 'checking'" class="completion-card" aria-live="polite">
      <UIcon class="state-icon spin" name="i-lucide-loader-circle" />
      <h1>決済を確認しています</h1>
      <p>Stripeからの安全な完了通知を確認しています。この画面を閉じずに少しお待ちください。</p>
    </div>

    <div v-else-if="state === 'complete'" class="completion-card success-card" aria-live="polite">
      <UIcon class="state-icon" name="i-lucide-circle-check-big" />
      <h1>プレミアム会員になりました</h1>
      <p>{{ PRICE_LABEL }}の買い切り購入が確認できました。模擬試験{{ EXAM_CONFIG.payments.free_exam_count + 1 }}以降を利用できます。</p>
      <NuxtLink class="primary-link" :to="`/practice/${EXAM_CONFIG.payments.free_exam_count + 1}/1`">模擬試験{{ EXAM_CONFIG.payments.free_exam_count + 1 }}へ進む</NuxtLink>
    </div>

    <div v-else-if="state === 'available'" class="completion-card success-card" aria-live="polite">
      <UIcon class="state-icon" name="i-lucide-badge-check" />
      <h1>{{ accessLabel }}</h1>
      <p>公開中の全模擬試験を利用できます。購入手続きは必要ありません。</p>
      <NuxtLink class="primary-link" to="/practice/1/1">問題演習を始める</NuxtLink>
    </div>

    <div v-else class="completion-card" aria-live="polite">
      <UIcon class="state-icon pending-icon" name="i-lucide-clock-3" />
      <h1>決済の反映を待っています</h1>
      <p>決済完了通知に時間がかかっています。二重に購入せず、少し時間をおいて再確認してください。解決しない場合は、<NuxtLink to="/commercial-disclosure">問い合わせ先</NuxtLink>へご連絡ください。</p>
      <div class="completion-actions">
        <button class="secondary-link" type="button" @click="checkMembership">もう一度確認する</button>
        <NuxtLink class="primary-link" to="/account">アカウントを確認する</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.complete-page { min-height: 60vh; display: grid; place-items: center; padding-top: 64px; }
.completion-card { width: min(680px, 100%); display: grid; justify-items: center; padding: clamp(32px, 7vw, 64px); border: 1px solid var(--line); border-radius: 10px; background: #fff; text-align: center; box-shadow: 0 16px 50px rgba(25, 54, 60, .08); }
.state-icon { width: 52px; height: 52px; color: var(--teal); }
.pending-icon { color: #c78b00; }
.completion-card h1 { margin: 22px 0 0; font-size: 2.375rem; }

@media (max-width: 640px) {
  .completion-card h1 { font-size: 1.625rem; }
}
.completion-card p { max-width: 530px; margin: 14px 0 26px; color: var(--muted); line-height: 1.85; }
.completion-card p a { color: var(--teal-dark); font-weight: 700; }
.completion-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
