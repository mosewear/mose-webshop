import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { sendOrderConfirmationEmail } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim())

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: 'Missing signature or webhook secret' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  // Handle the event
  try {
    switch (event.type) {
      // PRIMARY EVENT: Payment Intent Succeeded (for Payment Element flow)
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const supabase = await createClient()
        
        console.log('💳 Webhook: Payment Intent Succeeded:', paymentIntent.id)
        
        // Find order by payment intent ID
        const { data: order, error: findError } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single()
        
        if (findError || !order) {
          console.error('❌ Webhook: Order not found for payment intent:', paymentIntent.id, findError)
          return NextResponse.json({ 
            error: 'Order not found',
            payment_intent_id: paymentIntent.id 
          }, { status: 404 })
        }
        
        console.log('✅ Webhook: Order found:', order.id)
        
        // Update order to PAID
        const { data: updatedOrder, error: updateError } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            paid_at: new Date().toISOString(),
            payment_method: paymentIntent.payment_method_types?.[0] || 'unknown',
            payment_metadata: {
              payment_intent_id: paymentIntent.id,
              amount_received: paymentIntent.amount_received,
              currency: paymentIntent.currency,
              payment_method_types: paymentIntent.payment_method_types,
            },
            status: 'processing', // Move to processing when paid
          })
          .eq('id', order.id)
          .select('*, order_items(*)')
          .single()
        
        if (updateError) {
          console.error('❌ Error updating order:', updateError)
          return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
        }
        
        console.log(`✅ Order ${order.id} marked as PAID (payment_status: paid, status: processing)`)
        
        // Send order confirmation email
        if (updatedOrder) {
          try {
            const shippingAddress = updatedOrder.shipping_address as any
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
            
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
                imageUrl: item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${siteUrl}${item.image_url}`) : '',
              })),
              shippingAddress: {
                name: shippingAddress?.name || '',
                address: shippingAddress?.address || '',
                city: shippingAddress?.city || '',
                postalCode: shippingAddress?.postalCode || '',
              },
            })
            console.log('✅ Order confirmation email sent')
          } catch (emailError) {
            console.error('❌ Error sending confirmation email:', emailError)
            // Don't fail the webhook if email fails
          }
        }
        
        break
      }

      // LEGACY EVENT: Checkout Session Completed (for old Hosted Checkout flow - kept for backwards compatibility)
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Find order using TRIPLE FALLBACK method for 100% reliability
        const supabase = await createClient()
        let orderId: string | null = null
        let order: any = null
        
        console.log('🔍 Webhook: Finding order for session:', session.id)
        
        // METHOD 1: Via metadata orderId (primary method)
        if (session.metadata?.orderId) {
          orderId = session.metadata.orderId
          console.log('🔍 Method 1: Trying metadata orderId:', orderId)
          
          const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', orderId)
            .single()
          
          if (!error && data) {
            order = data
            console.log('✅ Method 1: Order found via metadata')
          } else {
            console.log('⚠️ Method 1: Order not found via metadata:', error?.message)
          }
        }
        
        // METHOD 2: FALLBACK - Via stripe_payment_intent_id
        if (!order && session.payment_intent) {
          console.log('🔍 Method 2: Trying stripe_payment_intent_id:', session.payment_intent)
          
          const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('stripe_payment_intent_id', session.payment_intent as string)
            .single()
          
          if (!error && data) {
            order = data
            orderId = data.id
            console.log('✅ Method 2: Order found via payment_intent_id')
          } else {
            console.log('⚠️ Method 2: Order not found via payment_intent_id:', error?.message)
          }
        }
        
        // METHOD 3: LAST RESORT - Via customer_email + pending status (most recent)
        if (!order && session.customer_email) {
          console.log('🔍 Method 3: Trying customer_email + pending status:', session.customer_email)
          
          const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('email', session.customer_email)
            .eq('payment_status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          
          if (!error && data) {
            order = data
            orderId = data.id
            console.log('✅ Method 3: Order found via customer_email')
          } else {
            console.log('⚠️ Method 3: Order not found via email:', error?.message)
          }
        }
        
        // If still no order found, log error and return
        if (!orderId || !order) {
          console.error('❌ Webhook: Could not find order for session:', {
            session_id: session.id,
            payment_intent: session.payment_intent,
            customer_email: session.customer_email,
            metadata: session.metadata,
          })
          return NextResponse.json({ 
            error: 'Order not found',
            session_id: session.id 
          }, { status: 404 })
        }
        
        // Update order with payment success
        console.log('💳 Webhook: Updating order to PAID:', orderId)
        
        const { data: updatedOrder, error } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            paid_at: new Date().toISOString(),
            payment_method: session.payment_method_types?.[0] || 'unknown',
            stripe_payment_intent_id: session.payment_intent as string,
            payment_metadata: {
              stripe_session_id: session.id,
              amount_total: session.amount_total,
              currency: session.currency,
              customer_email: session.customer_email,
            },
            status: 'processing', // Move to processing when paid
          })
          .eq('id', orderId)
          .select('*, order_items(*)')
          .single()

          if (error) {
            console.error('❌ Error updating order:', error)
          } else {
            console.log(`✅ Order ${orderId} marked as PAID (payment_status: paid, status: processing)`)
            
            // Send order confirmation email
            if (updatedOrder && session.customer_email) {
              try {
                const shippingAddress = updatedOrder.shipping_address as any
                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
                
                await sendOrderConfirmationEmail({
                  customerName: shippingAddress?.name || session.metadata?.customerName || 'Klant',
                  customerEmail: session.customer_email,
                  orderId: updatedOrder.id,
                  orderTotal: updatedOrder.total,
                  orderItems: updatedOrder.order_items.map((item: any) => ({
                    name: item.product_name,
                    size: item.size,
                    color: item.color,
                    quantity: item.quantity,
                    price: item.price_at_purchase,
                    imageUrl: item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${siteUrl}${item.image_url}`) : '',
                  })),
                  shippingAddress: {
                    name: shippingAddress?.name || '',
                    address: shippingAddress?.address || '',
                    city: shippingAddress?.city || '',
                    postalCode: shippingAddress?.postalCode || '',
                  },
                })
                console.log('✅ Order confirmation email sent')
              } catch (emailError) {
                console.error('❌ Error sending confirmation email:', emailError)
                // Don't fail the webhook if email fails
              }
            }
          }
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const supabase = await createClient()
        const orderId = session.metadata?.orderId

        if (orderId) {
          await supabase
            .from('orders')
            .update({
              payment_status: 'expired',
              payment_metadata: {
                expired_at: new Date().toISOString(),
                stripe_session_id: session.id,
              },
            })
            .eq('id', orderId)

          console.log(`⏰ Checkout session expired for order ${orderId}`)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const supabase = await createClient()

        // Find order by payment intent ID
        const { data: order } = await supabase
          .from('orders')
          .select('id')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single()

        if (order) {
          await supabase
            .from('orders')
            .update({
              payment_status: 'failed',
              payment_metadata: {
                failure_code: paymentIntent.last_payment_error?.code,
                failure_message: paymentIntent.last_payment_error?.message,
                failed_at: new Date().toISOString(),
              },
            })
            .eq('id', order.id)

          console.error(`❌ Payment failed for order ${order.id}: ${paymentIntent.last_payment_error?.message}`)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const supabase = await createClient()

        // Find order by payment intent ID
        const { data: order } = await supabase
          .from('orders')
          .select('id')
          .eq('stripe_payment_intent_id', charge.payment_intent as string)
          .single()

        if (order) {
          await supabase
            .from('orders')
            .update({
              payment_status: 'refunded',
              payment_metadata: {
                refunded_at: new Date().toISOString(),
                refund_amount: charge.amount_refunded,
                refund_reason: charge.refunds?.data?.[0]?.reason,
              },
            })
            .eq('id', order.id)

          console.log(`💰 Refund processed for order ${order.id}: €${(charge.amount_refunded / 100).toFixed(2)}`)
        }
        break
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

