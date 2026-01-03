import { NextRequest, NextResponse } from 'next/server'
import { sendShippingConfirmationEmail } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'
import { logEmailSent } from '@/lib/email-logger'

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json()

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Get order details from Supabase
    const supabase = await createClient()
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (!order.tracking_code) {
      return NextResponse.json(
        { error: 'Order has no tracking code' },
        { status: 400 }
      )
    }

    const shippingAddress = order.shipping_address as any

    // Send shipping confirmation email
    const result = await sendShippingConfirmationEmail({
      customerEmail: order.email,
      customerName: shippingAddress?.name || 'Klant',
      orderId: order.id,
      trackingCode: order.tracking_code,
      trackingUrl: order.tracking_url || undefined,
      carrier: order.carrier || undefined,
      estimatedDelivery: order.estimated_delivery_date
        ? new Date(order.estimated_delivery_date).toLocaleDateString('nl-NL')
        : undefined,
    })

    // Log email to database
    await logEmailSent({
      orderId: order.id,
      emailType: 'shipped',
      recipientEmail: order.email,
      subject: `Je bestelling is verzonden #${order.id.slice(0, 8).toUpperCase()}`,
      status: result.success ? 'sent' : 'failed',
      errorMessage: result.error ? JSON.stringify(result.error) : undefined,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error: any) {
    console.error('Error sending shipping email:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


