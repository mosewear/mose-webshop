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
    console.log('📊 API: Order status:', {
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      email: order.email,
      last_email_sent_at: order.last_email_sent_at
    })

    // Send order confirmation email if not sent yet
    // Check if email should be sent (only once per order)
    // Use payment_status (not stripe_payment_status which doesn't exist!)
    // Also check if email was already sent via last_email_sent_at
    const shouldSendEmail = (order.payment_status === 'pending' || !order.payment_status) && !order.last_email_sent_at
    
    if (shouldSendEmail) {
      console.log('📧 API: Attempting to send order confirmation email...')
      
      try {
        const emailResult = await sendOrderConfirmationEmail({
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
          },
          locale: order.locale || 'nl', // Pass locale for multi-language emails
        })
        
        console.log('📧 API: Email result:', emailResult)
        
        if (emailResult.success) {
          console.log('✅ API: Order confirmation email sent successfully!')
          
          // Mark email as sent by updating last_email_sent_at and last_email_type
          await supabase
            .from('orders')
            .update({ 
              last_email_sent_at: new Date().toISOString(),
              last_email_type: 'order_confirmation'
            })
            .eq('id', order.id)
            
          console.log('✅ API: Order email timestamp updated')
        } else {
          console.error('❌ API: Email send failed:', emailResult.error)
          // Don't update status if email failed
        }
          
      } catch (emailError) {
        console.error('❌ API: Exception sending email:', emailError)
        // Don't fail the request if email fails, but log it
      }
    } else {
      console.log('ℹ️ API: Email already sent for this order')
      console.log('   Payment status:', order.payment_status)
      console.log('   Last email sent at:', order.last_email_sent_at)
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

