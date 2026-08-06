/**
 * Auto-refund helper for returns via Mollie.
 *
 * Wired into:
 *   - POST /api/returns/[id]/confirm-received
 *   - POST /api/returns/[id]/approve
 *   - POST /api/admin/returns (in_store=received)
 *   - POST /api/returns/[id]/process-refund
 *
 * Idempotent:
 *   - if mollie_refund_id / stripe_refund_id already set → no-op
 *   - if refund_amount <= 0 → no-op
 *   - if order has no Mollie/Stripe payment id → no-op (manual refund)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import { updateOrderStatusForReturn } from '@/lib/update-order-status'
import { sendReturnRefundedEmail } from '@/lib/email'
import { reverseLoyaltyForReturn } from '@/lib/reverse-loyalty-for-return'
import { asMolliePayment, formatMollieAmount, getMollieClient } from '@/lib/mollie'

export type RefundOutcome =
  | { ok: true; status: 'refunded' | 'refund_processing'; refundId: string }
  | { ok: false; reason: string; details?: unknown }

interface ProcessReturnRefundOptions {
  force?: boolean
  adminNotes?: string
  supabase?: SupabaseClient
  sendEmail?: boolean
}

const DEFAULT_LOCALE = 'nl'

export async function processReturnRefund(
  returnId: string,
  options: ProcessReturnRefundOptions = {}
): Promise<RefundOutcome> {
  const supabase = options.supabase ?? createServiceClient()
  const sendEmail = options.sendEmail !== false

  const { data: returnRecord, error: fetchError } = await supabase
    .from('returns')
    .select('*, orders!inner(*)')
    .eq('id', returnId)
    .single()

  if (fetchError || !returnRecord) {
    return { ok: false, reason: 'Return not found', details: fetchError }
  }

  const existingRefundId =
    returnRecord.mollie_refund_id || returnRecord.stripe_refund_id

  if (
    !options.force &&
    (existingRefundId ||
      returnRecord.status === 'refunded' ||
      returnRecord.status === 'refund_processing')
  ) {
    return {
      ok: true,
      status:
        returnRecord.status === 'refunded' ? 'refunded' : 'refund_processing',
      refundId: existingRefundId || 'pre-existing',
    }
  }

  const refundAmount = Number(returnRecord.refund_amount || 0)
  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    return { ok: false, reason: 'Refund amount is zero' }
  }

  const paymentId =
    returnRecord.orders?.mollie_payment_id ||
    returnRecord.orders?.stripe_payment_intent_id

  if (!paymentId) {
    await supabase
      .from('returns')
      .update({
        admin_notes: [
          returnRecord.admin_notes,
          options.adminNotes,
          '⚠️ Auto-refund overgeslagen: order heeft geen Mollie payment ID. Handmatige terugbetaling vereist.',
        ]
          .filter(Boolean)
          .join('\n')
          .trim(),
      })
      .eq('id', returnId)
    return {
      ok: false,
      reason: 'Order has no Mollie payment id (manual refund required)',
    }
  }

  let refundId: string
  let refundStatus: string

  try {
    const mollie = getMollieClient()
    const refund = (await Promise.resolve(
      mollie.paymentRefunds.create({
        paymentId,
        amount: {
          currency: 'EUR',
          value: formatMollieAmount(refundAmount),
        },
        description: `Retour ${returnId.slice(0, 8).toUpperCase()}`,
        metadata: {
          return_id: returnId,
          order_id: returnRecord.order_id,
          type: 'return_refund',
        },
      })
    )) as { id: string; status: string }
    refundId = refund.id
    refundStatus = refund.status
  } catch (mollieErr: unknown) {
    const errMsg =
      mollieErr instanceof Error ? mollieErr.message : 'Mollie refund failed'
    console.error(
      `[processReturnRefund] Mollie refund failed for return ${returnId}:`,
      mollieErr
    )
    await supabase
      .from('returns')
      .update({
        admin_notes: [
          returnRecord.admin_notes,
          options.adminNotes,
          `⚠️ Auto-refund mislukt (${errMsg}). Probeer handmatig opnieuw via "Start Refund".`,
        ]
          .filter(Boolean)
          .join('\n')
          .trim(),
      })
      .eq('id', returnId)
    return { ok: false, reason: errMsg, details: mollieErr }
  }

  const refundSucceeded = refundStatus === 'refunded'
  const baseUpdate: Record<string, unknown> = {
    status: refundSucceeded ? 'refunded' : 'refund_processing',
    mollie_refund_id: refundId,
    mollie_refund_status: refundStatus,
    // Keep stripe_refund_* mirrored for admin UI that still reads those columns
    stripe_refund_id: refundId,
    stripe_refund_status: refundSucceeded ? 'succeeded' : refundStatus,
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
      `[processReturnRefund] Could not persist refund ${refundId} on return ${returnId}:`,
      updateError
    )
    return {
      ok: true,
      status: refundSucceeded ? 'refunded' : 'refund_processing',
      refundId,
    }
  }

  if (refundSucceeded) {
    const order = returnRecord.orders as {
      email?: string
      user_id?: string | null
    }
    const email = order?.email
    if (email) {
      try {
        const loyaltyResult = await reverseLoyaltyForReturn(supabase, {
          returnId,
          orderId: returnRecord.order_id,
          refundAmount,
          customerEmail: email,
          userId: order?.user_id ?? null,
        })
        if (loyaltyResult.ok && 'pointsDeducted' in loyaltyResult) {
          console.log(
            `[processReturnRefund] Loyalty reversed ${loyaltyResult.pointsDeducted} pts for return ${returnId}`
          )
        }
      } catch (loyaltyErr) {
        console.error('[processReturnRefund] Loyalty reversal error:', loyaltyErr)
      }
    }
  }

  try {
    await updateOrderStatusForReturn(
      returnRecord.order_id,
      refundSucceeded ? 'refunded' : 'refund_processing'
    )
  } catch (err) {
    console.error('[processReturnRefund] order-status sync failed:', err)
  }

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
    refundId,
  }
}
