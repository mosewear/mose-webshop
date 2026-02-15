import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSiteSettings } from '@/lib/settings'
import { evaluatePickupEligibility } from '@/lib/pickup-eligibility'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim())

export async function POST(req: NextRequest) {
  try {
    console.log('🔵 API: create-payment-intent called')
    
    const body = await req.json()
    console.log('🔵 API: Request body:', body)
    
    const {
      orderId,
      items,
      customerEmail,
      customerName,
      shippingAddress,
      paymentMethod,
      promoCode,
      promoDiscount,
      expectedTotal,
      deliveryMethod,
    } = body

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

    // Calculate subtotal from items
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
    
    // Server-side promo code validation
    let validatedDiscount = 0
    if (promoCode) {
      console.log('🎟️ Validating promo code:', promoCode)
      
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        )
        
        const { data: promoData, error: promoError } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('code', promoCode.toUpperCase())
          .single()
        
        if (promoData && !promoError && promoData.is_active) {
          // Check expiry
          if (promoData.expires_at && new Date(promoData.expires_at) < new Date()) {
            console.log('⚠️ Promo code expired, ignoring')
          } 
          // Check usage limit
          else if (promoData.usage_limit && promoData.usage_count >= promoData.usage_limit) {
            console.log('⚠️ Promo code usage limit reached, ignoring')
          }
          // Check minimum order value
          else if (promoData.min_order_value && subtotal < promoData.min_order_value) {
            console.log('⚠️ Minimum order value not met, ignoring')
          }
          // Valid! Calculate discount
          else {
            if (promoData.discount_type === 'percentage') {
              validatedDiscount = (subtotal * promoData.discount_value) / 100
            } else if (promoData.discount_type === 'fixed') {
              validatedDiscount = promoData.discount_value
            }
            validatedDiscount = Math.min(validatedDiscount, subtotal) // Cap at subtotal
            console.log('✅ Promo code validated, discount:', validatedDiscount)
          }
        }
      } catch (err) {
        console.error('⚠️ Promo validation error:', err)
        // Don't fail payment if promo validation fails
      }
    }
    
    // Calculate final total with validated discount
    const subtotalAfterDiscount = subtotal - validatedDiscount
    let finalDeliveryMethod: 'shipping' | 'pickup' = deliveryMethod === 'pickup' ? 'pickup' : 'shipping'
    let shippingCost = subtotalAfterDiscount >= settings.free_shipping_threshold ? 0 : settings.shipping_cost

    if (finalDeliveryMethod === 'pickup') {
      const pickup = await evaluatePickupEligibility({
        country: shippingAddress?.country || 'NL',
        postalCode: shippingAddress?.postalCode || '',
        houseNumber: shippingAddress?.houseNumber || '',
        addition: shippingAddress?.addition || '',
      })

      if (pickup.eligible) {
        shippingCost = 0
      } else {
        finalDeliveryMethod = 'shipping'
      }
    }
    const total = subtotalAfterDiscount + shippingCost

    console.log('🔵 API: Calculated totals:', { 
      subtotal, 
      promoDiscount: validatedDiscount,
      subtotalAfterDiscount,
      shippingCost, 
      total,
      expectedTotal 
    })
    
    // Security check: compare with expected total (allow 1 cent difference for rounding)
    if (expectedTotal && Math.abs(total - expectedTotal) > 0.01) {
      console.error('🔴 Total mismatch! Calculated:', total, 'Expected:', expectedTotal)
      return NextResponse.json(
        { error: 'Price mismatch. Please refresh and try again.' },
        { status: 400 }
      )
    }

    // Payment Intent configuration
    const paymentIntentConfig: any = {
      amount: Math.round(total * 100), // Stripe expects cents
      currency: 'eur',
      // Use specific payment method type if provided, otherwise use automatic
      metadata: {
        orderId,
        customerName,
        customerEmail,
        deliveryMethod: finalDeliveryMethod,
        shippingAddress: JSON.stringify(shippingAddress),
      },
      description: `Order #${orderId} - ${customerName}`,
      // Don't send Stripe receipt email - we send our own from orders@mosewear.nl
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

    // Update order with stripe_payment_intent_id for later lookup
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      )
      
      await supabase
        .from('orders')
        .update({ 
          stripe_payment_intent_id: paymentIntent.id,
          payment_status: 'pending',
          payment_method: paymentMethod,
          delivery_method: finalDeliveryMethod,
          shipping_cost: shippingCost,
          total: total,
          checkout_started_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        
      console.log('✅ API: Order updated with payment intent and status')
    } catch (err) {
      console.error('⚠️ API: Failed to update order:', err)
      // Don't fail the whole request if this fails
    }

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

