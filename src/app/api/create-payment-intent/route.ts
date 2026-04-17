import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSiteSettings } from '@/lib/settings'
import { evaluatePickupEligibility } from '@/lib/pickup-eligibility'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim())

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
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
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (expectedTotal == null) {
      return NextResponse.json(
        { error: 'Missing expectedTotal' },
        { status: 400 }
      )
    }

    const settings = await getSiteSettings()

    // Calculate subtotal from items
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
    
    // Server-side promo code validation
    let validatedDiscount = 0
    if (promoCode) {
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
            // Expired
          } else if (promoData.usage_limit && promoData.usage_count >= promoData.usage_limit) {
            // Usage limit reached
          } else if (promoData.min_order_value && subtotal < promoData.min_order_value) {
            // Minimum order value not met
          } else {
            if (promoData.discount_type === 'percentage') {
              validatedDiscount = (subtotal * promoData.discount_value) / 100
            } else if (promoData.discount_type === 'fixed') {
              validatedDiscount = promoData.discount_value
            }
            validatedDiscount = Math.min(validatedDiscount, subtotal)
          }
        }
      } catch (err) {
        console.error('⚠️ Promo validation error:', err)
        // Don't fail payment if promo validation fails
      }
    }
    
    // Look up the loyalty tier discount that was locked in when the order
    // was created (in /api/checkout). Using the stored value keeps the total
    // stable between order creation and payment confirmation even if the
    // customer's tier flips in the meantime.
    let loyaltyTierDiscount = 0
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      )
      const { data: existingOrder } = await adminClient
        .from('orders')
        .select('loyalty_tier_discount')
        .eq('id', orderId)
        .maybeSingle()
      loyaltyTierDiscount = Number(existingOrder?.loyalty_tier_discount || 0)
      if (!Number.isFinite(loyaltyTierDiscount) || loyaltyTierDiscount < 0) loyaltyTierDiscount = 0
    } catch (err) {
      console.error('[create-payment-intent] Failed to load loyalty tier discount (non-fatal):', err)
    }

    // Calculate final total with validated discount + tier discount
    const subtotalAfterDiscount = subtotal - validatedDiscount - loyaltyTierDiscount
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

    // Security check: compare with expected total (allow 1 cent difference for rounding)
    if (Math.abs(total - expectedTotal) > 0.01) {
      console.error('[create-payment-intent] Total mismatch:', { total, expectedTotal })
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

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig)

    // Update order with stripe_payment_intent_id
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
    } catch (err) {
      console.error('[create-payment-intent] Failed to update order:', err)
      // Don't fail the whole request if this fails
    }

    return NextResponse.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    })
  } catch (error: any) {
    console.error('[create-payment-intent] Error:', error.message || error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden bij het aanmaken van de betaling' },
      { status: 500 }
    )
  }
}

