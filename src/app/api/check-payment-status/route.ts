import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  asMolliePayment,
  fromMollieMethod,
  getMollieClient,
  mapMollieStatusToPaymentStatus,
} from '@/lib/mollie'
import { fulfillPaidOrder } from '@/lib/fulfill-paid-order'
import { fulfillReturnLabelPayment } from '@/lib/fulfill-return-label-payment'

/**
 * Confirm payment status via Mollie API (never trust client redirect alone).
 * Query: ?payment=tr_…  or  ?order_id=…  (looks up mollie_payment_id)
 * Legacy: ?payment_intent=… still accepted (same id column during migration).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const paymentId =
      searchParams.get('payment') ||
      searchParams.get('payment_intent') ||
      searchParams.get('mollie_payment_id')
    const orderIdParam = searchParams.get('order_id')
    const returnIdParam = searchParams.get('return_id')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    let resolvedPaymentId = paymentId

    if (!resolvedPaymentId && orderIdParam) {
      const { data: orderRow } = await supabase
        .from('orders')
        .select('mollie_payment_id, stripe_payment_intent_id')
        .eq('id', orderIdParam)
        .maybeSingle()
      resolvedPaymentId =
        orderRow?.mollie_payment_id || orderRow?.stripe_payment_intent_id || null
    }

    if (!resolvedPaymentId && returnIdParam) {
      const { data: ret } = await supabase
        .from('returns')
        .select('return_label_payment_intent_id')
        .eq('id', returnIdParam)
        .maybeSingle()
      resolvedPaymentId = ret?.return_label_payment_intent_id || null
    }

    if (!resolvedPaymentId) {
      return NextResponse.json(
        { error: 'payment or order_id required' },
        { status: 400 }
      )
    }

    const mollie = getMollieClient()
    const payment = await asMolliePayment(mollie.payments.get(resolvedPaymentId))
    const metadata = (payment.metadata || {}) as Record<string, string>

    // Return-label payment path
    if (metadata.type === 'return_label_payment' || returnIdParam) {
      const returnId = returnIdParam || metadata.return_id
      if (payment.status === 'paid' && returnId) {
        await fulfillReturnLabelPayment(supabase, returnId)
      }
      return NextResponse.json({
        status: payment.status === 'paid' ? 'succeeded' : payment.status,
        mollie_status: payment.status,
        returnId: returnId || null,
        paymentId: payment.id,
        amount: payment.amount,
      })
    }

    let orderId = orderIdParam || metadata.orderId || null
    const { data: order } = await supabase
      .from('orders')
      .select('id, payment_status, last_email_sent_at, locale')
      .or(
        [
          orderId ? `id.eq.${orderId}` : null,
          `mollie_payment_id.eq.${resolvedPaymentId}`,
          `stripe_payment_intent_id.eq.${resolvedPaymentId}`,
        ]
          .filter(Boolean)
          .join(',')
      )
      .maybeSingle()

    if (order) orderId = order.id

    let fallbackApplied = false

    if (payment.status === 'paid' && orderId) {
      const result = await fulfillPaidOrder({
        supabase,
        molliePaymentId: payment.id,
        orderId,
        paymentMethod: fromMollieMethod(payment.method || undefined),
        paymentMetadata: {
          mollie_payment_id: payment.id,
          amount: payment.amount,
          method: payment.method,
          updated_via: 'check_payment_status',
        },
      })
      fallbackApplied = result.ok && !result.alreadyPaid
    } else if (
      order &&
      order.payment_status !== 'paid' &&
      (payment.status === 'failed' ||
        payment.status === 'expired' ||
        payment.status === 'canceled')
    ) {
      const mapped = mapMollieStatusToPaymentStatus(payment.status)
      await supabase
        .from('orders')
        .update({
          payment_status: mapped,
        })
        .eq('id', order.id)
    }

    let latestPaymentStatus = order?.payment_status ?? null
    if (orderId) {
      const { data: snap } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('id', orderId)
        .maybeSingle()
      if (snap?.payment_status != null) latestPaymentStatus = snap.payment_status
    }

    // Normalize to Stripe-era status values the UI already understands
    const uiStatus =
      payment.status === 'paid'
        ? 'succeeded'
        : payment.status === 'canceled'
          ? 'canceled'
          : payment.status === 'failed' || payment.status === 'expired'
            ? 'requires_payment_method'
            : payment.status

    return NextResponse.json({
      status: uiStatus,
      mollie_status: payment.status,
      orderId: orderId || null,
      payment_status: latestPaymentStatus,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.amount?.currency || 'EUR',
      fallback_applied: fallbackApplied,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[check-payment-status] Error:', message)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
