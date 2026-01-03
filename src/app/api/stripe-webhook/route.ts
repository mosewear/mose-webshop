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
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Update order with payment success
        const supabase = await createClient()
        const orderId = session.metadata?.orderId

        if (orderId) {
          const { data: order, error } = await supabase
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
            if (order && session.customer_email) {
              try {
                const shippingAddress = order.shipping_address as any
                
                await sendOrderConfirmationEmail({
                  customerName: shippingAddress?.name || session.metadata?.customerName || 'Klant',
                  customerEmail: session.customer_email,
                  orderId: order.id,
                  orderTotal: order.total,
                  orderItems: order.order_items.map((item: any) => ({
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
                console.log('✅ Order confirmation email sent')
              } catch (emailError) {
                console.error('❌ Error sending confirmation email:', emailError)
                // Don't fail the webhook if email fails
              }
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

