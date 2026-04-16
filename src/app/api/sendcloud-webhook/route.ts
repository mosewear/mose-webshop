import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { mapSendcloudStatus } from '@/lib/sendcloud'
import { sendOrderDeliveredEmail } from '@/lib/email'
import { logEmail } from '@/lib/email-logger'
import { updateOrderStatusForReturn } from '@/lib/update-order-status'
import crypto from 'crypto'

/**
 * Sendcloud Webhook Handler
 * 
 * Receives parcel status updates from Sendcloud and syncs them to our orders.
 * Uses service role client to bypass RLS (external server-to-server call, no user session).
 */

interface SendcloudWebhookPayload {
  action: string
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

function getSupabase() {
  return createServiceRoleClient()
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    let payload: SendcloudWebhookPayload

    try {
      payload = JSON.parse(rawBody)
    } catch {
      console.error('[Sendcloud Webhook] Invalid JSON body')
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const signature = req.headers.get('sendcloud-signature')
    const webhookSecret = process.env.SENDCLOUD_WEBHOOK_SECRET

    if (webhookSecret && signature) {
      const hmac = crypto.createHmac('sha256', webhookSecret)
      const digest = hmac.update(rawBody).digest('hex')
      if (digest !== signature) {
        console.error('[Sendcloud Webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    console.log(`[Sendcloud Webhook] ${payload.action} | tracking=${payload.parcel.tracking_number} | status=${payload.parcel.status.id} (${payload.parcel.status.message}) | order=${payload.parcel.order_number}`)

    switch (payload.action) {
      case 'parcel_status_changed':
        await handleStatusChange(payload)
        break
      case 'parcel_created':
        await handleParcelCreated(payload)
        break
      default:
        console.log(`[Sendcloud Webhook] Unhandled action: ${payload.action}`)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Sendcloud Webhook] Unhandled error:', error?.message || error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleStatusChange(payload: SendcloudWebhookPayload) {
  const { parcel } = payload
  const orderNumberOrReturnId = parcel.order_number

  if (!orderNumberOrReturnId) {
    console.error('[Sendcloud Webhook] No order_number in payload')
    return
  }

  if (orderNumberOrReturnId.startsWith('RETURN-')) {
    await handleReturnStatusChange(payload)
    return
  }

  const supabase = getSupabase()

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderNumberOrReturnId)
    .single()

  if (orderError || !order) {
    console.error(`[Sendcloud Webhook] Order not found: ${orderNumberOrReturnId}`, orderError?.message)
    return
  }

  const newStatus = mapSendcloudStatus(parcel.status.id)
  const oldStatus = order.status

  if (oldStatus === newStatus) {
    console.log(`[Sendcloud Webhook] Order ${orderNumberOrReturnId.slice(0, 8)} status unchanged (${oldStatus})`)
    return
  }

  // Don't downgrade delivered orders back to shipped
  if (oldStatus === 'delivered' && newStatus === 'shipped') {
    console.log(`[Sendcloud Webhook] Skipping downgrade from delivered to shipped for ${orderNumberOrReturnId.slice(0, 8)}`)
    return
  }

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
    console.error(`[Sendcloud Webhook] Failed to update order ${orderNumberOrReturnId.slice(0, 8)}:`, updateError.message)
    return
  }

  console.log(`[Sendcloud Webhook] Order ${orderNumberOrReturnId.slice(0, 8)}: ${oldStatus} → ${newStatus}`)

  if (newStatus === 'delivered' && oldStatus !== 'delivered') {
    await sendDeliveredEmailForOrder(order)
  }
}

async function handleReturnStatusChange(payload: SendcloudWebhookPayload) {
  const { parcel } = payload
  const supabase = getSupabase()

  const { data: returnRecord, error: returnError } = await supabase
    .from('returns')
    .select('*, orders!inner(id, email)')
    .eq('return_tracking_code', parcel.tracking_number)
    .maybeSingle()

  if (returnError) {
    console.error('[Sendcloud Webhook] Error fetching return:', returnError.message)
    return
  }

  if (!returnRecord) {
    console.warn(`[Sendcloud Webhook] No return found for tracking: ${parcel.tracking_number}`)
    return
  }

  const sendcloudStatusId = parcel.status.id
  let newReturnStatus = returnRecord.status

  // Sendcloud status IDs for return tracking:
  // 3 = En route to sorting center
  // 22 = Shipment picked up by driver
  // 91 = Parcel en route
  // 92 = Driver en route
  // 11 = Delivered
  // 93 = Shipment collected by customer
  if ([3, 5, 7, 22, 91, 92].includes(sendcloudStatusId)) {
    newReturnStatus = 'return_in_transit'
  } else if ([11, 93].includes(sendcloudStatusId)) {
    newReturnStatus = 'return_in_transit'
    console.log(`[Sendcloud Webhook] Return ${returnRecord.id.slice(0, 8)} delivered — admin must confirm receipt`)
  }

  const { error: updateError } = await supabase
    .from('returns')
    .update({
      status: newReturnStatus,
      return_tracking_url: parcel.tracking_url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', returnRecord.id)

  if (updateError) {
    console.error(`[Sendcloud Webhook] Failed to update return ${returnRecord.id.slice(0, 8)}:`, updateError.message)
    return
  }

  console.log(`[Sendcloud Webhook] Return ${returnRecord.id.slice(0, 8)}: → ${newReturnStatus}`)

  try {
    await updateOrderStatusForReturn(returnRecord.order_id, newReturnStatus)
  } catch (error: any) {
    console.error('[Sendcloud Webhook] Error updating order status for return:', error?.message)
  }
}

async function handleParcelCreated(payload: SendcloudWebhookPayload) {
  const { parcel } = payload
  const orderId = parcel.order_number

  if (!orderId) {
    console.error('[Sendcloud Webhook] No order_number in parcel_created payload')
    return
  }

  const supabase = getSupabase()

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
    console.error(`[Sendcloud Webhook] Failed to add tracking to order ${orderId.slice(0, 8)}:`, updateError.message)
    return
  }

  console.log(`[Sendcloud Webhook] Tracking added to order ${orderId.slice(0, 8)}: ${parcel.tracking_number}`)
}

async function sendDeliveredEmailForOrder(order: any) {
  try {
    const customerName = (order.shipping_address as any)?.name || 'Klant'
    const customerEmail = order.email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'

    const orderItems = (order.order_items || []).map((item: any) => ({
      product_id: item.product_id || '',
      product_name: item.product_name,
      image_url: item.image_url
        ? (item.image_url.startsWith('http') ? item.image_url : `${siteUrl}${item.image_url.startsWith('/') ? item.image_url : '/' + item.image_url}`)
        : '',
    }))

    const result = await sendOrderDeliveredEmail({
      customerName,
      customerEmail,
      orderId: order.id,
      orderItems,
      shippingAddress: order.shipping_address,
      deliveryDate: new Date().toISOString(),
    })

    if (result.success) {
      await logEmail({
        orderId: order.id,
        emailType: 'delivered',
        recipientEmail: customerEmail,
        subject: 'Je MOSE pakket is aangekomen!',
        status: 'sent',
      })

      const supabase = getSupabase()
      await supabase
        .from('orders')
        .update({
          last_email_sent_at: new Date().toISOString(),
          last_email_type: 'delivered',
        })
        .eq('id', order.id)

      console.log(`[Sendcloud Webhook] Delivered email sent for order ${order.id.slice(0, 8)}`)
    } else {
      console.error(`[Sendcloud Webhook] Failed to send delivered email for order ${order.id.slice(0, 8)}`)
    }
  } catch (error: any) {
    console.error(`[Sendcloud Webhook] Error sending delivered email:`, error?.message)
  }
}
