import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { getPublicSiteUrl } from '@/lib/site-url'
import { applyInventoryDecrementForPaidOrder } from '@/lib/order-stock'

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

    let fallbackApplied = false

    // FALLBACK: If payment succeeded but order is still pending, update it
    // IMPORTANT: Also check if email was already sent to prevent duplicates!
    if (order && paymentIntent.status === 'succeeded' && order.payment_status !== 'paid' && !order.last_email_sent_at) {
      console.log('🔧 FALLBACK: Webhook missed, manually updating order to PAID')
      console.log('🔧 FALLBACK: Will send email (last_email_sent_at is null)')
      
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
        fallbackApplied = true
        console.log('✅ Order updated to PAID via fallback')
        
        // Send confirmation email
        try {
          console.log('📧 [FALLBACK] Preparing to send confirmation email...')
          const shippingAddress = updatedOrder.shipping_address as any
          const siteUrl = getPublicSiteUrl()
          
          console.log(`📧 [FALLBACK] Sending to: ${updatedOrder.email}`)
          console.log(`📧 [FALLBACK] Order ID: ${updatedOrder.id}`)
          console.log(`📧 [FALLBACK] Order total: €${updatedOrder.total}`)
          console.log(`📧 [FALLBACK] Items count: ${updatedOrder.order_items.length}`)
          
          const emailResult = await sendOrderConfirmationEmail({
            customerName: shippingAddress?.name || 'Klant',
            customerEmail: updatedOrder.email,
            orderId: updatedOrder.id,
            orderTotal: updatedOrder.total,
            subtotal: updatedOrder.subtotal,
            shippingCost: updatedOrder.shipping_cost,
            orderItems: updatedOrder.order_items.map((item: any) => ({
              name: item.product_name,
              size: item.size,
              color: item.color,
              quantity: item.quantity,
              price: item.price_at_purchase,
              imageUrl: item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${siteUrl}${item.image_url}`) : '',
              isPresale: item.is_presale || false,  // PRESALE: Pass presale status
              presaleExpectedDate: item.presale_expected_date || undefined,  // PRESALE: Expected date
            })),
            shippingAddress: {
              name: shippingAddress?.name || '',
              address: shippingAddress?.address || '',
              city: shippingAddress?.city || '',
              postalCode: shippingAddress?.postalCode || '',
            },
            promoCode: updatedOrder.promo_code || undefined,
            discountAmount: updatedOrder.discount_amount || 0,
            locale: updatedOrder.locale || 'nl',
          })
          
          if (emailResult.success) {
            console.log('✅ [FALLBACK] Confirmation email sent successfully!')
            console.log('✅ [FALLBACK] Email ID:', emailResult.data)
            
            // Update last_email_sent_at to prevent duplicate emails
            try {
              await supabase
                .from('orders')
                .update({ 
                  last_email_sent_at: new Date().toISOString(),
                  last_email_type: 'order_confirmation'
                })
                .eq('id', updatedOrder.id)
              
              console.log('✅ [FALLBACK] Email timestamp updated in database')
            } catch (emailTsErr) {
              console.error('❌ [FALLBACK] Failed to update email timestamp:', emailTsErr)
              // Don't fail if timestamp update fails
            }
          } else {
            console.error('❌ [FALLBACK] Email send failed:', emailResult.error)
          }
        } catch (emailError: any) {
          console.error('❌ [FALLBACK] Exception sending email:', emailError)
          console.error('❌ [FALLBACK] Error details:', emailError.message)
          console.error('❌ [FALLBACK] Error stack:', emailError.stack)
        }
      }
    } else if (order && paymentIntent.status === 'succeeded' && order.payment_status === 'paid' && order.last_email_sent_at) {
      // Order was already updated by webhook AND email was sent
      console.log('✅ FALLBACK: Order already paid and email already sent by webhook')
      console.log('✅ FALLBACK: Email sent at:', order.last_email_sent_at)
      console.log('✅ FALLBACK: Skipping duplicate email send')
    } else if (order && paymentIntent.status === 'succeeded' && order.payment_status === 'paid' && !order.last_email_sent_at) {
      // Order was updated but email NOT sent (webhook might have failed at email step)
      console.log('⚠️ FALLBACK: Order is paid but NO email timestamp!')
      console.log('⚠️ FALLBACK: This should be handled by get-order API')
    }

    // Ensure inventory is applied whenever Stripe says succeeded (idempotent)
    if (order?.id && paymentIntent.status === 'succeeded') {
      const inv = await applyInventoryDecrementForPaidOrder(supabase, order.id)
      if (!inv.ok && !inv.skipped) {
        console.error('[check-payment-status] Inventory stamp:', inv.reason)
      }
    }

    let latestPaymentStatus = order?.payment_status ?? null
    if (order?.id) {
      const { data: snap } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('id', order.id)
        .maybeSingle()
      if (snap?.payment_status != null) latestPaymentStatus = snap.payment_status
    }

    return NextResponse.json({
      status: paymentIntent.status,
      orderId: order?.id || null,
      payment_status: latestPaymentStatus,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      fallback_applied: fallbackApplied,
    })
  } catch (error: any) {
    console.error('❌ Error checking payment status:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}

