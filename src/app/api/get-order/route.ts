import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendOrderConfirmationEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('order_id')
    const paymentIntentId = searchParams.get('payment_intent')

    if (!orderId && !paymentIntentId) {
      return NextResponse.json(
        { error: 'order_id or payment_intent required' },
        { status: 400 }
      )
    }

    // Use service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    let order
    let orderError

    if (orderId) {
      console.log('🔍 API: Fetching order by ID:', orderId)
      const result = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()
      
      order = result.data
      orderError = result.error
    } else if (paymentIntentId) {
      console.log('🔍 API: Fetching order by payment_intent:', paymentIntentId)
      const result = await supabase
        .from('orders')
        .select('*')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single()
      
      order = result.data
      orderError = result.error
    }

    if (orderError || !order) {
      console.error('❌ API: Order not found:', orderError)
      return NextResponse.json(
        { error: 'Order not found', details: orderError },
        { status: 404 }
      )
    }

    // Fetch order items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)

    if (itemsError) {
      console.error('❌ API: Error fetching items:', itemsError)
    }

    console.log('✅ API: Order found:', order.id)

    // Send order confirmation email if not sent yet
    // Only send on first retrieval (when coming from Stripe redirect)
    if (paymentIntentId && order.stripe_payment_status === 'pending') {
      console.log('📧 Sending order confirmation email...')
      
      try {
        await sendOrderConfirmationEmail({
          customerName: order.shipping_address.name,
          customerEmail: order.email,
          orderId: order.id,
          orderTotal: order.total,
          orderItems: items?.map((item: any) => ({
            name: item.product_name,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            price: item.price_at_purchase,
          })) || [],
          shippingAddress: {
            name: order.shipping_address.name,
            address: order.shipping_address.address,
            city: order.shipping_address.city,
            postalCode: order.shipping_address.postalCode,
          }
        })
        
        console.log('✅ Order confirmation email sent!')
        
        // Mark email as sent by updating stripe_payment_status
        await supabase
          .from('orders')
          .update({ stripe_payment_status: 'succeeded' })
          .eq('id', order.id)
          
      } catch (emailError) {
        console.error('❌ Failed to send email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      order,
      items: items || []
    })
  } catch (error: any) {
    console.error('❌ API: Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

