import { query, transaction, type Database } from '../core/db.ts'
import { paymentStripeClient, stripeId, type PaymentStripeClient, type StripeObject } from './payment-client.ts'
import { paymentSettings, type PaymentSettings } from './payment-settings.ts'
import type { PaymentOptions } from './payment-checkout.ts'

export class PaymentEventMismatchError extends Error {}
export class PaymentNotReadyError extends Error {}
const supported = new Set(['checkout.session.completed', 'checkout.session.expired', 'refund.created', 'refund.updated', 'refund.failed', 'charge.dispute.created', 'charge.dispute.closed'])
const stripeTime = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? new Date(value * 1000) : new Date()
const mismatch = (): never => { throw new PaymentEventMismatchError('Stripe payment information does not match') }
type Payment = StripeObject

class EventProcessor {
  private injectedClient?: PaymentStripeClient
  private db: Database
  private settings: PaymentSettings
  constructor(db: Database, settings: PaymentSettings, client?: PaymentStripeClient) { this.db = db; this.settings = settings; this.injectedClient = client }
  private get client() { return this.injectedClient ||= paymentStripeClient(this.settings) }

  async process(type: string, object: StripeObject, created: unknown) {
    switch (type) {
      case 'checkout.session.completed': return this.complete(object, stripeTime(created))
      case 'checkout.session.expired':
        await query(`UPDATE payments SET status='expired',updated_at=CURRENT_TIMESTAMP WHERE stripe_checkout_session_id=$1 AND status='pending'`, [object.id], this.db)
        return
      case 'refund.created': case 'refund.updated': return this.refund(object)
      case 'refund.failed': return this.failedRefund(object, stripeTime(created))
      case 'charge.dispute.created': return this.dispute(object)
      case 'charge.dispute.closed': return this.dispute(object, stripeTime(created))
    }
  }

  private async complete(session: StripeObject, completedAt: Date) {
    const [payment] = await query<Payment>('SELECT * FROM payments WHERE stripe_checkout_session_id=$1 FOR UPDATE', [session.id], this.db)
    if (!payment) throw new PaymentNotReadyError('Checkout payment record is unavailable')
    if (payment.status !== 'pending') return
    const intent = stripeId(session.payment_intent)
    const metadata = session.metadata || {}
    if (!(session.mode === 'payment' && session.payment_status === 'paid' && session.amount_total === payment.amount && session.currency === payment.currency &&
      session.client_reference_id === String(payment.user_id) && metadata.user_id === String(payment.user_id) && metadata.purchase_type === 'paid_membership' &&
      metadata.stripe_price_id === payment.stripe_price_id && intent && session.livemode === this.settings.livemode)) mismatch()
    const [user] = await query('SELECT id FROM users WHERE id=$1', [payment.user_id], this.db)
    if (!user) mismatch()
    await query(`UPDATE payments SET status='paid',stripe_payment_intent_id=$2,paid_at=$3,updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [payment.id, intent, completedAt], this.db)
    await query(`INSERT INTO memberships(user_id,source_payment_id,status,activated_at,created_at,updated_at) VALUES($1,$2,'active',$3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET source_payment_id=EXCLUDED.source_payment_id,status='active',activated_at=EXCLUDED.activated_at,revoked_at=NULL,revocation_reason=NULL,updated_at=CURRENT_TIMESTAMP`, [payment.user_id, payment.id, completedAt], this.db)
  }

  private async findPayment(intentId: string | null, chargeId: string | null): Promise<Payment | null> {
    let payment: Payment | undefined
    if (intentId) [payment] = await query<Payment>('SELECT * FROM payments WHERE stripe_payment_intent_id=$1 FOR UPDATE', [intentId], this.db)
    if (!payment && chargeId) [payment] = await query<Payment>('SELECT * FROM payments WHERE stripe_charge_id=$1 FOR UPDATE', [chargeId], this.db)
    if (payment) return payment
    if (!intentId && chargeId) {
      const charge = await this.client.charges.retrieve(chargeId)
      intentId = stripeId(charge.payment_intent)
      if (intentId) [payment] = await query<Payment>('SELECT * FROM payments WHERE stripe_payment_intent_id=$1 FOR UPDATE', [intentId], this.db)
      if (payment) return payment
    }
    if (!intentId) return null
    const intent = await this.client.paymentIntents.retrieve(intentId)
    const metadata = intent.metadata || {}
    if (metadata.purchase_type !== 'paid_membership') return null
    if (!(intent.currency === this.settings.currency && intent.amount === this.settings.amount && metadata.user_id && metadata.stripe_price_id)) mismatch()
    // Do not acknowledge a refund/dispute that arrived before the completion event.
    throw new PaymentNotReadyError('Awaiting Checkout completion notification')
  }

  private async verifiedCharge(payment: Payment, chargeId: string) {
    const charge = await this.client.charges.retrieve(chargeId)
    if (!(charge.currency === payment.currency && charge.amount === payment.amount && Number.isInteger(charge.amount_refunded) &&
      charge.amount_refunded >= 0 && charge.amount_refunded <= payment.amount &&
      (!payment.stripe_payment_intent_id || stripeId(charge.payment_intent) === payment.stripe_payment_intent_id))) mismatch()
    return charge
  }

  private async revoke(payment: Payment, reason: 'refund' | 'dispute') {
    await query(`UPDATE memberships SET status='revoked',revoked_at=CURRENT_TIMESTAMP,revocation_reason=$3,updated_at=CURRENT_TIMESTAMP WHERE user_id=$1 AND source_payment_id=$2`, [payment.user_id, payment.id, reason], this.db)
  }

  private async refund(refund: StripeObject) {
    if (refund.status !== 'succeeded') return
    const payment = await this.findPayment(stripeId(refund.payment_intent), stripeId(refund.charge))
    if (!payment) return
    const chargeId = stripeId(refund.charge) || payment.stripe_charge_id
    if (!chargeId) mismatch()
    const charge = await this.verifiedCharge(payment, chargeId)
    if (charge.amount_refunded === 0) return
    const full = charge.amount_refunded === payment.amount
    await query(`UPDATE payments SET stripe_charge_id=$2,refunded_amount=$3,status=$4,refunded_at=CASE WHEN $5 THEN CURRENT_TIMESTAMP ELSE refunded_at END,updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [payment.id, charge.id, charge.amount_refunded, full ? 'refunded' : 'partially_refunded', full], this.db)
    if (full) await this.revoke(payment, 'refund')
  }

  private async failedRefund(refund: StripeObject, failedAt: Date) {
    if (refund.status !== 'failed') mismatch()
    const payment = await this.findPayment(stripeId(refund.payment_intent), stripeId(refund.charge))
    if (!payment) return
    const chargeId = stripeId(refund.charge) || payment.stripe_charge_id
    if (!chargeId) mismatch()
    // A succeeded refund can subsequently fail. Fetch the current charge, not the event's old amount.
    const charge = await this.verifiedCharge(payment, chargeId)
    const disputed = payment.status === 'disputed' || Boolean(payment.stripe_dispute_id) || charge.disputed === true
    const full = charge.amount_refunded === payment.amount
    const status = disputed ? 'disputed' : full ? 'refunded' : charge.amount_refunded > 0 ? 'partially_refunded' : 'paid'
    await query(`UPDATE payments SET stripe_charge_id=$2,refunded_amount=$3,status=$4,refunded_at=CASE WHEN $5 THEN COALESCE(refunded_at,CURRENT_TIMESTAMP) ELSE NULL END,last_refund_failure_reason=$6,last_refund_failed_at=$7,updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [payment.id, charge.id, charge.amount_refunded, status, full, refund.failure_reason || null, failedAt], this.db)
    if (disputed) await this.revoke(payment, 'dispute')
    else if (full) await this.revoke(payment, 'refund')
    else await query(`UPDATE memberships SET status='active',revoked_at=NULL,revocation_reason=NULL,updated_at=CURRENT_TIMESTAMP WHERE user_id=$1 AND source_payment_id=$2 AND status='revoked' AND revocation_reason='refund'`, [payment.user_id, payment.id], this.db)
  }

  private async dispute(dispute: StripeObject, closedAt?: Date) {
    const payment = await this.findPayment(stripeId(dispute.payment_intent), stripeId(dispute.charge))
    if (!payment) return
    if (!(dispute.currency === payment.currency && Number.isInteger(dispute.amount) && dispute.amount > 0 && dispute.amount <= payment.amount && (!closedAt || dispute.status))) mismatch()
    const retainClosure = !closedAt && payment.stripe_dispute_id === dispute.id && payment.dispute_closed_at
    await query(`UPDATE payments SET status='disputed',stripe_charge_id=$2,stripe_dispute_id=$3,dispute_status=$4,dispute_closed_at=$5,updated_at=CURRENT_TIMESTAMP WHERE id=$1`,
      [payment.id, stripeId(dispute.charge) || payment.stripe_charge_id, dispute.id, retainClosure ? payment.dispute_status : dispute.status || null, retainClosure ? payment.dispute_closed_at : closedAt || null], this.db)
    // Even a won dispute requires an explicit operational decision before access resumes.
    await this.revoke(payment, 'dispute')
  }
}

/** All state changes and the event receipt commit together; failures remain retryable. */
export async function processStripeEvent(event: StripeObject, options: PaymentOptions = {}): Promise<'processed' | 'duplicate'> {
  const settings = options.settings || paymentSettings()
  if (event.livemode !== settings.livemode || typeof event.id !== 'string' || !event.id || typeof event.type !== 'string') mismatch()
  return transaction(async db => {
    // Serialize the same event before touching payment/membership rows, including concurrent delivery.
    await query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`stripe-event:${event.id}`], db)
    const [existing] = await query('SELECT id FROM stripe_webhook_events WHERE stripe_event_id=$1', [event.id], db)
    if (existing) return 'duplicate'
    if (supported.has(event.type)) {
      if (!event.data?.object || typeof event.data.object !== 'object') mismatch()
      await new EventProcessor(db, settings, options.client).process(event.type, event.data.object, event.created)
    }
    await query(`INSERT INTO stripe_webhook_events(stripe_event_id,event_type,livemode,processed_at,created_at,updated_at) VALUES($1,$2,$3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, [event.id, event.type, event.livemode], db)
    return 'processed'
  }, options.db)
}
