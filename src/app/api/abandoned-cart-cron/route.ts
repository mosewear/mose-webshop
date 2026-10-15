import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendAbandonedCartEmail } from '@/lib/email'
import { requireAdmin } from '@/lib/supabase/admin'

/**
 * De herinnering voor winkelmanden die zijn blijven staan.
 *
 * DIT HEEFT NOOIT GEWERKT. In `order_emails` staat geen enkele regel van het
 * type abandoned_cart, terwijl deze cron elke twee uur draait en er acht
 * onbetaalde bestellingen klaarliggen, de oudste van februari.
 *
 * De oorzaak staat hieronder bij `GET`: Vercel roept een cron altijd met GET
 * aan, en de GET was hier een leesbaar statusoverzicht. Het versturen zat in
 * POST, en POST werd door niemand aangeroepen. Elke andere cron in dit project
 * laat GET gewoon dezelfde afhandeling doen; alleen deze week ervan af.
 */

/** Zeven dagen. Daarna is een herinnering geen service meer. */
const STANDAARD_MAXIMUM_UREN = 168

async function controleerToegang(req: NextRequest): Promise<NextResponse | null> {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isCronJob = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`
  if (isCronJob) return null

  const { authorized } = await requireAdmin()
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

async function verstuurHerinneringen(req: NextRequest) {
  try {
    const geweigerd = await controleerToegang(req)
    if (geweigerd) return geweigerd

    // Met ?dryrun=1 wordt niets verstuurd en niets gemarkeerd. Zo kun je de
    // selectie bekijken zonder dat er post de deur uit gaat.
    const proefdraaien = req.nextUrl.searchParams.get('dryrun') === '1'

    const supabase = createServiceRoleClient()

    const { data: settings } = await supabase.from('site_settings').select('key, value')

    const settingsMap: Record<string, any> = {}
    settings?.forEach((s) => {
      settingsMap[s.key] = s.value
    })

    const abandonedHours = parseInt(settingsMap.abandoned_cart_hours || 24)
    const maxUren = parseInt(settingsMap.abandoned_cart_max_hours || STANDAARD_MAXIMUM_UREN)
    const emailEnabled =
      settingsMap.abandoned_cart_email_enabled === 'true' ||
      settingsMap.abandoned_cart_email_enabled === true
    const freeShippingThreshold = parseFloat(settingsMap.free_shipping_threshold || 100)
    const returnDays = parseInt(settingsMap.return_days || 30)

    if (!emailEnabled && !proefdraaien) {
      return NextResponse.json({
        message: 'Abandoned cart emails are disabled in settings',
        sent: 0,
      })
    }

    const { data: abandonedCarts, error } = await supabase.rpc('get_abandoned_carts', {
      hours_threshold: abandonedHours,
      email_not_sent_only: true,
      max_hours: maxUren,
    })

    if (error) {
      console.error('Error fetching abandoned carts:', error)
      return NextResponse.json({ error: 'Failed to fetch abandoned carts' }, { status: 500 })
    }

    if (!abandonedCarts || abandonedCarts.length === 0) {
      return NextResponse.json({ message: 'No abandoned carts found', sent: 0 })
    }

    console.log(`Found ${abandonedCarts.length} abandoned cart(s) to email`)

    const emailResults: any[] = []

    for (const cart of abandonedCarts as any[]) {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mosewear.com'
        const checkoutUrl = `${siteUrl}/checkout?recover=${cart.order_id}`

        if (proefdraaien) {
          emailResults.push({
            orderId: cart.order_id,
            email: cart.customer_email,
            hours: Math.round(cart.hours_since_abandonment),
            locale: cart.locale,
            dryrun: true,
          })
          continue
        }

        const emailResult = await sendAbandonedCartEmail({
          customerName: cart.customer_name || 'Klant',
          customerEmail: cart.customer_email,
          orderId: cart.order_id,
          orderTotal: parseFloat(cart.total),
          subtotal: cart.subtotal != null ? parseFloat(cart.subtotal) : undefined,
          discount: cart.discount != null ? parseFloat(cart.discount) : 0,
          orderItems: (cart.order_items || [])
            .filter((item: any) => item && item.product_name)
            .map((item: any) => ({
              name: item.product_name,
              size: item.size,
              color: item.color,
              quantity: item.quantity,
              price: item.price,
              imageUrl: item.image_url
                ? item.image_url.startsWith('http')
                  ? item.image_url
                  : `${siteUrl}${item.image_url.startsWith('/') ? item.image_url : '/' + item.image_url}`
                : '',
            })),
          checkoutUrl,
          hoursSinceAbandoned: Math.round(cart.hours_since_abandonment),
          freeShippingThreshold,
          returnDays,
          // De taal waarin de klant heeft afgerekend. Werd hier niet
          // doorgegeven, dus iedereen kreeg Nederlands.
          locale: cart.locale || 'nl',
        })

        // Geen losse logEmail meer. `sendAbandonedCartEmail` logt zelf al via
        // sendAndLog; de extra aanroep die hier stond zette een tweede regel in
        // order_emails, met een onderwerp dat afweek van wat er werkelijk
        // verstuurd werd.

        if (emailResult.success) {
          await supabase.rpc('mark_abandoned_cart_email_sent', { order_uuid: cart.order_id })

          emailResults.push({ orderId: cart.order_id, email: cart.customer_email, success: true })
          console.log(`Abandoned cart email sent to ${cart.customer_email}`)
        } else {
          // Bij een onderdrukt adres niet eindeloos opnieuw proberen: de
          // suppressiepoort geeft 'SUPPRESSED' terug en die uitkomst verandert
          // bij de volgende run niet.
          const definitief =
            (emailResult.error as { code?: string } | undefined)?.code === 'SUPPRESSED'
          if (definitief) {
            await supabase.rpc('mark_abandoned_cart_email_sent', { order_uuid: cart.order_id })
          }

          emailResults.push({
            orderId: cart.order_id,
            email: cart.customer_email,
            success: false,
            error: emailResult.error,
          })

          console.error(
            `Failed to send abandoned cart email to ${cart.customer_email}:`,
            emailResult.error
          )
        }
      } catch (error) {
        console.error(`Error processing abandoned cart ${cart.order_id}:`, error)
        emailResults.push({
          orderId: cart.order_id,
          email: cart.customer_email,
          success: false,
          error: error,
        })
      }
    }

    const successCount = emailResults.filter((r) => r.success === true).length
    const failCount = emailResults.filter((r) => r.success === false).length

    return NextResponse.json({
      message: `Processed ${abandonedCarts.length} abandoned cart(s)`,
      dryrun: proefdraaien,
      sent: successCount,
      failed: failCount,
      results: emailResults,
    })
  } catch (error: any) {
    console.error('Error in abandoned cart cron:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

async function overzicht(req: NextRequest) {
  try {
    const geweigerd = await controleerToegang(req)
    if (geweigerd) return geweigerd

    const supabase = createServiceRoleClient()

    const { data: allCarts, error } = await supabase.rpc('get_abandoned_carts', {
      hours_threshold: 1,
      email_not_sent_only: false,
      // Geen bovengrens: dit scherm hoort juist te laten zien wat er aan oude
      // manden ligt, ook wat we niet meer mailen.
      max_hours: null,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const emailNotSent = allCarts?.filter((c: any) => !c.abandoned_cart_email_sent) || []
    const emailSent = allCarts?.filter((c: any) => c.abandoned_cart_email_sent) || []

    return NextResponse.json({
      total_abandoned: allCarts?.length || 0,
      pending_email: emailNotSent.length,
      email_sent: emailSent.length,
      carts: allCarts || [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * Vercel Cron roept een job ALTIJD met GET aan. Hier stond een los
 * statusoverzicht achter GET en de verzending achter POST, waardoor er in
 * maanden geen enkele herinnering is verstuurd.
 *
 * Het overzicht is niet verdwenen: ?status=1 geeft het nog steeds, en ?dryrun=1
 * laat zien wie er aan de beurt zou zijn zonder iets te versturen.
 */
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('status') === '1') {
    return overzicht(req)
  }
  return verstuurHerinneringen(req)
}

export async function POST(req: NextRequest) {
  return verstuurHerinneringen(req)
}
