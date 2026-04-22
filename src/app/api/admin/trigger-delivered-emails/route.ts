import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendOrderDeliveredEmail } from '@/lib/email'
import { logEmail } from '@/lib/email-logger'

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
    const results: { orderId: string; success: boolean; error?: string; skipped?: boolean }[] = []
    const trustpilotConfigured = Boolean(process.env.TRUSTPILOT_AFS_BCC_EMAIL?.trim())

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
          results.push({ orderId, success: false, error: `Status is ${order.status}, niet delivered` })
          continue
        }

        if ((order as any).review_invitation_sent_at && !force) {
          results.push({
            orderId,
            success: true,
            skipped: true,
            error: `Review invitation al verstuurd op ${(order as any).review_invitation_sent_at}`,
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
          deliveryDate: new Date().toISOString(),
          locale,
        })

        if (result.success) {
          await logEmail({
            orderId: order.id,
            emailType: 'delivered',
            recipientEmail: customerEmail,
            subject: 'Je MOSE pakket is aangekomen!',
            status: 'sent',
          })

          const nowIso = new Date().toISOString()
          await supabase
            .from('orders')
            .update({
              last_email_sent_at: nowIso,
              last_email_type: 'delivered',
              ...(trustpilotConfigured ? { review_invitation_sent_at: nowIso } : {}),
            })
            .eq('id', order.id)

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
