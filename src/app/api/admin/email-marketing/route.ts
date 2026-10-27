import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceClient } from '@/lib/supabase/service'
import { leesCijfers, postmarkStreamCijfers } from '@/lib/toestemming'
import { campagneOverzicht, verstuurCampagneTest } from '@/lib/campagnes'
import { brevoCampagneOverzicht } from '@/lib/brevo-campagnes'
import { getPostmarkPilotReportWithOrders } from '@/lib/postmark-campaign-report'
import { MOSE_EDIT_PILOT } from '@/lib/mose-edit-pilot'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Alles voor het e-mailmarketingoverzicht in één keer: de lijst, de
 * Brevo-campagnes, de Postmark-campagnes met verkeer en orders per verzendmoment, het verkeer uit e-mail
 * per dag, en Postmarks eigen tellingen per stream.
 */
export async function GET() {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) return NextResponse.json({ ok: false, fout: 'Niet geautoriseerd' }, { status: 403 })
  const db = createServiceClient()
  const sinds = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const [lijst, campagnes, brevo, postmark, events, abonnees, postmarkPilot] = await Promise.all([
    leesCijfers(),
    campagneOverzicht(),
    brevoCampagneOverzicht().catch((e) => ({ campagnes: [], fout: e instanceof Error ? e.message : 'Brevo onbereikbaar' })),
    postmarkStreamCijfers().catch(() => null),
    (async () => {
      const data: Array<{ session_id: string; page_url: string | null; created_at: string }> = []
      for (let van = 0; ; van += 1000) {
        const pagina = await db.from('analytics_events')
          .select('session_id, page_url, created_at')
          .eq('event_name', 'page_view').gte('created_at', sinds)
          .or('page_url.ilike.%utm_source=nieuwsbrief%,page_url.ilike.%/toestemming%')
          .order('created_at').order('id').range(van, van + 999)
        if (pagina.error) throw new Error(`E-mailverkeer niet leesbaar: ${pagina.error.message}`)
        data.push(...(pagina.data || []))
        if (!pagina.data || pagina.data.length < 1000) break
      }
      return { data }
    })(),
    // Alleen wie zich zelf aanmeldde: de geïmporteerde lijst staat er ook als actief in.
    db.from('newsletter_subscribers').select('id', { count: 'exact', head: true }).eq('status', 'active').neq('source', 'admin_import'),
    getPostmarkPilotReportWithOrders(),
  ])

  // Verkeer uit e-mail: unieke sessies per dag, gesplitst in campagnes en de
  // bevestigingspagina van de toestemmingsronde; en per campagnemoment.
  const perDag = new Map<string, { campagne: Set<string>; toestemming: Set<string> }>()
  const perInhoud = new Map<string, Set<string>>()
  for (const e of events.data || []) {
    const dag = new Date(e.created_at).toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' })
    const d = perDag.get(dag) || { campagne: new Set(), toestemming: new Set() }
    const url = e.page_url || ''
    if (url.includes('utm_source=nieuwsbrief')) {
      d.campagne.add(e.session_id)
      const campagne = new URL(url).searchParams.get('utm_campaign') || ''
      const inhoud = (campagne === MOSE_EDIT_PILOT.slug ? new URL(url).searchParams.get('utm_term') : null) || new URL(url).searchParams.get('utm_content') || 'onbekend'
      const sleutel = `${campagne}|${inhoud}`
      if (!perInhoud.has(sleutel)) perInhoud.set(sleutel, new Set())
      perInhoud.get(sleutel)!.add(e.session_id)
    } else {
      d.toestemming.add(e.session_id)
    }
    perDag.set(dag, d)
  }
  // Brevo used a separate utm_content for each link. The imported Brevo
  // send belongs to one moment; Postmark uses its moment slug directly.
  const momentSlug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
  for (const campagne of campagnes.campagnes) {
    const momenten = campagnes.momenten.filter((m) => m.campagne_id === campagne.id)
    const brevoMomenten = momenten.filter((m) => m.label.startsWith('Brevo:'))
    if (brevoMomenten.length !== 1) continue
    const bekendeMomenten = new Set(momenten.map((m) => momentSlug(m.label)))
    const brevoBezoekers = new Set<string>()
    for (const [sleutel, sessies] of perInhoud) {
      const [slug, inhoud] = sleutel.split('|')
      if (slug !== campagne.slug || bekendeMomenten.has(inhoud)) continue
      for (const sessie of sessies) brevoBezoekers.add(sessie)
    }
    perInhoud.set(`${campagne.slug}|${momentSlug(brevoMomenten[0].label)}`, brevoBezoekers)
  }
  const verkeer = [...perDag.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dag, d]) => ({ dag, campagne: d.campagne.size, toestemming: d.toestemming.size }))
  const bezoekersPerMoment = Object.fromEntries([...perInhoud.entries()].map(([k, v]) => [k, v.size]))

  return NextResponse.json({
    ok: true,
    lijst: { ...lijst, abonneesSite: abonnees.count ?? null },
    ...campagnes,
    verkeer,
    bezoekersPerMoment,
    brevo,
    postmark,
    postmarkCampagnes: { [postmarkPilot.tag]: postmarkPilot },
    pilot: { slug: MOSE_EDIT_PILOT.slug, maximum: MOSE_EDIT_PILOT.roster.length, startAt: MOSE_EDIT_PILOT.startAt, batchSize: MOSE_EDIT_PILOT.batchSize, minimumGapDays: MOSE_EDIT_PILOT.minimumGapDays, maximumCommercialEmails30d: MOSE_EDIT_PILOT.maximumCommercialEmails30d },
  })
}

export async function POST(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin'])
  if (!authorized) return NextResponse.json({ ok: false, fout: 'Niet geautoriseerd' }, { status: 403 })
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const db = createServiceClient()
  const id = String(body.campagneId || '')

  switch (body.actie) {
    case 'activeer': {
      const { data: campagne, error } = await db.from('campagnes').select('status').eq('id', id).maybeSingle()
      if (error) return NextResponse.json({ ok: false, fout: 'Campagne niet leesbaar' }, { status: 500 })
      if (!campagne) return NextResponse.json({ ok: false, fout: 'Campagne niet gevonden' }, { status: 404 })
      if (campagne.status === 'klaar') return NextResponse.json({ ok: false, fout: 'Deze campagne is afgerond en kan niet opnieuw worden gestart' }, { status: 409 })
      await db.from('campagnes').update({ status: 'actief', stopreden: null, gestopt_op: null }).eq('id', id).eq('status', campagne.status)
      return NextResponse.json({ ok: true })
    }
    case 'pauzeer':
      await db.from('campagnes').update({ status: 'concept' }).eq('id', id)
      return NextResponse.json({ ok: true })
    case 'test': {
      const email = String(body.email || '')
      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return NextResponse.json({ ok: false, fout: 'Ongeldig adres' }, { status: 400 })
      return NextResponse.json(await verstuurCampagneTest(id, email))
    }
    case 'instellingen': {
      if (id === MOSE_EDIT_PILOT.campaignId) return NextResponse.json({ ok: false, fout: `Deze verzending heeft een goedgekeurde vaste doelgroep en maximaal ${MOSE_EDIT_PILOT.maximumCommercialEmails30d} commerciële mails per 30 dagen. De wachttijd is voor deze verzending op verzoek vervallen.` }, { status: 409 })
      const getal = (v: unknown, min: number, max: number) => {
        const n = Number(v)
        return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : undefined
      }
      const wijziging = Object.fromEntries(
        Object.entries({
          wachttijd_minuten: getal(body.wachttijd_minuten, 0, 60 * 24 * 14),
          min_dagen_tussen: getal(body.min_dagen_tussen, 0, 30),
          per_run: getal(body.per_run, 1, 500),
        }).filter(([, v]) => v !== undefined),
      )
      await db.from('campagnes').update(wijziging).eq('id', id)
      return NextResponse.json({ ok: true })
    }
    case 'bundel': {
      const n = Number(body.postmark_bundel)
      if (!Number.isFinite(n) || n < 1000) return NextResponse.json({ ok: false, fout: 'Ongeldige bundel' }, { status: 400 })
      await db.from('toestemming_instellingen').update({ postmark_bundel: Math.round(n) }).eq('id', 1)
      return NextResponse.json({ ok: true })
    }
    default:
      return NextResponse.json({ ok: false, fout: 'Onbekende actie' }, { status: 400 })
  }
}
