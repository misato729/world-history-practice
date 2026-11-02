import { computed, onMounted, onScopeDispose, ref, watch, type ComputedRef } from 'vue'
import type { AuthUser } from '../../shared/types/auth.ts'

/** A cached user is not proof of current entitlement. Confirm /me before loading catalogs. */
export const useQualifiedExamAccess = (enabled: ComputedRef<boolean> = computed(() => true)) => {
  const { accessToken, user, ensureCurrentUser } = useAuth()
  const signature = (current: AuthUser | null) => JSON.stringify([
    current?.id, current?.role, current?.paid_content_access, current?.membership.status,
    current?.verification_access?.expires_at,
  ])
  const status = ref<'idle' | 'pending' | 'ready' | 'error'>('idle')
  const proof = ref<string | null>(null)
  const unexpired = ref(true)
  let generation = 0
  let mounted = false
  let resolving = false
  let expiry: ReturnType<typeof setTimeout> | undefined
  const invalidate = () => {
    generation++
    proof.value = null
    clearTimeout(expiry)
    unexpired.value = true
    status.value = 'idle'
  }
  const refresh = async () => {
    invalidate()
    if (!mounted || !enabled.value || !accessToken.value) return
    const request = generation
    const token = accessToken.value
    status.value = 'pending'
    resolving = true
    const current = await ensureCurrentUser(true)
    resolving = false
    if (!mounted || request !== generation || token !== accessToken.value || !enabled.value) return
    if (!current) { status.value = 'error'; return }
    proof.value = signature(current)
    status.value = 'ready'
    if (current.role !== 'admin' && current.membership.status !== 'active' && current.verification_access) {
      const remaining = Date.parse(current.verification_access.expires_at) - Date.now()
      unexpired.value = remaining > 0
      if (remaining > 0) expiry = setTimeout(() => { unexpired.value = false }, Math.min(remaining, 2_147_483_647))
    }
  }
  const allowed = computed(() => enabled.value && Boolean(accessToken.value)
    && status.value === 'ready' && proof.value === signature(user.value)
    && unexpired.value && hasFullExamAccess(user.value))
  watch([accessToken, enabled], () => { void refresh() }, { flush: 'sync' })
  watch(() => signature(user.value), () => { if (!resolving) void refresh() }, { flush: 'sync' })
  onMounted(() => { mounted = true; void refresh() })
  onScopeDispose(() => { mounted = false; invalidate() })
  return { allowed, status, refresh }
}
