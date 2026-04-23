import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendOrderDeliveredEmail } from '@/lib/email'
import { logEmail } from '@/lib/email-logger'

/**
 * Admin endpoint: (re)send the "delivered" email for one or more orders,
 * with Trustpilot AFS BCC piggy-backed when configured.
 *
 * Idempotency: the review-invitation claim is applied atomically via
 * `.is('review_invitation_sent_at', null)` so a parallel Sendcloud webhook
 * retry cannot cause duplicate Trustpilot triggers. Pass `force: true` to
 * deliberately re-send even when a claim was already made.
 */
export async function POST(req: Request) {
  try {
    const { authorized } = await requireAdmin(['admin'])
    if (!authorized) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
    }

    const { orderIds, force } = await req.json()

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'Geen order IDs opgegeven' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const trustpilotConfigured = Boolean(process.env.TRUSTPILOT_AFS_BCC_EMAIL?.trim())

    const results: {
      orderId: string
      success: boolean
      skipped?: boolean
      info?: string
      error?: string
    }[] = []

    for (const orderId of orderIds) {
      try {
        const { data: order, error: fetchError } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', orderId)
          .single()

        if (fetchError || !order) {
          results.push({ orderId, success: false, error: 'Order niet gevonden' })
          continue
        }

        if (order.status !== 'delivered') {
          results.push({
            orderId,
            success: false,
            error: `Status is ${order.status}, niet delivered`,
          })
          continue
        }

        if ((order as any).review_invitation_sent_at && !force) {
          results.push({
            orderId,
            success: true,
            skipped: true,
            info: `Review invitation al verstuurd op ${(order as any).review_invitation_sent_at}`,
          })
          continue
        }

        const customerName = (order.shipping_address as any)?.name || 'Klant'
        const customerEmail = order.email
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
        const locale = (order as any).locale || 'nl'

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
          deliveryDate: (order as any).delivered_at || new Date().toISOString(),
          locale,
        })

        if (result.success) {
          await logEmail({
            orderId: order.id,
            emailType: 'delivered',
            recipientEmail: customerEmail,
            subject: 'Je MOSE pakket is aangekomen!',
            status: 'sent',
            metadata: { source: 'admin-trigger', force: Boolean(force) },
          })

          const nowIso = new Date().toISOString()
          const updatePayload: Record<string, unknown> = {
            last_email_sent_at: nowIso,
            last_email_type: 'delivered',
          }
          // Backfill delivered_at if we never captured it.
          if (!(order as any).delivered_at) {
            updatePayload.delivered_at = nowIso
          }

          await supabase.from('orders').update(updatePayload).eq('id', order.id)

          // Atomic claim — only stamp review_invitation_sent_at if nothing
          // has claimed it yet, OR when admin passed force: true.
          if (trustpilotConfigured) {
            if (force) {
              await supabase
                .from('orders')
                .update({ review_invitation_sent_at: nowIso })
                .eq('id', order.id)
            } else {
              await supabase
                .from('orders')
                .update({ review_invitation_sent_at: nowIso })
                .eq('id', order.id)
                .is('review_invitation_sent_at', null)
            }
          }

          results.push({ orderId, success: true })
        } else {
          results.push({ orderId, success: false, error: 'Email versturen mislukt' })
        }
      } catch (err: any) {
        results.push({ orderId, success: false, error: err.message })
      }
    }

    return NextResponse.json({ results, trustpilotConfigured })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
