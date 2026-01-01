import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { sendOrderConfirmationEmail } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore - Using stable API version
  apiVersion: '2024-12-18.acacia' as any,
})

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
        
        // Update order status in Supabase
        const supabase = await createClient()
        const orderId = session.metadata?.orderId

        if (orderId) {
          const { data: order, error } = await supabase
            .from('orders')
            .update({
              stripe_payment_status: 'paid',
              status: 'processing',
              stripe_payment_intent_id: session.payment_intent as string,
            })
            .eq('id', orderId)
            .select('*, order_items(*)')
            .single()

          if (error) {
            console.error('Error updating order:', error)
          } else {
            console.log(`✅ Order ${orderId} marked as paid`)
            
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
                console.error('Error sending confirmation email:', emailError)
                // Don't fail the webhook if email fails
              }
            }
          }
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.error('❌ Payment failed:', paymentIntent.id)
        // TODO: Send email to customer about failed payment
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
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

