import { NextRequest, NextResponse } from 'next/server'
import { sendShippingConfirmationEmail } from '@/lib/email'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * POST /api/send-shipping-email
 *
 * Admin-only resend of the shipping confirmation for an order that
 * already has a tracking code. `sendShippingConfirmationEmail` already
 * logs to `order_emails` via sendAndLog — do not double-log here.
 */
export async function POST(req: NextRequest) {
  try {
    const { authorized } = await requireAdmin(['admin', 'manager'])
    if (!authorized) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })
    }

    const { orderId } = await req.json()

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
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

    if (order.delivery_method === 'pickup') {
      return NextResponse.json(
        { error: 'Order is pickup; shipping email is not applicable' },
        { status: 400 }
      )
    }

    if (!order.tracking_code) {
      return NextResponse.json(
        { error: 'Order has no tracking code' },
        { status: 400 }
      )
    }

    const shippingAddress = order.shipping_address as {
      name?: string
    } | null

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
      locale: order.locale || 'nl',
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      )
    }

    // Keep the denormalised last-email columns in sync for the order UI.
    await supabase
      .from('orders')
      .update({
        last_email_sent_at: new Date().toISOString(),
        last_email_type: 'shipped',
      })
      .eq('id', order.id)

    return NextResponse.json({ success: true, data: result.data })
  } catch (error: unknown) {
    console.error('Error sending shipping email:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
