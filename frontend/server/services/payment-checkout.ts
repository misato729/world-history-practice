import { randomUUID } from 'node:crypto'
import type Stripe from 'stripe'
import type { User } from '../core/auth.ts'
import { query, transaction, type Database } from '../core/db.ts'
import { ApiError, fail } from '../core/errors.ts'
import { paymentStripeClient, type PaymentStripeClient, type StripeObject } from './payment-client.ts'
import { paymentSettings, type PaymentSettings } from './payment-settings.ts'

export type PaymentOptions = { client?: PaymentStripeClient, settings?: PaymentSettings, db?: Database }
const unavailable = (settings: PaymentSettings): never => {
  const error = new ApiError(503, 'payment_unavailable', '現在、決済を開始できません')
  error.expectedUnavailability = !settings.salesEnabled
  throw error
}
const inProgress = (): never => fail(409, 'checkout_session_in_progress', '未完了の決済があります')

function checkoutParameters(user: User, settings: PaymentSettings): Stripe.Checkout.SessionCreateParams {
  const metadata = { user_id: String(user.id), purchase_type: 'paid_membership', stripe_price_id: settings.priceId }
  return {
    ui_mode: 'hosted_page', mode: 'payment', locale: 'ja', billing_address_collection: 'auto',
    phone_number_collection: { enabled: false }, automatic_tax: { enabled: false }, allow_promotion_codes: false,
    allowed_payment_method_types: ['card'], submit_type: 'auto', integration_identifier: 'hosted_web_0001', origin_context: 'web',
    line_items: [{ price: settings.priceId, quantity: 1 }], client_reference_id: String(user.id), customer_email: user.email,
    consent_collection: { terms_of_service: 'required' },
    custom_text: { submit: { message: `「${settings.siteName}の有料コンテンツ利用資格」を${settings.amount} ${settings.currency.toUpperCase()}で買い切る契約です。月額課金や自動更新はありません。決済完了後に利用資格を提供し、提供開始後の利用者都合による返金は原則として受け付けません。` } },
    metadata, payment_intent_data: { metadata }, success_url: `${settings.frontendUrl}/premium/complete`, cancel_url: `${settings.frontendUrl}/premium?canceled=1`,
  }
}

export async function createCheckoutSession(user: User, options: PaymentOptions = {}) {
  const settings = options.settings || paymentSettings()
  if (!settings.enabled) unavailable(settings)
  const client = options.client || paymentStripeClient(settings)
  try {
    return await transaction(async db => {
      const [locked] = await query<User>('SELECT * FROM users WHERE id=$1 FOR UPDATE', [user.id], db)
      if (!locked) fail(401, 'unauthorized', 'ログインが必要です')
      const [access] = await query(`SELECT EXISTS(SELECT 1 FROM memberships WHERE user_id=$1 AND status='active') OR EXISTS(SELECT 1 FROM verification_access_grants WHERE user_id=$1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP) AS allowed`, [user.id], db)
      if (locked.role === 'admin' || access?.allowed) fail(409, 'membership_already_active', 'すでに有料コンテンツを利用できます')
      const price = await client.prices.retrieve(settings.priceId)
      if (!(price.active === true && price.currency === settings.currency && price.unit_amount === settings.amount && price.type === 'one_time' && price.livemode === settings.livemode)) unavailable(settings)
      const [pending] = await query(`SELECT * FROM payments WHERE user_id=$1 AND status='pending' ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [user.id], db)
      if (pending) {
        const session = await client.checkout.sessions.retrieve(pending.stripe_checkout_session_id)
        if (session.livemode !== settings.livemode) unavailable(settings)
        if (session.status === 'open' && session.url) return { checkout_session_id: session.id, checkout_url: session.url }
        if (session.status !== 'expired') inProgress()
        await query(`UPDATE payments SET status='expired',updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [pending.id], db)
      }
      const session = await client.checkout.sessions.create(checkoutParameters(locked, settings), { idempotencyKey: `paid-membership-user-${user.id}-${randomUUID()}` })
      const expire = async () => {
        try { await client.checkout.sessions.expire(session.id) } catch { console.error('Failed to expire Stripe Checkout Session after local failure') }
      }
      if (!(session.status === 'open' && session.url && session.livemode === settings.livemode)) {
        if (session.status === 'open') await expire()
        unavailable(settings)
      }
      try {
        await query(`INSERT INTO payments(user_id,stripe_checkout_session_id,stripe_price_id,amount,currency,status,created_at,updated_at) VALUES($1,$2,$3,$4,$5,'pending',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, [user.id, session.id, settings.priceId, settings.amount, settings.currency], db)
      } catch (error) { await expire(); throw error }
      return { checkout_session_id: session.id, checkout_url: session.url }
    }, options.db)
  } catch (error) {
    if ((error as { code?: string }).code === '23505') inProgress()
    if (error instanceof ApiError) throw error
    if (isStripeError(error)) fail(502, 'payment_provider_error', '決済サービスへ接続できませんでした')
    throw error
  }
}

export const isStripeError = (error: unknown) => Boolean(error && typeof error === 'object' && typeof (error as StripeObject).type === 'string' && (error as StripeObject).type.startsWith('Stripe'))

/** Caller-provided db must already be inside a transaction and hold the user lock. */
export async function expirePendingCheckouts(user: User, db?: Database, injectedClient?: PaymentStripeClient): Promise<void> {
  return transaction(async connection => {
    if (!db) await query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user.id], connection)
    const payments = await query(`SELECT * FROM payments WHERE user_id=$1 AND status='pending' ORDER BY id FOR UPDATE`, [user.id], connection)
    if (!payments.length) return
    const settings = paymentSettings()
    const unavailableMessage = '決済状態を確認できないため、アカウントを削除できません'
    if (!injectedClient && !settings.secretKey) fail(503, 'payment_unavailable', unavailableMessage)
    const client = injectedClient || paymentStripeClient(settings)
    try {
      for (const payment of payments) {
        const session = await client.checkout.sessions.retrieve(payment.stripe_checkout_session_id)
        if (session.livemode !== settings.livemode) fail(503, 'payment_unavailable', unavailableMessage)
        if (session.status === 'open') {
          const expired = await client.checkout.sessions.expire(session.id)
          if (expired.status !== 'expired') fail(409, 'checkout_session_in_progress', '決済完了通知を確認中のため、しばらく待ってから再度お試しください')
        } else if (session.status !== 'expired') fail(409, 'checkout_session_in_progress', '決済完了通知を確認中のため、しばらく待ってから再度お試しください')
        await query(`UPDATE payments SET status='expired',updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [payment.id], connection)
      }
    } catch (error) {
      if (isStripeError(error)) fail(502, 'payment_provider_error', unavailableMessage)
      throw error
    }
  }, db)
}
