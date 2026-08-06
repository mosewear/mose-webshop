import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendOrderConfirmationEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('order_id')
    const paymentId =
      searchParams.get('payment') ||
      searchParams.get('payment_intent') ||
      searchParams.get('mollie_payment_id')

    if (!orderId && !paymentId) {
      return NextResponse.json(
        { error: 'order_id or payment required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    let order
    let orderError

    if (orderId && paymentId) {
      // Both provided: verify they match via Mollie or legacy Stripe column
      const result = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .or(
          `mollie_payment_id.eq.${paymentId},stripe_payment_intent_id.eq.${paymentId}`
        )
        .single()
      order = result.data
      orderError = result.error
    } else if (paymentId) {
      const result = await supabase
        .from('orders')
        .select('*')
        .or(
          `mollie_payment_id.eq.${paymentId},stripe_payment_intent_id.eq.${paymentId}`
        )
        .single()
      order = result.data
      orderError = result.error
    } else if (orderId) {
      // With payment proof absent: allow paid orders (post-Mollie redirect)
      // and unpaid/pending (abandoned cart recovery).
      const result = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .in('payment_status', ['pending', 'unpaid', 'paid'])
        .single()
      order = result.data
      orderError = result.error
    }

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)

    if (itemsError) {
      console.error('[get-order] Error fetching items:', itemsError.message)
    }

    // Send order confirmation email if not sent yet
    const shouldSendEmail = !order.last_email_sent_at
    
    if (shouldSendEmail) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mosewear.com'
      
      try {
        const emailResult = await sendOrderConfirmationEmail({
          customerName: order.shipping_address.name,
          customerEmail: order.email,
          orderId: order.id,
          orderTotal: order.total,
          subtotal: order.subtotal,
          shippingCost: order.shipping_cost,
          orderItems: items?.map((item: any) => ({
            name: item.product_name,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            price: item.price_at_purchase,
            imageUrl: item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${siteUrl}${item.image_url}`) : '',
            isPresale: item.is_presale || false,
            presaleExpectedDate: item.presale_expected_date || undefined,
          })) || [],
          shippingAddress: {
            name: order.shipping_address.name,
            address: order.shipping_address.address,
            city: order.shipping_address.city,
            postalCode: order.shipping_address.postalCode,
          },
          promoCode: order.promo_code || undefined,
          discountAmount: order.discount_amount || 0,
          locale: order.locale || 'nl',
        })
        
        if (emailResult.success) {
          await supabase
            .from('orders')
            .update({ 
              last_email_sent_at: new Date().toISOString(),
              last_email_type: 'order_confirmation'
            })
            .eq('id', order.id)
        } else {
          console.error('[get-order] Email send failed:', emailResult.error)
        }
          
      } catch (emailError: any) {
        console.error('[get-order] Exception sending email:', emailError.message)
      }
    }

    return NextResponse.json({
      order,
      items: items || []
    })
  } catch (error: any) {
    console.error('[get-order] Error:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

