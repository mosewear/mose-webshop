import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
})

// Helper function to sanitize strings for Stripe metadata
function sanitizeForStripe(str: string): string {
  if (!str) return ''
  // Remove any non-ASCII characters and control characters
  return str
    .replace(/[^\x20-\x7E]/g, '') // Keep only printable ASCII
    .trim()
    .slice(0, 500) // Stripe metadata values max 500 chars
}

export async function POST(req: NextRequest) {
  try {
    console.log('🔵 API: create-checkout-session called')
    
    const body = await req.json()
    console.log('🔵 API: Request body:', JSON.stringify(body, null, 2))
    
    const { orderId, items, customerEmail, customerName, shippingAddress, phone } = body

    if (!orderId || !items || items.length === 0) {
      console.error('🔴 API: Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('🔵 API: Creating line items...')
    
    // Create line items for Stripe
    const lineItems = items.map((item: any) => {
      // Only include images if it's a valid absolute URL
      const isValidUrl = item.image && (item.image.startsWith('http://') || item.image.startsWith('https://'))
      
      const productData: any = {
        name: sanitizeForStripe(item.name),
        description: sanitizeForStripe(`${item.size} • ${item.color}`),
      }
      
      // Only add images if we have a valid absolute URL
      if (isValidUrl) {
        productData.images = [item.image]
      }
      
      return {
        price_data: {
          currency: 'eur',
          product_data: productData,
          unit_amount: Math.round(item.price * 100), // Stripe expects cents
        },
        quantity: item.quantity,
      }
    })

    console.log('🔵 API: Line items created')

    // Calculate shipping
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
    const shippingCost = subtotal >= 50 ? 0 : 5.95

    console.log('🔵 API: Calculated shipping:', { subtotal, shippingCost })

    // Add shipping as line item if applicable
    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Verzending',
            description: 'Standaard verzending naar Nederland/België',
          },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      })
    }

    console.log('🔵 API: Creating Stripe session...')

    // Sanitize metadata values
    const sanitizedMetadata = {
      orderId: sanitizeForStripe(orderId),
      customerName: sanitizeForStripe(customerName || ''),
      shippingAddress: sanitizeForStripe(shippingAddress || ''),
      phone: sanitizeForStripe(phone || ''),
    }

    console.log('🔵 API: Sanitized metadata:', sanitizedMetadata)

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'ideal', 'bancontact'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/order-confirmation?order=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout?canceled=true`,
      customer_email: customerEmail,
      metadata: sanitizedMetadata,
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['NL', 'BE'],
      },
      locale: 'nl',
    })

    console.log('✅ API: Stripe session created successfully')

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error('🔴 API: Stripe checkout error:', error)
    console.error('🔴 API: Error type:', error.type)
    console.error('🔴 API: Error code:', error.code)
    console.error('🔴 API: Error message:', error.message)
    
    // Return detailed error for debugging
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create checkout session',
        type: error.type,
        code: error.code,
        details: error.raw || error,
      },
      { status: 500 }
    )
  }
}
