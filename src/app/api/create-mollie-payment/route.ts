import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { legacyPaymentDecision, shopifyCheckoutEnabled } from '@/lib/checkout-cutover'
import {
  asMolliePayment,
  formatMollieAmount,
  getMollieClient,
  getMollieErrorInfo,
  getMollieWebhookUrl,
  getOrderPaymentRedirectUrl,
  mollieLocale,
  toMollieMethod,
  type StorefrontPaymentMethod,
} from '@/lib/mollie'

function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

const VALID_METHODS = new Set<StorefrontPaymentMethod>([
  'ideal',
  'card',
  'klarna',
  'bancontact',
  'paypal',
])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      orderId,
      customerEmail,
      customerName,
      shippingAddress,
      paymentMethod,
      deliveryMethod,
      expectedTotal,
      amount,
      locale: bodyLocale,
    } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    let clientExpected: number | null =
      expectedTotal != null && Number.isFinite(Number(expectedTotal))
        ? Number(expectedTotal)
        : typeof amount === 'number' && Number.isFinite(amount)
          ? amount / 100
          : null

    if (clientExpected == null) {
      return NextResponse.json({ error: 'Missing expectedTotal' }, { status: 400 })
    }
    clientExpected = roundMoney(clientExpected)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: orderRow, error: orderErr } = await supabase
      .from('orders')
      .select('total, payment_status, shipping_cost, locale, email, created_at, status')
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr || !orderRow) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const historicalDecision = legacyPaymentDecision(orderRow)
    if (historicalDecision !== 'allow') {
      return NextResponse.json({
        error: historicalDecision === 'cutover_not_configured'
          ? 'Deze betaling kan nu niet worden hervat. Neem contact met ons op.'
          : 'Deze bestelling kan niet via deze betaalroute worden betaald.',
        code: historicalDecision === 'cutover_not_configured' ? 'PAYMENT_RECOVERY_UNAVAILABLE' : 'LEGACY_PAYMENT_NOT_ALLOWED',
      }, { status: historicalDecision === 'cutover_not_configured' ? 503 : 409, headers: { 'Cache-Control': 'no-store' } })
    }

    if (orderRow.payment_status === 'paid') {
      return NextResponse.json({ error: 'Order already paid' }, { status: 400 })
    }

    const authoritativeTotal = roundMoney(Number(orderRow.total))

    if (Math.abs(authoritativeTotal - clientExpected) > 0.02) {
      console.error('[create-mollie-payment] Total mismatch:', {
        authoritativeTotal,
        clientExpected,
        orderId,
      })
      return NextResponse.json(
        { error: 'Price mismatch. Please refresh and try again.' },
        { status: 400 }
      )
    }

    const finalDeliveryMethod: 'shipping' | 'pickup' =
      deliveryMethod === 'pickup' ? 'pickup' : 'shipping'

    const method: StorefrontPaymentMethod | null =
      paymentMethod && VALID_METHODS.has(paymentMethod) ? paymentMethod : null

    const locale =
      bodyLocale === 'en' || bodyLocale === 'nl'
        ? bodyLocale
        : orderRow.locale === 'en'
          ? 'en'
          : 'nl'

    const mollie = getMollieClient()

    // Reuse open Mollie payment if still open for this order
    if (orderRow && (orderRow as any)) {
      const { data: existing, error: existingError } = await supabase
        .from('orders')
        .select('mollie_payment_id')
        .eq('id', orderId)
        .maybeSingle()

      if (existingError && shopifyCheckoutEnabled()) {
        return NextResponse.json({ error: 'We kunnen de vorige betaling nu niet controleren. Probeer het later opnieuw.' }, { status: 503 })
      }

      if (existing?.mollie_payment_id) {
        try {
          const existingPayment = await asMolliePayment(
            mollie.payments.get(existing.mollie_payment_id)
          )
          if (
            existingPayment.status === 'open' ||
            existingPayment.status === 'pending'
          ) {
            // If method changed, create a new payment instead
            const existingMethod = existingPayment.method
            const wanted = method ? toMollieMethod(method) : null
            if (shopifyCheckoutEnabled() || !wanted || existingMethod === wanted || !existingMethod) {
              const checkoutUrl = existingPayment.getCheckoutUrl()
              if (checkoutUrl) {
                return NextResponse.json({
                  checkoutUrl,
                  paymentId: existingPayment.id,
                  reused: true,
                })
              }
              if (shopifyCheckoutEnabled()) {
                return NextResponse.json({ error: 'Je eerdere betaling wordt nog verwerkt. Probeer het later opnieuw.' }, { status: 409 })
              }
            }
          }
          if (existingPayment.status === 'paid') {
            return NextResponse.json(
              { error: 'Order already paid' },
              { status: 400 }
            )
          }
          if (shopifyCheckoutEnabled() && !['failed', 'canceled', 'expired'].includes(existingPayment.status)) {
            return NextResponse.json({ error: 'Je eerdere betaling wordt nog verwerkt. Probeer het later opnieuw.' }, { status: 409 })
          }
        } catch {
          // During cutover an unknown previous payment must never result in a
          // second charge. Keep historical recovery retryable after an outage.
          if (shopifyCheckoutEnabled()) {
            return NextResponse.json({ error: 'We kunnen de vorige betaling nu niet controleren. Probeer het later opnieuw.' }, { status: 503 })
          }
          // Legacy behavior before cutover: stale id — create new payment below.
        }
      }
    }

    const payment = await asMolliePayment(
      mollie.payments.create({
        amount: {
          currency: 'EUR',
          value: formatMollieAmount(authoritativeTotal),
        },
        description: `Order #${orderId.slice(0, 8).toUpperCase()} - ${customerName || 'Customer'}`,
        redirectUrl: getOrderPaymentRedirectUrl(orderId, locale),
        webhookUrl: getMollieWebhookUrl(),
        ...(method ? { method: toMollieMethod(method) } : {}),
        metadata: {
          orderId,
          type: 'order_payment',
          customerName: (customerName || '').slice(0, 200),
          customerEmail: (customerEmail || orderRow.email || '').slice(0, 200),
          deliveryMethod: finalDeliveryMethod,
          shippingAddress: JSON.stringify(shippingAddress || {}).slice(0, 500),
        },
        locale: mollieLocale(locale),
      })
    )

    const checkoutUrl = payment.getCheckoutUrl()
    if (!checkoutUrl) {
      return NextResponse.json(
        { error: 'Mollie did not return a checkout URL' },
        { status: 502 }
      )
    }

    await supabase
      .from('orders')
      .update({
        mollie_payment_id: payment.id,
        // Dual-write so legacy lookups / admin tools still find a payment ref
        stripe_payment_intent_id: payment.id,
        payment_status: 'pending',
        payment_method: method || null,
        delivery_method: finalDeliveryMethod,
        checkout_started_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return NextResponse.json({
      checkoutUrl,
      paymentId: payment.id,
    })
  } catch (error: unknown) {
    const { message, statusCode, field } = getMollieErrorInfo(error)
    console.error('[create-mollie-payment] Error:', message, field ? { field } : '')
    return NextResponse.json(
      {
        error: message,
        ...(field ? { field } : {}),
      },
      { status: statusCode }
    )
  }
}
