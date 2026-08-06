import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  asMolliePayment,
  fromMollieMethod,
  getMollieClient,
  mapMollieStatusToPaymentStatus,
  type MolliePaymentLike,
} from '@/lib/mollie'
import { fulfillPaidOrder } from '@/lib/fulfill-paid-order'
import { fulfillReturnLabelPayment } from '@/lib/fulfill-return-label-payment'
import { reverseGiftCardsForOrder } from '@/lib/gift-card-processing'
import { updateOrderStatusForReturn } from '@/lib/update-order-status'

/**
 * Classic Mollie Payments webhook: POST application/x-www-form-urlencoded
 * with body `id=tr_…`. Never trust the payload — always fetch payment via API.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    let paymentId: string | null = null

    if (contentType.includes('application/json')) {
      const json = await req.json().catch(() => null)
      paymentId = json?.id || null
    } else {
      const text = await req.text()
      const params = new URLSearchParams(text)
      paymentId = params.get('id')
    }

    if (!paymentId) {
      // Acknowledge empty/unknown to avoid Mollie retry storms
      return NextResponse.json({ received: true, warning: 'Missing id' })
    }

    const mollie = getMollieClient()
    const payment = await asMolliePayment(mollie.payments.get(paymentId))

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const metadata = (payment.metadata || {}) as Record<string, string>
    const isReturnPayment = metadata.type === 'return_label_payment'
    let returnId = metadata.return_id || null

    if (!returnId) {
      const { data: returnRecord } = await supabase
        .from('returns')
        .select('id')
        .eq('return_label_payment_intent_id', payment.id)
        .maybeSingle()
      if (returnRecord) {
        returnId = returnRecord.id
      }
    }

    // Refund status updates arrive as payment webhooks too
    if (payment.amountRefunded && Number(payment.amountRefunded.value) > 0) {
      await handleRefundWebhook(supabase, payment.id, payment)
    }

    if (returnId || isReturnPayment) {
      if (!returnId) {
        return NextResponse.json({
          received: true,
          warning: 'Return payment without return_id',
        })
      }

      if (payment.status === 'paid') {
        const result = await fulfillReturnLabelPayment(supabase as any, returnId)
        return NextResponse.json({
          received: true,
          type: 'return_label_payment',
          ...result,
        })
      }

      if (
        payment.status === 'failed' ||
        payment.status === 'expired' ||
        payment.status === 'canceled'
      ) {
        await supabase
          .from('returns')
          .update({
            return_label_payment_status: payment.status,
          })
          .eq('id', returnId)
      }

      return NextResponse.json({
        received: true,
        type: 'return_label_payment',
        status: payment.status,
      })
    }

    // Order payment
    const orderId = metadata.orderId || null

    if (payment.status === 'paid') {
      const result = await fulfillPaidOrder({
        supabase,
        molliePaymentId: payment.id,
        orderId,
        paymentMethod: fromMollieMethod(payment.method || undefined),
        paymentMetadata: {
          mollie_payment_id: payment.id,
          amount: payment.amount,
          method: payment.method,
          status: payment.status,
          paid_at: payment.paidAt,
        },
      })
      return NextResponse.json({ received: true, type: 'order_payment', ...result })
    }

    if (
      payment.status === 'failed' ||
      payment.status === 'expired' ||
      payment.status === 'canceled'
    ) {
      const mapped = mapMollieStatusToPaymentStatus(payment.status)
      let orderQuery = supabase.from('orders').select('id, payment_status')
      if (orderId) {
        orderQuery = orderQuery.eq('id', orderId)
      } else {
        orderQuery = orderQuery.eq('mollie_payment_id', payment.id)
      }
      const { data: order } = await orderQuery.maybeSingle()

      if (order && order.payment_status !== 'paid') {
        await supabase
          .from('orders')
          .update({
            payment_status: mapped,
            payment_metadata: {
              mollie_payment_id: payment.id,
              status: payment.status,
              updated_via: 'mollie_webhook',
            },
          })
          .eq('id', order.id)

        if (payment.status === 'failed' || payment.status === 'canceled') {
          try {
            await reverseGiftCardsForOrder(supabase, order.id)
          } catch (err) {
            console.error('[mollie-webhook] reverse gift cards failed:', err)
          }
        }
      }

      return NextResponse.json({
        received: true,
        type: 'order_payment',
        status: payment.status,
      })
    }

    return NextResponse.json({
      received: true,
      status: payment.status,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[mollie-webhook] Error:', message)
    // Still 200 so Mollie does not disable the webhook for transient errors
    return NextResponse.json({ received: true, warning: message })
  }
}

async function handleRefundWebhook(
  supabase: any,
  paymentId: string,
  payment: MolliePaymentLike
) {
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .or(
      `mollie_payment_id.eq.${paymentId},stripe_payment_intent_id.eq.${paymentId}`
    )
    .maybeSingle()

  if (!order) return

  const { data: returns } = await supabase
    .from('returns')
    .select('id, status, mollie_refund_id, stripe_refund_id, refund_amount')
    .eq('order_id', order.id)
    .in('status', ['refund_processing', 'return_approved', 'return_received'])

  if (!returns?.length) {
    await supabase
      .from('orders')
      .update({
        payment_status: 'refunded',
        payment_metadata: {
          mollie_payment_id: paymentId,
          amount_refunded: payment.amountRefunded,
          updated_via: 'mollie_webhook_refund',
        },
      })
      .eq('id', order.id)
      .eq('payment_status', 'paid')
    return
  }

  for (const ret of returns) {
    if (ret.mollie_refund_id || ret.stripe_refund_id) {
      await supabase
        .from('returns')
        .update({
          status: 'refunded',
          mollie_refund_status: 'refunded',
          stripe_refund_status: 'succeeded',
          refunded_at: new Date().toISOString(),
        })
        .eq('id', ret.id)
        .neq('status', 'refunded')

      try {
        await updateOrderStatusForReturn(order.id, 'refunded')
      } catch {
        /* ignore */
      }
    }
  }
}
