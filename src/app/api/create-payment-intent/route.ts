import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSiteSettings } from '@/lib/settings'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim())

export async function POST(req: NextRequest) {
  try {
    console.log('🔵 API: create-payment-intent called')
    
    const body = await req.json()
    console.log('🔵 API: Request body:', body)
    
    const { orderId, items, customerEmail, customerName, shippingAddress, paymentMethod } = body

    if (!orderId || !items || items.length === 0) {
      console.error('🔴 API: Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get dynamic shipping settings
    const settings = await getSiteSettings()
    console.log('🔵 API: Settings from Supabase:', {
      shipping_cost: settings.shipping_cost,
      free_shipping_threshold: settings.free_shipping_threshold
    })

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
    const shippingCost = subtotal >= settings.free_shipping_threshold ? 0 : settings.shipping_cost
    const total = subtotal + shippingCost

    console.log('🔵 API: Calculated totals:', { subtotal, shippingCost, total })

    // Payment Intent configuration
    const paymentIntentConfig: any = {
      amount: Math.round(total * 100), // Stripe expects cents
      currency: 'eur',
      // Use specific payment method type if provided, otherwise use automatic
      metadata: {
        orderId,
        customerName,
        customerEmail,
        shippingAddress: JSON.stringify(shippingAddress),
      },
      description: `Order #${orderId} - ${customerName}`,
      receipt_email: customerEmail,
    }

    // If a specific payment method is requested, use that
    // Otherwise use automatic payment methods
    if (paymentMethod) {
      paymentIntentConfig.payment_method_types = [paymentMethod]
    } else {
      paymentIntentConfig.automatic_payment_methods = {
        enabled: true,
        allow_redirects: 'always'
      }
    }

    console.log('🔵 API: Creating Payment Intent with config:', {
      amount: paymentIntentConfig.amount,
      payment_method_types: paymentIntentConfig.payment_method_types,
      automatic_payment_methods: paymentIntentConfig.automatic_payment_methods,
    })

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig)

    console.log('✅ API: Payment Intent created:', paymentIntent.id)

    return NextResponse.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    })
  } catch (error: any) {
    console.error('🔴 API: Payment Intent error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}

