import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { applyParcelStatusUpdate } from '@/lib/sync-order-statuses'
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

    // Sendcloud signs each payload with HMAC-SHA256 using EITHER the
    // dedicated "Webhook Signature Key" or the API "Secret Key", depending
    // on the integration type (per https://sendcloud.dev/api/v3/webhooks).
    // We accept BOTH so a key rotation or integration-type switch on the
    // Sendcloud side does not silently break status sync. The polling cron
    // in /api/sendcloud-sync-statuses is the second safety net.
    const candidateSecrets = [
      process.env.SENDCLOUD_WEBHOOK_SECRET,
      process.env.SENDCLOUD_SECRET_KEY,
    ].filter((s): s is string => Boolean(s && s.trim()))

    if (candidateSecrets.length === 0) {
      console.error(
        '[Sendcloud Webhook] No HMAC secret configured (SENDCLOUD_WEBHOOK_SECRET / SENDCLOUD_SECRET_KEY both missing)'
      )
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    if (!signature) {
      console.error('[Sendcloud Webhook] Missing sendcloud-signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    const sigBuf = (() => {
      try {
        return Buffer.from(signature, 'hex')
      } catch {
        return null
      }
    })()

    const matched = sigBuf
      ? candidateSecrets.some((secret) => {
          const digest = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest()
          // timingSafeEqual throws on length mismatch; guard explicitly.
          if (digest.length !== sigBuf.length) return false
          try {
            return crypto.timingSafeEqual(digest, sigBuf)
          } catch {
            return false
          }
        })
      : false

    if (!matched) {
      console.error(
        `[Sendcloud Webhook] Invalid signature (head=${signature.slice(0, 8)}…, secrets_tried=${candidateSecrets.length})`
      )
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
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
    console.error(
      `[Sendcloud Webhook] Order not found: ${orderNumberOrReturnId}`,
      orderError?.message
    )
    return
  }

  // Delegate to the shared sync helper — same business rules as the
  // polling cron (idempotent delivered-mail, downgrade-protection,
  // shipped_at/delivered_at stamps, atomic Trustpilot claim).
  // The select('*, order_items(*)') above returns the full row; we cast
  // through `unknown` because the SDK's typed Row doesn't include the
  // joined order_items array.
  const result = await applyParcelStatusUpdate(
    supabase,
    order as unknown as Parameters<typeof applyParcelStatusUpdate>[1],
    parcel
  )

  if (result.error) {
    console.error(
      `[Sendcloud Webhook] applyParcelStatusUpdate failed for ${orderNumberOrReturnId.slice(0, 8)}: ${result.error}`
    )
    return
  }

  if (!result.changed) {
    console.log(
      `[Sendcloud Webhook] Order ${orderNumberOrReturnId.slice(0, 8)} no-op (${result.reason || 'unchanged'}) status=${result.oldStatus}`
    )
  } else {
    console.log(
      `[Sendcloud Webhook] Order ${orderNumberOrReturnId.slice(0, 8)} ${result.oldStatus} → ${result.newStatus}${result.emailSent ? ' (delivered email sent)' : ''}`
    )
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

  if (orderId.startsWith('RETURN-')) {
    // Returns volgen hun eigen lifecycle (handleReturnStatusChange).
    return
  }

  const supabase = getSupabase()

  // Lees de huidige order zodat we shipped_at niet platslaan als die al gezet is.
  const { data: existing } = await supabase
    .from('orders')
    .select('id, shipped_at')
    .eq('id', orderId)
    .maybeSingle<{ id: string; shipped_at: string | null }>()

  const nowIso = new Date().toISOString()
  const update: Record<string, unknown> = {
    tracking_code: parcel.tracking_number,
    tracking_url: parcel.tracking_url,
    carrier: parcel.carrier.name,
    status: 'shipped',
    updated_at: nowIso,
  }
  if (existing && !existing.shipped_at) {
    update.shipped_at = nowIso
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update(update)
    .eq('id', orderId)

  if (updateError) {
    console.error(`[Sendcloud Webhook] Failed to add tracking to order ${orderId.slice(0, 8)}:`, updateError.message)
    return
  }

  console.log(`[Sendcloud Webhook] Tracking added to order ${orderId.slice(0, 8)}: ${parcel.tracking_number}`)
}

