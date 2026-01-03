import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapSendcloudStatus } from '@/lib/sendcloud'
import { sendOrderDeliveredEmail } from '@/lib/email'
import { logEmail } from '@/lib/email-logger'

/**
 * Sendcloud Webhook Handler
 * 
 * Documentatie: https://docs.sendcloud.sc/api/v2/webhooks/
 * 
 * Sendcloud stuurt webhook events bij status updates van parcels.
 * We gebruiken dit om automatisch de order status te updaten en emails te sturen.
 */

interface SendcloudWebhookPayload {
  action: string // 'parcel_status_changed', 'parcel_created', etc.
  timestamp: number
  parcel: {
    id: number
    tracking_number: string
    tracking_url: string
    status: {
      id: number
      message: string
    }
    carrier: {
      code: string
      name: string
    }
    order_number: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload: SendcloudWebhookPayload = await req.json()

    // Verify webhook signature (optional maar aangeraden)
    const signature = req.headers.get('sendcloud-signature')
    const webhookSecret = process.env.SENDCLOUD_WEBHOOK_SECRET

    if (webhookSecret && signature) {
      // Verifieer signature
      const isValid = verifyWebhookSignature(
        JSON.stringify(payload),
        signature,
        webhookSecret
      )

      if (!isValid) {
        console.error('Invalid Sendcloud webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    console.log('Sendcloud webhook received:', payload.action, payload.parcel.tracking_number)

    // Handle verschillende webhook events
    switch (payload.action) {
      case 'parcel_status_changed':
        await handleStatusChange(payload)
        break
      case 'parcel_created':
        await handleParcelCreated(payload)
        break
      default:
        console.log('Unhandled Sendcloud webhook action:', payload.action)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error handling Sendcloud webhook:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Handle parcel status change
 */
async function handleStatusChange(payload: SendcloudWebhookPayload) {
  const { parcel } = payload
  const orderId = parcel.order_number // We gebruiken order ID als order_number

  if (!orderId) {
    console.error('No order_number in webhook payload')
    return
  }

  const supabase = await createClient()

  // Haal order op
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    console.error('Order not found:', orderId, orderError)
    return
  }

  // Map Sendcloud status naar onze status
  const newStatus = mapSendcloudStatus(parcel.status.id)
  const oldStatus = order.status

  // Update order met nieuwe tracking info en status
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      tracking_code: parcel.tracking_number,
      tracking_url: parcel.tracking_url,
      carrier: parcel.carrier.name,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (updateError) {
    console.error('Error updating order:', updateError)
    return
  }

  console.log(`Order ${orderId} status updated: ${oldStatus} -> ${newStatus}`)

  // Als status delivered is, stuur delivered email
  if (newStatus === 'delivered' && oldStatus !== 'delivered') {
    await sendDeliveredEmailForOrder(order)
  }
}

/**
 * Handle parcel created (tracking code toegevoegd)
 */
async function handleParcelCreated(payload: SendcloudWebhookPayload) {
  const { parcel } = payload
  const orderId = parcel.order_number

  if (!orderId) {
    console.error('No order_number in webhook payload')
    return
  }

  const supabase = await createClient()

  // Update order met tracking info
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      tracking_code: parcel.tracking_number,
      tracking_url: parcel.tracking_url,
      carrier: parcel.carrier.name,
      status: 'shipped',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (updateError) {
    console.error('Error updating order with tracking:', updateError)
    return
  }

  console.log(`Tracking added to order ${orderId}: ${parcel.tracking_number}`)
}

/**
 * Stuur delivered email
 */
async function sendDeliveredEmailForOrder(order: any) {
  try {
    const customerName = (order.shipping_address as any)?.name || 'Klant'
    const customerEmail = order.email

    const orderItems = order.order_items.map((item: any) => ({
      name: item.product_name,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      price: item.price_at_purchase,
      imageUrl: item.image_url,
    }))

    const shippingAddress = order.shipping_address as any

    const result = await sendOrderDeliveredEmail({
      customerName,
      customerEmail,
      orderId: order.id,
      orderTotal: order.total,
      orderItems,
      shippingAddress,
      deliveryDate: new Date().toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    })

    if (result.success) {
      await logEmail({
        orderId: order.id,
        emailType: 'delivered',
        recipientEmail: customerEmail,
        subject: `Je MOSE pakket is aangekomen! 🎉`,
        status: 'sent',
      })

      // Update last_email_sent_at
      const supabase = await createClient()
      await supabase
        .from('orders')
        .update({
          last_email_sent_at: new Date().toISOString(),
          last_email_type: 'delivered',
        })
        .eq('id', order.id)

      console.log(`Delivered email sent for order ${order.id}`)
    }
  } catch (error) {
    console.error('Error sending delivered email:', error)
  }
}

/**
 * Verify webhook signature (security)
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const crypto = require('crypto')
    const hmac = crypto.createHmac('sha256', secret)
    const digest = hmac.update(payload).digest('hex')
    return digest === signature
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}

