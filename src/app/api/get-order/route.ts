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
    // SIMPLE: If last_email_sent_at is null, email was NOT sent yet
    // Don't check payment_status - if webhook set it to 'paid' but didn't send email, fallback must send it!
    const shouldSendEmail = !order.last_email_sent_at
    
    console.log('📧 API: Should send email?', shouldSendEmail)
    console.log('📧 API: Reason:', shouldSendEmail ? 'last_email_sent_at is NULL' : 'email already sent previously')
    
    if (shouldSendEmail) {
      console.log('═══════════════════════════════════════════')
      console.log('📧 API: ATTEMPTING TO SEND EMAIL')
      console.log('═══════════════════════════════════════════')
      console.log('📧 API: Recipient:', order.email)
      console.log('📧 API: Order ID:', order.id)
      console.log('📧 API: Order Total: €', order.total)
      console.log('📧 API: Locale:', order.locale || 'nl')
      
      // Get site URL for image URLs
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
      
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
            imageUrl: item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${siteUrl}${item.image_url}`) : '',  // IMAGE FIX: Absolute URL
            isPresale: item.is_presale || false,  // PRESALE: Pass presale status
            presaleExpectedDate: item.presale_expected_date || undefined,  // PRESALE: Expected date
          })) || [],
          shippingAddress: {
            name: order.shipping_address.name,
            address: order.shipping_address.address,
            city: order.shipping_address.city,
            postalCode: order.shipping_address.postalCode,
          },
          promoCode: order.promo_code || undefined,
          discountAmount: order.discount_amount || 0,
          locale: order.locale || 'nl', // Pass locale for multi-language emails
        })
        
        console.log('📧 API: Email function returned:', emailResult)
        
        if (emailResult.success) {
          console.log('✅ API: Order confirmation email sent successfully!')
          console.log('✅ API: Resend Email ID:', emailResult.data)
          
          // Mark email as sent by updating last_email_sent_at and last_email_type
          const updateResult = await supabase
            .from('orders')
            .update({ 
              last_email_sent_at: new Date().toISOString(),
              last_email_type: 'order_confirmation'
            })
            .eq('id', order.id)
            
          console.log('✅ API: Order email timestamp updated:', updateResult.error ? 'FAILED' : 'SUCCESS')
          if (updateResult.error) {
            console.error('❌ API: Failed to update timestamp:', updateResult.error)
          }
          console.log('═══════════════════════════════════════════')
        } else {
          console.error('❌ API: Email send failed!')
          console.error('❌ API: Error details:', emailResult.error)
          console.error('═══════════════════════════════════════════')
          // Don't update status if email failed
        }
          
      } catch (emailError: any) {
        console.error('═══════════════════════════════════════════')
        console.error('❌ API: Exception sending email!')
        console.error('═══════════════════════════════════════════')
        console.error('❌ API: Error:', emailError)
        console.error('❌ API: Error message:', emailError.message)
        console.error('❌ API: Error stack:', emailError.stack)
        console.error('═══════════════════════════════════════════')
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

