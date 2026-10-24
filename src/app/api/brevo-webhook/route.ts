/**
 * Brevo-webhook voor campagnes.
 *
 * Sinds 24-10-2026 gaan de campagnes via Brevo. Brevo blokkeert wie zich
 * afmeldt, spam meldt of hard bouncet zelf al, maar onze eigen database wist
 * daar niets van. Deze route schrijft die signalen terug, zodat de admin,
 * de Postmark-reserveroute (campagne_claim) en een latere import ze kennen.
 *
 * Ingesteld via de Brevo-API (marketingwebhook op unsubscribed, spam en
 * hardBounce) met een Bearer-token: BREVO_WEBHOOK_TOKEN in Vercel.
 *
 * Brevo stuurt één gebeurtenis per verzoek. Een onbekende gebeurtenis krijgt
 * gewoon 200, zodat Brevo niet blijft herhalen.
 */

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { addSuppression } from '@/lib/email-suppression'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

interface BrevoGebeurtenis {
  event?: string
  email?: string
  camp_id?: number
  'campaign name'?: string
  date_event?: string
  reason?: string
}

function gelijk(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

function geautoriseerd(req: NextRequest): boolean {
  const token = process.env.BREVO_WEBHOOK_TOKEN
  if (!token) return false
  const kop = req.headers.get('authorization') || ''
  if (kop.startsWith('Bearer ') && gelijk(kop.slice(7).trim(), token)) return true
  const viaUrl = req.nextUrl.searchParams.get('token')
  return !!viaUrl && gelijk(viaUrl, token)
}

/** Brevo gebruikt verschillende spellingen tussen instellen en versturen. */
function soortVan(event: string | undefined): 'afgemeld' | 'klacht' | 'bounce' | null {
  const e = (event || '').toLowerCase().replace(/[^a-z]/g, '')
  if (e === 'unsubscribe' || e === 'unsubscribed') return 'afgemeld'
  if (e === 'spam') return 'klacht'
  if (e === 'hardbounce') return 'bounce'
  return null
}

async function markeerAfgemeld(adres: string, nu: string) {
  const db = createServiceClient()
  const { data } = await db
    .from('newsletter_subscribers')
    .update({ status: 'unsubscribed', unsubscribed_at: nu })
    .eq('email', adres)
    .select('id')
  if (data && data.length > 0) return
  // Geen rij (bijvoorbeeld een klant die alleen bestelde): leg de afmelding
  // toch vast, zodat niemand hem later per ongeluk weer toevoegt.
  const { error } = await db
    .from('newsletter_subscribers')
    .insert({ email: adres, status: 'unsubscribed', unsubscribed_at: nu, source: 'brevo', locale: 'nl' })
  if (error) console.error('[brevo-webhook] afmelding vastleggen mislukt', adres, error.message)
}

export async function POST(req: NextRequest) {
  if (!geautoriseerd(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let p: BrevoGebeurtenis
  try {
    p = (await req.json()) as BrevoGebeurtenis
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const adres = (p.email || '').trim().toLowerCase()
  const soort = soortVan(p.event)
  if (!adres || !soort) return NextResponse.json({ ok: true, ignored: p.event || 'unknown' })

  try {
    const nu = new Date().toISOString()
    const details = { event: p.event, camp_id: p.camp_id, campagne: p['campaign name'], date_event: p.date_event, reason: p.reason }

    if (soort === 'afgemeld') {
      await markeerAfgemeld(adres, nu)
    } else {
      // Klacht of hard bounce: net als bij Postmark ook op de
      // onderdrukkingslijst, en een klager wil ook geen nieuwsbrief meer.
      await addSuppression({
        email: adres,
        reason: soort === 'klacht' ? 'spam_complaint' : 'hard_bounce',
        source: 'brevo_webhook',
        details,
      })
      if (soort === 'klacht') await markeerAfgemeld(adres, nu)
    }

    console.log('[brevo-webhook]', soort, adres, p.camp_id ?? '')
    return NextResponse.json({ ok: true, soort })
  } catch (err) {
    console.error('[brevo-webhook] fout', err)
    return NextResponse.json({ ok: true, error: 'handler_error' })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'brevo-webhook' })
}
