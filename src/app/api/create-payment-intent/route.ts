import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim())

function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      orderId,
      items: _items,
      customerEmail,
      customerName,
      shippingAddress,
      paymentMethod,
      deliveryMethod,
      expectedTotal,
      amount,
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

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: orderRow, error: orderErr } = await supabase
      .from('orders')
      .select('total, payment_status, shipping_cost')
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr || !orderRow) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (orderRow.payment_status === 'paid') {
      return NextResponse.json({ error: 'Order already paid' }, { status: 400 })
    }

    const authoritativeTotal = roundMoney(Number(orderRow.total))

    if (Math.abs(authoritativeTotal - clientExpected) > 0.02) {
      console.error('[create-payment-intent] Total mismatch:', {
        authoritativeTotal,
        clientExpected,
        orderId,
      })
      return NextResponse.json(
        { error: 'Price mismatch. Please refresh and try again.' },
        { status: 400 }
      )
    }

    const total = authoritativeTotal
    const finalDeliveryMethod: 'shipping' | 'pickup' =
      deliveryMethod === 'pickup' ? 'pickup' : 'shipping'

    const paymentIntentConfig: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(total * 100),
      currency: 'eur',
      metadata: {
        orderId,
        customerName: customerName || '',
        customerEmail: customerEmail || '',
        deliveryMethod: finalDeliveryMethod,
        shippingAddress: JSON.stringify(shippingAddress || {}),
      },
      description: `Order #${orderId} - ${customerName || 'Customer'}`,
    }

    if (paymentMethod) {
      paymentIntentConfig.payment_method_types = [paymentMethod]
    } else {
      paymentIntentConfig.automatic_payment_methods = {
        enabled: true,
        allow_redirects: 'always',
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig)

    try {
      await supabase
        .from('orders')
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          payment_status: 'pending',
          payment_method: paymentMethod || null,
          delivery_method: finalDeliveryMethod,
          checkout_started_at: new Date().toISOString(),
        })
        .eq('id', orderId)
    } catch (err) {
      console.error('[create-payment-intent] Failed to update order:', err)
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[create-payment-intent] Error:', message)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden bij het aanmaken van de betaling' },
      { status: 500 }
    )
  }
}
