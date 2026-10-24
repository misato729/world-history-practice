import { query, transaction, type Database } from '../core/db.ts'
import { environment } from '../core/config.ts'
import { paymentSettings } from '../services/payment-settings.ts'
import type { PaymentStripeClient } from '../services/payment-client.ts'
import { expirePendingCheckouts } from '../services/payment-checkout.ts'
import type { User } from '../core/auth.ts'
import { OperationError } from './content.ts'

export async function auditOperations(db?: Database, now = new Date()) {
  return transaction(async connection => {
    if (!db) await query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY', [], connection)
    const [counts] = await query<Record<string, number>>(`SELECT
      (SELECT count(*) FROM payments WHERE status='pending' AND created_at < $1::timestamp - interval '24 hours') AS stale_pending_checkouts,
      (SELECT count(*) FROM payments WHERE last_refund_failed_at >= $1::timestamp - interval '1 day') AS refund_failures_last_day,
      (SELECT count(*) FROM payments WHERE status='disputed') AS disputed_payments,
      (SELECT count(*) FROM memberships m JOIN payments p ON p.id=m.source_payment_id WHERE m.status='active' AND p.status IN ('refunded','disputed','expired','pending')) AS active_memberships_with_revoked_payment,
      (SELECT count(*) FROM stripe_webhook_events WHERE processed_at >= $1::timestamp - interval '1 day') AS processed_webhooks_last_day`, [now], connection)
    const safeCounts = Object.fromEntries(Object.entries(counts!).map(([key, value]) => [key, Number(value)]))
    const warnings = Object.entries(safeCounts).filter(([key, value]) => key !== 'processed_webhooks_last_day' && value > 0).map(([key]) => key)
    const settings = paymentSettings()
    return { checked_at: now.toISOString(), environment: environment(), sales_enabled: settings.enabled,
      payment_configuration_issues: settings.issues, counts: safeCounts, warnings }
  }, db)
}

export async function expirePendingForUser(email: string | undefined, options: { db?: Database, client?: PaymentStripeClient } = {}) {
  const normalized = (email || '').trim().toLowerCase()
  if (!normalized || normalized.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new OperationError('USER_EMAILを指定してください')
  return transaction(async connection => {
    const [user] = await query<User>('SELECT * FROM users WHERE lower(email)=$1 FOR UPDATE', [normalized], connection)
    if (!user) throw new OperationError('対象ユーザーが見つかりません')
    const [count] = await query<{ total: number }>("SELECT count(*) AS total FROM payments WHERE user_id=$1 AND status='pending'", [user.id], connection)
    if (!Number(count?.total)) return { status: 'ok' as const, expired_count: 0 }
    await expirePendingCheckouts(user, connection, options.client)
    return { status: 'ok' as const, expired_count: Number(count!.total) }
  }, options.db)
}
