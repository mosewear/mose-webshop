/**
 * Sendcloud status-sync helpers.
 *
 * Why this file exists:
 *  De `/api/sendcloud-webhook` route is onze primaire kanaal voor
 *  parcel-status updates. Maar de webhook kan om allerlei redenen
 *  (foute signature-secret, Sendcloud die de webhook tijdelijk uit-
 *  schakelt, intermitterende 5xx's bij ons, herrouting van een domain)
 *  STIL falen — orders blijven dan voor altijd op `shipped` hangen,
 *  geen delivered-mail naar de klant, geen Trustpilot trigger.
 *
 *  Deze module geeft ons een **polling fallback**: een cron (en een
 *  admin-knop) die voor alle openstaande orders met een `tracking_code`
 *  rechtstreeks de actuele status bij Sendcloud opvraagt en lokaal
 *  toepast. Hetzelfde stuk business-logic (`applyParcelStatusUpdate`)
 *  wordt door zowel de webhook als de cron gebruikt zodat we maar één
 *  bron-van-waarheid hebben.
 *
 *  Server-only: dit bestand mag NOOIT in een Client Component belanden
 *  (gebruikt service-role + Sendcloud API keys).
 */

import 'server-only'

import {
  getParcelByTrackingNumber,
  isSendcloudConfigured,
  mapSendcloudStatus,
  type SendcloudParcel,
} from '@/lib/sendcloud'
import { sendOrderDeliveredEmail } from '@/lib/email'
import { logEmail } from '@/lib/email-logger'
import { createServiceRoleClient } from '@/lib/supabase/server'

type SupabaseClient = ReturnType<typeof createServiceRoleClient>

interface OrderRow {
  id: string
  status: string
  email: string
  locale?: string | null
  tracking_code: string | null
  tracking_url: string | null
  carrier: string | null
  shipped_at: string | null
  delivered_at: string | null
  paid_at?: string | null
  shipping_address: Record<string, unknown> | null
  review_invitation_sent_at?: string | null
  order_items?: Array<{
    id?: string
    product_id?: string | null
    product_name: string
    image_url?: string | null
  }>
}

export interface ApplyResult {
  orderId: string
  changed: boolean
  oldStatus: string
  newStatus: string
  /** "delivered" als we een delivered-email triggerden, anders undefined. */
  emailSent?: 'delivered' | null
  reason?: string
  error?: string
}

/**
 * Pas een Sendcloud parcel-status update toe op één order.
 *
 * Bevat alle business-rules die ook in de webhook gelden:
 *  - Stuur geen update als de status onveranderd is
 *  - Downgrade `delivered` → `shipped` is verboden (race tussen carrier
 *    "out for delivery" en "delivered" updates)
 *  - Stamp `shipped_at` / `delivered_at` op de eerste transitie
 *  - Update tracking_code/url/carrier als die nog niet bekend zijn
 *  - Stuur delivered-mail (incl. atomic Trustpilot-claim) bij overgang
 *    naar `delivered`
 */
export async function applyParcelStatusUpdate(
  supabase: SupabaseClient,
  order: OrderRow,
  parcel: Pick<
    SendcloudParcel,
    'tracking_number' | 'tracking_url' | 'carrier' | 'status'
  >
): Promise<ApplyResult> {
  const newStatus = mapSendcloudStatus(parcel.status.id)
  const oldStatus = order.status
  const orderShort = order.id.slice(0, 8)

  if (oldStatus === newStatus) {
    return {
      orderId: order.id,
      changed: false,
      oldStatus,
      newStatus,
      reason: 'unchanged',
    }
  }

  if (oldStatus === 'delivered' && newStatus === 'shipped') {
    return {
      orderId: order.id,
      changed: false,
      oldStatus,
      newStatus,
      reason: 'skip-downgrade',
    }
  }

  const nowIso = new Date().toISOString()
  const update: Record<string, unknown> = {
    status: newStatus,
    updated_at: nowIso,
  }

  // Tracking-velden alleen overschrijven als Sendcloud iets stuurt; niet
  // null-en als het veld in de payload leeg is.
  if (parcel.tracking_number) update.tracking_code = parcel.tracking_number
  if (parcel.tracking_url) update.tracking_url = parcel.tracking_url
  if (parcel.carrier?.name) update.carrier = parcel.carrier.name

  if (newStatus === 'shipped' && !order.shipped_at) {
    update.shipped_at = nowIso
  }
  if (newStatus === 'delivered' && !order.delivered_at) {
    update.delivered_at = nowIso
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update(update)
    .eq('id', order.id)

  if (updateError) {
    console.error(
      `[Sendcloud Sync] Failed to update order ${orderShort}:`,
      updateError.message
    )
    return {
      orderId: order.id,
      changed: false,
      oldStatus,
      newStatus,
      error: updateError.message,
    }
  }

  console.log(
    `[Sendcloud Sync] Order ${orderShort}: ${oldStatus} → ${newStatus} (status_id=${parcel.status.id})`
  )

  let emailSent: ApplyResult['emailSent']
  if (newStatus === 'delivered' && oldStatus !== 'delivered') {
    const sent = await sendDeliveredEmailIfNeeded(supabase, {
      ...order,
      delivered_at: order.delivered_at || nowIso,
      status: 'delivered',
    })
    emailSent = sent ? 'delivered' : null
  }

  return {
    orderId: order.id,
    changed: true,
    oldStatus,
    newStatus,
    emailSent,
  }
}

/**
 * Verstuur de delivered-mail als die nog nooit verstuurd is.
 *
 * Idempotency: identiek aan de webhook — eerst `review_invitation_sent_at`
 * checken, en daarna ATOMISCH claimen via `.is(..., null)` zodat een
 * parallelle webhook-retry óf een gelijktijdige cron-run niet kunnen
 * dubbel-firen naar Trustpilot. Returnt `true` als we mailden, `false`
 * bij skip/falen.
 */
export async function sendDeliveredEmailIfNeeded(
  supabase: SupabaseClient,
  order: OrderRow
): Promise<boolean> {
  const orderShort = order.id.slice(0, 8)

  if (order.review_invitation_sent_at) {
    console.log(
      `[Sendcloud Sync] Skipping delivered email for order ${orderShort} — already dispatched at ${order.review_invitation_sent_at}`
    )
    return false
  }

  try {
    const customerName =
      (order.shipping_address as { name?: string } | null)?.name || 'Klant'
    const customerEmail = order.email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mosewear.com'
    const locale = order.locale || 'nl'

    const orderItems = (order.order_items || []).map((item) => ({
      product_id: item.product_id || '',
      product_name: item.product_name,
      image_url: item.image_url
        ? item.image_url.startsWith('http')
          ? item.image_url
          : `${siteUrl}${item.image_url.startsWith('/') ? item.image_url : '/' + item.image_url}`
        : '',
    }))

    const result = await sendOrderDeliveredEmail({
      customerName,
      customerEmail,
      orderId: order.id,
      orderItems,
      shippingAddress: order.shipping_address,
      deliveryDate: order.delivered_at || new Date().toISOString(),
      locale,
    })

    if (!result.success) {
      console.error(
        `[Sendcloud Sync] Failed to send delivered email for order ${orderShort}`
      )
      return false
    }

    await logEmail({
      orderId: order.id,
      emailType: 'delivered',
      recipientEmail: customerEmail,
      subject: 'Je MOSE pakket is aangekomen!',
      status: 'sent',
    })

    const trustpilotConfigured = Boolean(process.env.TRUSTPILOT_AFS_BCC_EMAIL?.trim())
    const nowIso = new Date().toISOString()

    await supabase
      .from('orders')
      .update({
        last_email_sent_at: nowIso,
        last_email_type: 'delivered',
      })
      .eq('id', order.id)

    if (trustpilotConfigured) {
      const { data: claimed, error: claimError } = await supabase
        .from('orders')
        .update({ review_invitation_sent_at: nowIso })
        .eq('id', order.id)
        .is('review_invitation_sent_at', null)
        .select('id')
        .maybeSingle()

      if (claimError) {
        console.error(
          `[Sendcloud Sync] Failed to claim review_invitation_sent_at for order ${orderShort}:`,
          claimError.message
        )
      } else if (!claimed) {
        console.log(
          `[Sendcloud Sync] Review invitation for order ${orderShort} was already claimed by a parallel run.`
        )
      }
    }

    console.log(
      `[Sendcloud Sync] Delivered email sent for order ${orderShort} (trustpilot_bcc=${trustpilotConfigured})`
    )
    return true
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      `[Sendcloud Sync] Error sending delivered email for order ${orderShort}:`,
      message
    )
    return false
  }
}

/**
 * Sync één order: vraag de actuele parcel-status op bij Sendcloud aan
 * de hand van de tracking_code en pas hem lokaal toe. Wordt door zowel
 * de admin-"Sync van Sendcloud"-knop als de bulk-cron gebruikt.
 */
export async function syncOrderStatusFromSendcloud(
  orderId: string
): Promise<ApplyResult> {
  const supabase = createServiceRoleClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single<OrderRow>()

  if (error || !order) {
    return {
      orderId,
      changed: false,
      oldStatus: '',
      newStatus: '',
      error: error?.message || 'Order not found',
    }
  }

  if (!order.tracking_code) {
    return {
      orderId: order.id,
      changed: false,
      oldStatus: order.status,
      newStatus: order.status,
      reason: 'no-tracking-code',
    }
  }

  const parcel = await getParcelByTrackingNumber(order.tracking_code)
  if (!parcel) {
    return {
      orderId: order.id,
      changed: false,
      oldStatus: order.status,
      newStatus: order.status,
      reason: 'parcel-not-found',
    }
  }

  return applyParcelStatusUpdate(supabase, order, parcel)
}

export interface SyncStuckOrdersResult {
  scanned: number
  changed: number
  errors: number
  emailsSent: number
  details: ApplyResult[]
  /** Sendcloud niet geconfigureerd → niets gedaan; geen error. */
  skipped?: boolean
}

/**
 * Bulk sync — vindt alle "stuck" orders (heeft een tracking_code maar
 * is nog niet `delivered` of `cancelled`) en synct ze één voor één
 * tegen Sendcloud.
 *
 * `paidWithinDays` (default 60) begrenst de scope zodat we geen oude
 * orders uit het stenen tijdperk eindeloos blijven afkloppen.
 *
 * `maxOrders` (default 100) is een safety net tegen runaway pollen
 * tegen de Sendcloud API rate limits (60 req/min op de v2 parcels API).
 */
export async function syncStuckOrders(
  options: { paidWithinDays?: number; maxOrders?: number } = {}
): Promise<SyncStuckOrdersResult> {
  const { paidWithinDays = 60, maxOrders = 100 } = options

  if (!isSendcloudConfigured()) {
    console.warn('[Sendcloud Sync] Skipped — Sendcloud not configured')
    return {
      scanned: 0,
      changed: 0,
      errors: 0,
      emailsSent: 0,
      details: [],
      skipped: true,
    }
  }

  const supabase = createServiceRoleClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - paidWithinDays)

  // Statussen die wél een Sendcloud-update verwachten: alles behalve
  // delivered, cancelled, return_*, refunded.
  const stuckStatuses = ['shipped', 'processing']

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .in('status', stuckStatuses)
    .not('tracking_code', 'is', null)
    .gte('paid_at', cutoff.toISOString())
    .order('paid_at', { ascending: false })
    .limit(maxOrders)

  if (error) {
    console.error('[Sendcloud Sync] Failed to fetch stuck orders:', error.message)
    return {
      scanned: 0,
      changed: 0,
      errors: 1,
      emailsSent: 0,
      details: [],
    }
  }

  const list = (orders ?? []) as unknown as OrderRow[]
  const details: ApplyResult[] = []
  let changed = 0
  let errors = 0
  let emailsSent = 0

  for (const order of list) {
    if (!order.tracking_code) continue
    const parcel = await getParcelByTrackingNumber(order.tracking_code)
    if (!parcel) {
      details.push({
        orderId: order.id,
        changed: false,
        oldStatus: order.status,
        newStatus: order.status,
        reason: 'parcel-not-found',
      })
      continue
    }

    const result = await applyParcelStatusUpdate(supabase, order, parcel)
    details.push(result)
    if (result.changed) changed += 1
    if (result.error) errors += 1
    if (result.emailSent === 'delivered') emailsSent += 1

    // Beleefdheid richting de Sendcloud API + onszelf — kleine throttle
    // van 250ms tussen calls voorkomt dat we over de 60 req/min limiet
    // gaan en houdt de cron-run ook bij grote backlogs onder een minuut.
    await new Promise((r) => setTimeout(r, 250))
  }

  console.log(
    `[Sendcloud Sync] Bulk run complete — scanned=${list.length} changed=${changed} emails=${emailsSent} errors=${errors}`
  )

  return {
    scanned: list.length,
    changed,
    errors,
    emailsSent,
    details,
  }
}
