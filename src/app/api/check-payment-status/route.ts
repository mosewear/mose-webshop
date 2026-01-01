import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim())

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const paymentIntentId = searchParams.get('payment_intent')

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'payment_intent required' },
        { status: 400 }
      )
    }

    console.log('🔍 Checking payment intent:', paymentIntentId)

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    console.log('✅ Payment Intent status:', paymentIntent.status)

    // Try to find associated order
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single()

    return NextResponse.json({
      status: paymentIntent.status,
      orderId: order?.id || null,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    })
  } catch (error: any) {
    console.error('❌ Error checking payment status:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

