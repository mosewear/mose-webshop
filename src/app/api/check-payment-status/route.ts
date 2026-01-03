import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendOrderConfirmationEmail } from '@/lib/email'

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
      .select('*, order_items(*)')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single()

    // FALLBACK: If payment succeeded but order is still pending, update it
    if (order && paymentIntent.status === 'succeeded' && order.payment_status !== 'paid') {
      console.log('🔧 FALLBACK: Webhook missed, manually updating order to PAID')
      
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: paymentIntent.payment_method_types?.[0] || 'unknown',
          status: 'processing',
          payment_metadata: {
            payment_intent_id: paymentIntent.id,
            amount_received: paymentIntent.amount_received,
            currency: paymentIntent.currency,
            updated_via: 'check_payment_status_fallback',
          },
        })
        .eq('id', order.id)
        .select('*, order_items(*)')
        .single()
      
      if (!updateError && updatedOrder) {
        console.log('✅ Order updated to PAID via fallback')
        
        // Send confirmation email
        try {
          const shippingAddress = updatedOrder.shipping_address as any
          
          await sendOrderConfirmationEmail({
            customerName: shippingAddress?.name || 'Klant',
            customerEmail: updatedOrder.email,
            orderId: updatedOrder.id,
            orderTotal: updatedOrder.total,
            orderItems: updatedOrder.order_items.map((item: any) => ({
              name: item.product_name,
              size: item.size,
              color: item.color,
              quantity: item.quantity,
              price: item.price_at_purchase,
              imageUrl: item.image_url,
            })),
            shippingAddress: {
              name: shippingAddress?.name || '',
              address: shippingAddress?.address || '',
              city: shippingAddress?.city || '',
              postalCode: shippingAddress?.postalCode || '',
            },
          })
          console.log('✅ Confirmation email sent via fallback')
        } catch (emailError) {
          console.error('❌ Error sending email:', emailError)
        }
      }
    }

    return NextResponse.json({
      status: paymentIntent.status,
      orderId: order?.id || null,
      payment_status: order?.payment_status || null,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      fallback_applied: paymentIntent.status === 'succeeded' && order?.payment_status !== 'paid',
    })
  } catch (error: any) {
    console.error('❌ Error checking payment status:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

