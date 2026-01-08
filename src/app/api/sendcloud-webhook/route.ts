import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapSendcloudStatus } from '@/lib/sendcloud'
import { sendOrderDeliveredEmail } from '@/lib/email'
import { logEmail } from '@/lib/email-logger'
import { updateOrderStatusForReturn } from '@/lib/update-order-status'

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
  const orderNumberOrReturnId = parcel.order_number // Kan order ID of RETURN-XXX zijn

  if (!orderNumberOrReturnId) {
    console.error('No order_number in webhook payload')
    return
  }

  const supabase = await createClient()

  // Check of het een return is (order_number begint met RETURN-)
  if (orderNumberOrReturnId.startsWith('RETURN-')) {
    console.log('📦 Return tracking update detected:', orderNumberOrReturnId)
    await handleReturnStatusChange(payload, supabase)
    return
  }

  // Normale order handling
  // Haal order op
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderNumberOrReturnId)
    .single()

  if (orderError || !order) {
    console.error('Order not found:', orderNumberOrReturnId, orderError)
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
    .eq('id', orderNumberOrReturnId)

  if (updateError) {
    console.error('Error updating order:', updateError)
    return
  }

  console.log(`Order ${orderNumberOrReturnId} status updated: ${oldStatus} -> ${newStatus}`)

  // Als status delivered is, stuur delivered email
  if (newStatus === 'delivered' && oldStatus !== 'delivered') {
    await sendDeliveredEmailForOrder(order)
  }
}

/**
 * Handle return parcel status change
 */
async function handleReturnStatusChange(payload: SendcloudWebhookPayload, supabase: any) {
  const { parcel } = payload
  const orderNumber = parcel.order_number // RETURN-XXXXXXXX
  
  console.log('🔍 Looking for return with order_number:', orderNumber)

  // Haal return op via tracking code of order_number matching
  const { data: returnRecord, error: returnError } = await supabase
    .from('returns')
    .select('*, orders!inner(id, email)')
    .eq('return_tracking_code', parcel.tracking_number)
    .maybeSingle()

  if (returnError) {
    console.error('Error fetching return:', returnError)
    return
  }

  if (!returnRecord) {
    console.warn('No return found for tracking:', parcel.tracking_number)
    return
  }

  console.log(`📦 Found return ${returnRecord.id}, current status: ${returnRecord.status}`)

  // Map Sendcloud status naar return status
  const sendcloudStatusId = parcel.status.id
  let newReturnStatus = returnRecord.status

  // Sendcloud status mapping voor returns:
  // 11 = In transit to carrier
  // 13 = Delivered to carrier (dropoff)
  // 80 = In transit
  // 91 = Delivered
  
  if ([11, 13, 80].includes(sendcloudStatusId)) {
    newReturnStatus = 'return_in_transit'
  } else if (sendcloudStatusId === 91) {
    // Delivered betekent voor een return: bij ons ontvangen!
    // We updaten niet automatisch naar received - admin moet dit bevestigen
    console.log('🎉 Return delivered! Admin moet ontvangst nog bevestigen.')
    // Status blijft op return_in_transit - admin moet handmatig confirm doen
    newReturnStatus = 'return_in_transit'
  }

  // Update return met tracking info
  const { error: updateError } = await supabase
    .from('returns')
    .update({
      status: newReturnStatus,
      return_tracking_url: parcel.tracking_url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', returnRecord.id)

  if (updateError) {
    console.error('Error updating return:', updateError)
    return
  }

  console.log(`✅ Return ${returnRecord.id} status updated to: ${newReturnStatus}`)

  // Update order status
  try {
    await updateOrderStatusForReturn(returnRecord.order_id, newReturnStatus)
  } catch (error) {
    console.error('Error updating order status for return:', error)
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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'

    const orderItems = order.order_items.map((item: any) => ({
      product_id: item.product_id || '',
      product_name: item.product_name,
      image_url: item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${siteUrl}${item.image_url.startsWith('/') ? item.image_url : '/' + item.image_url}`) : '',
    }))

    const result = await sendOrderDeliveredEmail({
      customerName,
      customerEmail,
      orderId: order.id,
      orderItems: orderItems,
      shippingAddress: order.shipping_address,
      deliveryDate: new Date().toISOString(),
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

