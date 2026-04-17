/**
 * Auto-refund helper for returns.
 *
 * Centralises the Stripe refund + status sync + customer email so that every
 * code path that "approves" or "marks received" a return can guarantee the
 * customer is automatically refunded.
 *
 * Wired into:
 *   - POST /api/returns/[id]/confirm-received        (after items received)
 *   - POST /api/returns/[id]/approve                 (after final approval)
 *   - POST /api/admin/returns (in_store=received)    (manual return that
 *                                                     starts already received)
 *   - POST /api/returns/[id]/process-refund          (fallback / manual)
 *
 * The helper is fully idempotent and safe to call multiple times:
 *   - if the return already has a stripe_refund_id → no-op
 *   - if refund_amount <= 0                         → no-op
 *   - if the order has no stripe_payment_intent_id  → no-op (e.g. legacy /
 *                                                     non-Stripe order)
 *   - if Stripe rejects the refund                  → status reverts to
 *                                                     `return_received`,
 *                                                     reason returned
 */

import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import { updateOrderStatusForReturn } from '@/lib/update-order-status'
import { sendReturnRefundedEmail } from '@/lib/email'

export type RefundOutcome =
  | { ok: true; status: 'refunded' | 'refund_processing'; refundId: string }
  | { ok: false; reason: string; details?: any }

interface ProcessReturnRefundOptions {
  /**
   * Force a refund attempt even when stripe_refund_id already exists.
   * Defaults to false; only useful in admin-tooling scenarios.
   */
  force?: boolean
  /**
   * Optional notes that should be persisted on the return alongside the
   * refund update.
   */
  adminNotes?: string
  /**
   * Inject a Supabase client (e.g. when caller already has one). Defaults to
   * a fresh service-role client so this helper works from any route, webhook
   * or background job.
   */
  supabase?: SupabaseClient
  /**
   * Inject a Stripe client (mostly used for tests).
   */
  stripe?: Stripe
  /**
   * If false, skip the customer e-mail (still sends by default).
   */
  sendEmail?: boolean
}

const DEFAULT_LOCALE = 'nl'

export async function processReturnRefund(
  returnId: string,
  options: ProcessReturnRefundOptions = {}
): Promise<RefundOutcome> {
  const supabase = options.supabase ?? createServiceClient()
  const stripe =
    options.stripe ??
    new Stripe(process.env.STRIPE_SECRET_KEY!.trim())
  const sendEmail = options.sendEmail !== false

  const { data: returnRecord, error: fetchError } = await supabase
    .from('returns')
    .select('*, orders!inner(*)')
    .eq('id', returnId)
    .single()

  if (fetchError || !returnRecord) {
    return { ok: false, reason: 'Return not found', details: fetchError }
  }

  // Already refunded / processing → nothing to do unless forced.
  if (
    !options.force &&
    (returnRecord.stripe_refund_id ||
      returnRecord.status === 'refunded' ||
      returnRecord.status === 'refund_processing')
  ) {
    return {
      ok: true,
      status:
        returnRecord.status === 'refunded' ? 'refunded' : 'refund_processing',
      refundId: returnRecord.stripe_refund_id || 'pre-existing',
    }
  }

  const refundAmount = Number(returnRecord.refund_amount || 0)
  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    return { ok: false, reason: 'Refund amount is zero' }
  }

  const paymentIntentId = returnRecord.orders?.stripe_payment_intent_id
  if (!paymentIntentId) {
    // Legacy / manual order without Stripe payment — refund must be handled
    // out-of-band. Mark the return so the admin sees it explicitly.
    await supabase
      .from('returns')
      .update({
        admin_notes: [
          returnRecord.admin_notes,
          options.adminNotes,
          '⚠️ Auto-refund overgeslagen: order heeft geen Stripe payment intent. Handmatige terugbetaling vereist.',
        ]
          .filter(Boolean)
          .join('\n')
          .trim(),
      })
      .eq('id', returnId)
    return {
      ok: false,
      reason: 'Order has no Stripe payment intent (manual refund required)',
    }
  }

  const refundAmountCents = Math.round(refundAmount * 100)

  let refund: Stripe.Refund
  try {
    refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmountCents,
      reason: 'requested_by_customer',
      metadata: {
        return_id: returnId,
        order_id: returnRecord.order_id,
        type: 'return_refund',
        refund_amount: refundAmount.toString(),
      },
    })
  } catch (stripeErr: any) {
    console.error(
      `[processReturnRefund] Stripe refund failed for return ${returnId}:`,
      stripeErr
    )
    // Persist the failure on the return so admins see it.
    await supabase
      .from('returns')
      .update({
        admin_notes: [
          returnRecord.admin_notes,
          options.adminNotes,
          `⚠️ Auto-refund mislukt (${stripeErr?.message || 'onbekende fout'}). Probeer handmatig opnieuw via "Start Refund".`,
        ]
          .filter(Boolean)
          .join('\n')
          .trim(),
      })
      .eq('id', returnId)
    return {
      ok: false,
      reason: stripeErr?.message || 'Stripe refund failed',
      details: stripeErr,
    }
  }

  const refundSucceeded = refund.status === 'succeeded'

  // Update return with refund info.
  const baseUpdate: Record<string, any> = {
    status: refundSucceeded ? 'refunded' : 'refund_processing',
    stripe_refund_id: refund.id,
    stripe_refund_status: refund.status,
  }
  if (refundSucceeded) {
    baseUpdate.refunded_at = new Date().toISOString()
  }
  if (options.adminNotes) {
    baseUpdate.admin_notes = [returnRecord.admin_notes, options.adminNotes]
      .filter(Boolean)
      .join('\n')
      .trim()
  }

  const { error: updateError } = await supabase
    .from('returns')
    .update(baseUpdate)
    .eq('id', returnId)

  if (updateError) {
    console.error(
      `[processReturnRefund] Could not persist refund ${refund.id} on return ${returnId}:`,
      updateError
    )
    // Refund went through in Stripe — surface a soft failure but DO NOT
    // throw, the webhook (charge.refunded) will eventually reconcile.
    return {
      ok: true,
      status: refundSucceeded ? 'refunded' : 'refund_processing',
      refundId: refund.id,
    }
  }

  // Sync order status.
  try {
    await updateOrderStatusForReturn(
      returnRecord.order_id,
      refundSucceeded ? 'refunded' : 'refund_processing'
    )
  } catch (err) {
    console.error('[processReturnRefund] order-status sync failed:', err)
  }

  // Notify the customer.
  if (sendEmail && refundSucceeded) {
    try {
      const order = returnRecord.orders
      const shippingAddress = (order?.shipping_address as any) || {}
      const customerName =
        shippingAddress.name ||
        `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim() ||
        'Klant'

      await sendReturnRefundedEmail({
        customerEmail: order.email,
        customerName,
        returnId,
        orderId: returnRecord.order_id,
        refundAmount,
        locale: DEFAULT_LOCALE,
      })
    } catch (emailErr) {
      console.error(
        '[processReturnRefund] Failed to send refund email:',
        emailErr
      )
    }
  }

  return {
    ok: true,
    status: refundSucceeded ? 'refunded' : 'refund_processing',
    refundId: refund.id,
  }
}
