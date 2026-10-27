/**
 * Campagnes via Postmark aan wie de toestemmingsmail kreeg en zich niet
 * afmeldde.
 *
 * Een campagne heeft verzendmomenten (campagne_momenten). Vanaf het moment
 * draait elke vijf minuten een cron die een deel van de doelgroep claimt
 * (per_run, standaard 250) en via de batch-API verstuurt. Zo gaat een groep
 * van 1.500 in een half uur weg in plaats van in één salvo. Een moment sluit
 * als er niemand meer bij hoort of na vier uur.
 *
 * De doelgroep bepaalt de database (campagne_claim): toestemmingsmail lang
 * genoeg geleden, niet afgemeld of gebounced, deze campagne nog niet gehad en
 * de afgelopen dagen geen andere. Daardoor groeit hij vanzelf mee met de
 * toestemmingsronde.
 *
 * Stopregels per campagne: klachten boven max_klacht_pct of bounces boven
 * max_bounce_pct (vanaf 100 verstuurd), of een Postmark-fout die niet over
 * één adres gaat. Een stop mailt info@mosewear.com en houdt de campagne stil
 * tot iemand hem in de admin weer activeert. De bundelgrens (abonnement min
 * orderreserve) laat een moment wachten in plaats van stoppen.
 */

import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail, htmlToText } from '@/lib/postmark'
import { schrijfContactUit } from '@/lib/brevo'
import { postmark, zorgVoorStream, verstuurdLaatste30Dagen, leesInstellingen, ORDERRESERVE } from '@/lib/toestemming'
import { MOSE_EDIT_PILOT, runMoseEditPilot, pilotMail } from '@/lib/mose-edit-pilot'

export const CAMPAGNE_STREAM = 'campagnes'
const AFZENDER = 'MOSE <info@mosewear.com>'
const MELDING_AAN = 'info@mosewear.com'
/** Na zoveel uur na de start sluit een moment, ook als er nog mensen bij komen. */
const VENSTER_UREN = 4
const FOUT_PER_ADRES = new Set([300, 406])

function site(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mosewear.com').replace(/\/$/, '')
}

interface Campagne {
  id: string
  slug: string
  naam: string
  onderwerp: string
  voorvertoning: string | null
  html: string
  status: string
  per_run: number
  max_bounce_pct: number
  max_klacht_pct: number
  wachttijd_minuten: number
  min_dagen_tussen: number
}

interface Moment {
  id: string
  campagne_id: string
  label: string
  start_op: string
  aandeel: string
  status: string
}

/** Zet de UTM-kenmerken op elke link naar de winkel, zodat bezoek en orders per moment te herleiden zijn. */
export function bouwCampagneMail(c: Pick<Campagne, 'html' | 'slug' | 'voorvertoning'>, momentLabel: string) {
  if (c.slug === MOSE_EDIT_PILOT.slug) return pilotMail(c.html, momentLabel)
  const inhoud = momentLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
  const html = c.html.replace(/href="(https:\/\/(?:www\.)?mosewear\.com[^"]*)"/g, (_m, url: string) => {
    const scheiding = url.includes('?') ? '&' : '?'
    return `href="${url}${scheiding}utm_source=nieuwsbrief&utm_medium=email&utm_campaign=${c.slug}&utm_content=${inhoud}"`
  })
  return { html, tekst: htmlToText(html) }
}

async function stopCampagne(c: Pick<Campagne, 'id' | 'naam'>, reden: string) {
  const db = createServiceClient()
  const { data } = await db
    .from('campagnes')
    .update({ status: 'gestopt', stopreden: reden, gestopt_op: new Date().toISOString() })
    .eq('id', c.id)
    .eq('status', 'actief')
    .select('id')
  if (!data || data.length === 0) return
  const tekst = `De campagne "${c.naam}" is automatisch gestopt.\n\nReden: ${reden}\n\nEr gaat niets meer weg tot je hem in de admin weer activeert:\n${site()}/admin/campagnes`
  await sendEmail({
    From: 'MOSE Webshop <orders@mosewear.com>',
    To: MELDING_AAN,
    Subject: `Campagne gestopt: ${reden.slice(0, 60)}`,
    HtmlBody: `<pre style="font-family:inherit;white-space:pre-wrap">${tekst}</pre>`,
    TextBody: tekst,
    Tag: 'campagne-melding',
  }).catch((e) => console.error('[campagnes] melding mislukt', e))
}

async function tellingen(campagneId: string) {
  const db = createServiceClient()
  const basis = () => db.from('campagne_ontvangers').select('email', { count: 'exact', head: true }).eq('campagne_id', campagneId)
  const [v, b, k, a] = await Promise.all([
    basis().not('verzonden_op', 'is', null),
    basis().eq('status', 'bounce'),
    basis().eq('status', 'klacht'),
    basis().eq('status', 'afgemeld'),
  ])
  return { verzonden: v.count ?? 0, bounces: b.count ?? 0, klachten: k.count ?? 0, afgemeld: a.count ?? 0 }
}

/** Geeft de reden terug als de campagne moet stoppen. */
async function controleerCampagne(c: Campagne): Promise<string | null> {
  const t = await tellingen(c.id)
  if (c.slug === MOSE_EDIT_PILOT.slug && (t.bounces || t.klachten || t.afgemeld)) return 'Ontvangerssignaal bij de proefgroep: beoordeel de resultaten voordat er meer wordt verstuurd'
  if (t.verzonden === 0) return null
  const pct = (n: number) => Math.round((n / t.verzonden) * 10000) / 100
  if (t.klachten > 0 && pct(t.klachten) > Number(c.max_klacht_pct)) {
    return `${t.klachten} spamklacht${t.klachten === 1 ? '' : 'en'} op ${t.verzonden} verstuurd (${pct(t.klachten)}%, grens ${c.max_klacht_pct}%)`
  }
  if (t.verzonden >= 100 && pct(t.bounces) > Number(c.max_bounce_pct)) {
    return `${t.bounces} bounces op ${t.verzonden} verstuurd (${pct(t.bounces)}%, grens ${c.max_bounce_pct}%)`
  }
  return null
}

interface BatchAntwoord {
  ErrorCode: number
  Message: string
  MessageID?: string
  To?: string
}

async function verstuurBatch(c: Campagne, momentLabel: string, ontvangers: string[]) {
  const mail = bouwCampagneMail(c, momentLabel)
  const berichten = ontvangers.map((email) => ({
    From: AFZENDER,
    To: email,
    ReplyTo: 'info@mosewear.com',
    Subject: c.onderwerp,
    HtmlBody: mail.html,
    TextBody: mail.tekst,
    MessageStream: CAMPAGNE_STREAM,
    Tag: c.slug,
    Metadata: { campagne: c.slug, moment: momentLabel },
    TrackLinks: 'None',
    TrackOpens: false,
  }))
  const res = await postmark<BatchAntwoord[] | { ErrorCode: number; Message: string }>('/email/batch', {
    method: 'POST',
    body: JSON.stringify(berichten),
  })
  if (!Array.isArray(res.data)) {
    const fout = res.data as { Message?: string } | null
    return { fout: `Batch geweigerd (HTTP ${res.status}): ${fout?.Message || 'onbekend'}`, uitslag: [] as BatchAntwoord[] }
  }
  return { fout: null, uitslag: res.data }
}

export interface CampagneRun {
  moment: string | null
  verzonden: number
  mislukt: number
  reden?: string
}

/** Eén ronde van de cron: hooguit één moment, hooguit per_run adressen. */
export async function draaiCampagnes(): Promise<CampagneRun> {
  const db = createServiceClient()
  const nu = new Date()

  const { data: momenten } = await db
    .from('campagne_momenten')
    .select('*, campagnes!inner(*)')
    .in('status', ['gepland', 'bezig'])
    .lte('start_op', nu.toISOString())
    .order('start_op')
    .limit(5)
  const lijst = (momenten || []) as Array<Moment & { campagnes: Campagne }>
  if (lijst.length === 0) return { moment: null, verzonden: 0, mislukt: 0, reden: 'geen moment aan de beurt' }

  for (const m of lijst) {
    const c = m.campagnes
    if (c.slug === MOSE_EDIT_PILOT.slug) {
      const result = await runMoseEditPilot(c, m)
      if (c.status === 'actief') return result
      continue
    }
    const eind = new Date(new Date(m.start_op).getTime() + VENSTER_UREN * 3_600_000)
    if (c.status !== 'actief') {
      // Een gestopte of concept-campagne laat zijn moment liggen tot hij weer
      // aan gaat; voorbij het venster wordt het overgeslagen.
      if (nu > eind) await db.from('campagne_momenten').update({ status: 'overgeslagen', klaar_op: nu.toISOString() }).eq('id', m.id)
      continue
    }
    if (nu > eind) {
      await db.from('campagne_momenten').update({ status: 'klaar', klaar_op: nu.toISOString() }).eq('id', m.id)
      continue
    }

    const opzet = await zorgVoorStream(CAMPAGNE_STREAM, 'Campagnes', 'Nieuwsbrieven aan wie de toestemmingsmail kreeg en zich niet afmeldde')
    if (!opzet.ok) {
      await stopCampagne(c, `Postmark niet klaar: ${opzet.fout}`)
      return { moment: m.label, verzonden: 0, mislukt: 0, reden: opzet.fout }
    }

    const reden = await controleerCampagne(c)
    if (reden) {
      await stopCampagne(c, reden)
      return { moment: m.label, verzonden: 0, mislukt: 0, reden }
    }

    const inst = await leesInstellingen()
    const bundel = await verstuurdLaatste30Dagen()
    const grens = (inst.postmark_bundel || 10000) - ORDERRESERVE
    if (bundel !== null && bundel + c.per_run > grens) {
      return { moment: m.label, verzonden: 0, mislukt: 0, reden: `bundel: ${bundel} mails in 30 dagen, grens ${grens}` }
    }

    const { data: geclaimd, error } = await db.rpc('campagne_claim', { p_moment: m.id, p_limiet: c.per_run })
    if (error) throw new Error(`Claim mislukt: ${error.message}`)
    const adressen = ((geclaimd || []) as Array<{ email: string }>).map((r) => r.email)
    if (adressen.length === 0) {
      await db.from('campagne_momenten').update({ status: 'klaar', klaar_op: nu.toISOString() }).eq('id', m.id)
      continue
    }
    if (m.status === 'gepland') {
      await db.from('campagne_momenten').update({ status: 'bezig', gestart_op: nu.toISOString() }).eq('id', m.id)
    }

    const { fout, uitslag } = await verstuurBatch(c, m.label, adressen)
    if (fout) {
      // Niets verstuurd: de geclaimde adressen terug, zodat een herstart ze meeneemt.
      await db.from('campagne_ontvangers').delete().eq('campagne_id', c.id).eq('status', 'bezig')
      await stopCampagne(c, fout)
      return { moment: m.label, verzonden: 0, mislukt: 0, reden: fout }
    }

    let verzonden = 0
    let mislukt = 0
    let accountFout: string | null = null
    const tijd = new Date().toISOString()
    for (let i = 0; i < adressen.length; i++) {
      const r = uitslag[i]
      if (r && r.ErrorCode === 0) {
        verzonden++
        await db.from('campagne_ontvangers').update({ status: 'verzonden', verzonden_op: tijd, postmark_id: r.MessageID }).eq('campagne_id', c.id).eq('email', adressen[i])
      } else {
        mislukt++
        await db.from('campagne_ontvangers').update({ status: 'mislukt', fout: `${r?.ErrorCode ?? ''} ${r?.Message ?? 'geen antwoord'}`.trim() }).eq('campagne_id', c.id).eq('email', adressen[i])
        if (!r || !FOUT_PER_ADRES.has(r.ErrorCode)) accountFout = r?.Message || 'geen antwoord van Postmark'
      }
    }
    if (accountFout) await stopCampagne(c, `Postmark weigert de verzending: ${accountFout}`)
    return { moment: m.label, verzonden, mislukt }
  }
  return { moment: null, verzonden: 0, mislukt: 0, reden: 'geen actief moment' }
}

/** Bounce, klacht of afmelding vanuit de webhook. */
export async function verwerkCampagneSignaal(email: string, soort: 'bounce' | 'klacht' | 'afgemeld', messageId?: string | null, metadataCampaignId?: string) {
  const adres = email.trim().toLowerCase()
  if (!adres) return
  const db = createServiceClient()
  let query = db.from('campagne_ontvangers').update({ status: soort, signaal_op: new Date().toISOString() }).eq('email', adres)
  query = messageId ? query.eq('postmark_id', messageId) : query.eq('status', 'verzonden')
  const { data: original, error } = await query.select('campagne_id')
  if (error) throw new Error('Campagnesignaal niet opgeslagen')
  let data = original
  // A fast provider webhook may precede the send response that stores MessageID.
  if (!data?.length && metadataCampaignId === MOSE_EDIT_PILOT.campaignId && messageId) {
    const pending = await db.from('campagne_ontvangers').update({ status: soort, signaal_op: new Date().toISOString(), postmark_id: messageId })
      .eq('campagne_id', metadataCampaignId).eq('email', adres).is('postmark_id', null).eq('status', 'bezig').select('campagne_id')
    if (pending.error) throw new Error('Proefsignaal niet opgeslagen')
    data = pending.data
  }

  if (soort !== 'bounce') {
    // Wie zich bij een campagne afmeldt of klaagt, wil niets meer van MOSE.
    const nu = new Date().toISOString()
    await db.from('toestemming_ontvangers').update({ status: soort, afgemeld_op: soort === 'afgemeld' ? nu : null, signaal_op: nu }).eq('email', adres)
    await db.from('newsletter_subscribers').update({ status: 'unsubscribed', unsubscribed_at: nu }).eq('email', adres)
    await schrijfContactUit(adres)
  }

  const campagneId = data?.[0]?.campagne_id
  if (!campagneId) return
  const { data: c } = await db.from('campagnes').select('*').eq('id', campagneId).single()
  if (!c) return
  const reden = await controleerCampagne(c as Campagne)
  if (reden) await stopCampagne(c as Campagne, reden)
}

/** De echte campagnemail naar één testadres. Telt nergens mee. */
export async function verstuurCampagneTest(campagneId: string, email: string) {
  const db = createServiceClient()
  const { data: c } = await db.from('campagnes').select('*').eq('id', campagneId).single()
  if (!c) return { ok: false, fout: 'Campagne niet gevonden' }
  const opzet = await zorgVoorStream(CAMPAGNE_STREAM, 'Campagnes', 'Nieuwsbrieven aan wie de toestemmingsmail kreeg en zich niet afmeldde')
  if (!opzet.ok) return { ok: false, fout: opzet.fout }
  const mail = bouwCampagneMail(c as Campagne, 'test')
  const res = await sendEmail({
    From: AFZENDER,
    To: email,
    ReplyTo: 'info@mosewear.com',
    Subject: `[Test] ${(c as Campagne).onderwerp}`,
    HtmlBody: mail.html,
    TextBody: mail.tekst,
    MessageStream: CAMPAGNE_STREAM,
    Tag: `${(c as Campagne).slug}-test`,
    TrackLinks: c.slug === MOSE_EDIT_PILOT.slug ? 'HtmlAndText' : 'None',
  })
  return res.success ? { ok: true } : { ok: false, fout: JSON.stringify(res.error) }
}

/** Overzicht voor de admin: per moment verstuurd, signalen en orders binnen 72 uur. */
export async function campagneOverzicht() {
  const db = createServiceClient()
  const { data: campagnes } = await db.from('campagnes').select('id, slug, naam, onderwerp, status, stopreden, wachttijd_minuten, min_dagen_tussen, per_run').order('created_at')
  const { data: momenten } = await db.from('campagne_momenten').select('*').order('start_op')
  // Supabase caps each response at 1,000 rows, even with limit(20000).
  // Fetch the full recipient ledger so a large campaign is not truncated.
  const ontvangers: Array<{ campagne_id: string; email: string; moment_id: string | null; status: string; verzonden_op: string | null }> = []
  for (let van = 0; ; van += 1000) {
    const { data, error } = await db.from('campagne_ontvangers')
      .select('campagne_id, email, moment_id, status, verzonden_op')
      .order('campagne_id').order('email').range(van, van + 999)
    if (error) throw new Error(`Campagneontvangers niet leesbaar: ${error.message}`)
    ontvangers.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  const { data: orders } = await db.from('orders').select('email, total, created_at').in('payment_status', ['paid', 'refunded']).gte('created_at', new Date(Date.now() - 60 * 86_400_000).toISOString())

  const ordersPerEmail = new Map<string, Array<{ t: number; bedrag: number }>>()
  for (const o of orders || []) {
    const e = (o.email || '').toLowerCase()
    if (!ordersPerEmail.has(e)) ordersPerEmail.set(e, [])
    ordersPerEmail.get(e)!.push({ t: new Date(o.created_at).getTime(), bedrag: Number(o.total) })
  }
  const perMoment = new Map<string, { verzonden: number; bounces: number; klachten: number; afgemeld: number; mislukt: number; orders: number; omzet: number }>()
  for (const r of ontvangers || []) {
    const sleutel = r.moment_id || 'onbekend'
    const p = perMoment.get(sleutel) || { verzonden: 0, bounces: 0, klachten: 0, afgemeld: 0, mislukt: 0, orders: 0, omzet: 0 }
    if (r.verzonden_op) {
      p.verzonden++
      const t0 = new Date(r.verzonden_op).getTime()
      for (const o of ordersPerEmail.get(r.email) || []) {
        if (o.t >= t0 && o.t <= t0 + 72 * 3_600_000) {
          p.orders++
          p.omzet += o.bedrag
        }
      }
    }
    if (r.status === 'bounce') p.bounces++
    if (r.status === 'klacht') p.klachten++
    if (r.status === 'afgemeld') p.afgemeld++
    if (r.status === 'mislukt') p.mislukt++
    perMoment.set(sleutel, p)
  }

  const { count: doelgroepNu } = await db
    .from('toestemming_ontvangers')
    .select('email', { count: 'exact', head: true })
    .neq('groep', 'test')
    .in('status', ['verzonden', 'bevestigd'])
  const inst = await leesInstellingen()
  const bundel = await verstuurdLaatste30Dagen()

  return {
    campagnes: campagnes || [],
    momenten: (momenten || []).map((m) => ({ ...m, cijfers: perMoment.get(m.id) || null })),
    doelgroepNu: doelgroepNu ?? 0,
    bundel: { verstuurd30d: bundel, grootte: inst.postmark_bundel, grens: (inst.postmark_bundel || 10000) - ORDERRESERVE },
  }
}
