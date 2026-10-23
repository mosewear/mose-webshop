/**
 * Toestemmingsronde voor de oude maillijst.
 *
 * Eén mail per adres: je staat op de lijst, bevestig het of meld je af. Wie
 * op de knop drukt, komt in Brevo-lijst "Toestemming bevestigd" en in
 * newsletter_subscribers, met tijdstip, IP en browser als bewijs. Wie niets
 * doet, blijft op de lijst (keuze Rick, 21-10-2026); alleen wie zich afmeldt
 * gaat eraf. De eerste 149 kregen nog de oude tekst ("doe je niets, dan
 * krijg je geen mail meer"); zie mose-toestemmingsronde in het geheugen.
 *
 * Verzending
 *   Plukken via een eigen Postmark-broadcaststream, zodat de cijfers los
 *   staan van de orderbevestigingen op `outbound`. De cron draait elk uur;
 *   de database bepaalt of er echt een pluk mag (aan, binnen het venster,
 *   wachttijd voorbij). Zie toestemming_claim_pluk.
 *
 * Stopregels, vóór elke pluk en bij elke bounce of klacht:
 *   klachten  boven max_klacht_pct van alles wat verstuurd is. Bij 0,1 % stopt
 *             de eerste klacht de ronde zolang er minder dan 1000 weg zijn.
 *   bounces   boven max_bounce_pct, vanaf 100 verstuurd.
 *   pluk      max_bounces_pluk of meer bounces binnen één pluk.
 *   Postmark  elke fout die niet over één adres gaat (token, afzender,
 *             stream, account): dan ligt het niet aan de lijst en stoppen we.
 * Een stop is definitief tot iemand hem in de admin opheft, en stuurt een
 * melding naar info@mosewear.com.
 */

import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail, htmlToText } from '@/lib/postmark'
import { isEmailSuppressed } from '@/lib/email-suppression'
import { schrijfContactUit, voegToeAanLijst, voegToeAanLijstBulk } from '@/lib/brevo'

export const TOESTEMMING_STREAM = 'toestemming-2026'
const AFZENDER = 'Irma en Rick van MOSE <info@mosewear.com>'
const MELDING_AAN = 'info@mosewear.com'
const POSTMARK_API = 'https://api.postmarkapp.com'

/** Postmark-foutcodes die over één adres gaan. Al het andere stopt de ronde. */
const FOUT_PER_ADRES = new Set([300, 406])

function site(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mosewear.com').replace(/\/$/, '')
}

export interface Instellingen {
  actief: boolean
  plukgrootte: number
  interval_minuten: number
  venster_van: number
  venster_tot: number
  max_bounce_pct: number
  max_klacht_pct: number
  max_bounces_pluk: number
  laatste_pluk: number
  laatste_pluk_op: string | null
  gestopt_op: string | null
  stopreden: string | null
  brevo_lijst_id: number | null
  /** Vanaf hier tellen de bounces voor de bouncegrens. Leeg: hele ronde. */
  meet_vanaf: string | null
  tempo_stap: number
  tempo_sinds: string | null
  tempo_automatisch: boolean
  postmark_bundel: number
}

export interface Cijfers {
  totaal: number
  wachtrij: number
  vastgehouden: number
  verzonden: number
  bevestigd: number
  afgemeld: number
  bounces: number
  klachten: number
  mislukt: number
}

export async function leesInstellingen(): Promise<Instellingen> {
  const db = createServiceClient()
  const { data, error } = await db.from('toestemming_instellingen').select('*').eq('id', 1).single()
  if (error || !data) throw new Error(`Instellingen niet leesbaar: ${error?.message}`)
  return {
    ...data,
    max_bounce_pct: Number(data.max_bounce_pct),
    max_klacht_pct: Number(data.max_klacht_pct),
  } as Instellingen
}

export async function leesCijfers(): Promise<Cijfers> {
  const db = createServiceClient()
  const { data, error } = await db.rpc('toestemming_cijfers').single()
  if (error || !data) throw new Error(`Cijfers niet leesbaar: ${error?.message}`)
  const r = data as Record<string, number | string>
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v)])) as unknown as Cijfers
}

// ─── Postmark ──────────────────────────────────────────────────────────────

export async function postmark<T>(pad: string, init: RequestInit = {}): Promise<{ status: number; data: T | null }> {
  const res = await fetch(`${POSTMARK_API}${pad}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': process.env.POSTMARK_SERVER_TOKEN || '',
      ...(init.headers || {}),
    },
  })
  let data: T | null = null
  try {
    data = (await res.json()) as T
  } catch {
    data = null
  }
  return { status: res.status, data }
}

/**
 * Zorgt dat de stream en de webhook bestaan. Idempotent, dus veilig om vóór
 * elke pluk te draaien. Webhooks zijn bij Postmark per stream; zonder deze
 * stap komen bounces en klachten van deze ronde nergens binnen en werken de
 * stopregels blind.
 */
export async function zorgVoorPostmark(): Promise<{ ok: boolean; fout?: string }> {
  return zorgVoorStream(TOESTEMMING_STREAM, 'Toestemmingsronde 2026', 'Eenmalige vraag aan de oude lijst of ze mail willen blijven ontvangen')
}

/** Broadcaststream plus webhook, idempotent. Gedeeld met de campagnes. */
export async function zorgVoorStream(id: string, naam: string, omschrijving: string): Promise<{ ok: boolean; fout?: string }> {
  const stream = await postmark<{ ID?: string }>(`/message-streams/${id}`)
  if (stream.status === 404 || (stream.status === 422 && !stream.data?.ID)) {
    const nieuw = await postmark<{ ID?: string; Message?: string }>('/message-streams', {
      method: 'POST',
      body: JSON.stringify({
        ID: id,
        Name: naam,
        Description: omschrijving,
        MessageStreamType: 'Broadcasts',
        // Postmark beheert de afmeldingen: zij zetten de List-Unsubscribe-kop
        // (met één-klik) en melden afmeldingen via de webhook. Eigen afhandeling
        // ('Custom') vereist toestemming van Postmark-support.
        SubscriptionManagementConfiguration: { UnsubscribeHandlingType: 'Postmark' },
      }),
    })
    if (nieuw.status >= 300) return { ok: false, fout: `Stream aanmaken mislukt: ${nieuw.data?.Message || nieuw.status}` }
  } else if (stream.status >= 300) {
    return { ok: false, fout: `Stream niet leesbaar (HTTP ${stream.status})` }
  }

  const gebruiker = process.env.POSTMARK_WEBHOOK_USER
  const wachtwoord = process.env.POSTMARK_WEBHOOK_PASSWORD
  if (!gebruiker || !wachtwoord) return { ok: false, fout: 'Webhook-inlog ontbreekt in Vercel' }

  const lijst = await postmark<{ Webhooks?: Array<{ ID: number; Url: string }> }>(
    `/webhooks?MessageStream=${id}`,
  )
  const url = `${site()}/api/postmark-webhook`
  if (!lijst.data?.Webhooks?.some((w) => w.Url === url)) {
    const maak = await postmark<{ Message?: string }>('/webhooks', {
      method: 'POST',
      body: JSON.stringify({
        Url: url,
        MessageStream: id,
        HttpAuth: { Username: gebruiker, Password: wachtwoord },
        Triggers: {
          Bounce: { Enabled: true, IncludeContent: false },
          SpamComplaint: { Enabled: true, IncludeContent: false },
          SubscriptionChange: { Enabled: true },
        },
      }),
    })
    if (maak.status >= 300) {
      return { ok: false, fout: `Webhook aanmaken mislukt (HTTP ${maak.status}): ${JSON.stringify(maak.data)}` }
    }
  }
  return { ok: true }
}

/**
 * Postmarks eigen tellingen voor deze stream. Vangnet voor als een webhook
 * niet aankomt: de stopregels rekenen met het hoogste van beide.
 */
async function postmarkTellingen(): Promise<{ verstuurd: number; bounces: number; klachten: number } | null> {
  const res = await postmark<{ Sent?: number; Bounced?: number; SpamComplaints?: number }>(
    `/stats/outbound?messagestream=${TOESTEMMING_STREAM}`,
  )
  if (res.status !== 200 || !res.data) return null
  return { verstuurd: res.data.Sent ?? 0, bounces: res.data.Bounced ?? 0, klachten: res.data.SpamComplaints ?? 0 }
}

// ─── Stoppen ───────────────────────────────────────────────────────────────

export async function stop(reden: string): Promise<void> {
  const db = createServiceClient()
  const { data } = await db
    .from('toestemming_instellingen')
    .update({ gestopt_op: new Date().toISOString(), stopreden: reden, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .is('gestopt_op', null)
    .select('id')
  // Alleen de eerste die stopt, stuurt de melding.
  if (!data || data.length === 0) return

  const cijfers = await leesCijfers().catch(() => null)
  const regels = cijfers
    ? `Verstuurd: ${cijfers.verzonden}\nBevestigd: ${cijfers.bevestigd}\nAfgemeld: ${cijfers.afgemeld}\nBounces: ${cijfers.bounces}\nKlachten: ${cijfers.klachten}\nNog in de wachtrij: ${cijfers.wachtrij}`
    : ''
  const tekst = `De toestemmingsronde is automatisch gestopt.\n\nReden: ${reden}\n\n${regels}\n\nEr gaat niets meer de deur uit tot je hem in de admin weer aanzet:\n${site()}/admin/toestemming`
  await sendEmail({
    From: 'MOSE Webshop <orders@mosewear.com>',
    To: MELDING_AAN,
    Subject: `Toestemmingsronde gestopt: ${reden.slice(0, 60)}`,
    HtmlBody: `<pre style="font-family:inherit;white-space:pre-wrap">${tekst}</pre>`,
    TextBody: tekst,
    Tag: 'toestemming-melding',
  }).catch((e) => console.error('[toestemming] melding mislukt', e))
}

/** Rekent de stopregels door. Geeft de reden terug als de ronde moet stoppen. */
export async function controleerGrenzen(plukBounces = 0, opties: { afleverCheck?: boolean } = {}): Promise<string | null> {
  const db = createServiceClient()
  const [inst, eigen, pm, test] = await Promise.all([
    leesInstellingen(),
    leesCijfers(),
    postmarkTellingen(),
    db.from('toestemming_ontvangers').select('status, verzonden_op').eq('groep', 'test'),
  ])
  const verzonden = eigen.verzonden
  if (verzonden === 0) return null
  // Postmarks tellingen bevatten ook de testmails naar de simulatoradressen.
  // Die eerst eraf, anders legt een test later de echte ronde stil. Postmark
  // telt een spammelding als bounce, dus alle testsignalen gaan van de bounces.
  const testRijen = test.data || []
  const testSignalen = testRijen.filter((r) => r.status === 'bounce' || r.status === 'klacht').length

  // Postmark gaf op het Developer Plan na de maandlimiet gewoon "OK" terug,
  // maar leverde niets af (20-10-2026). Daarom vóór elke pluk: telt Postmark
  // ongeveer evenveel verstuurd als wij? Zo niet, dan ligt de stream stil en
  // heeft doorsturen geen zin. Ruimte van 10 voor herhaalde testmails.
  if (opties.afleverCheck && pm) {
    const verwacht = verzonden + testRijen.filter((r) => r.verzonden_op).length
    if (verwacht > pm.verstuurd + 10) {
      return `Postmark heeft ${verwacht - pm.verstuurd} van ${verwacht} mails niet verwerkt. Controleer abonnement en goedkeuring in Postmark.`
    }
  }
  // Klachten over de hele ronde, met Postmarks eigen telling als vangnet.
  const klachten = Math.max(eigen.klachten, pm?.klachten ?? 0)
  const pct = (n: number, van: number) => Math.round((n / van) * 10000) / 100
  if (klachten > 0 && pct(klachten, verzonden) > inst.max_klacht_pct) {
    return `${klachten} spamklacht${klachten === 1 ? '' : 'en'} op ${verzonden} verstuurd (${pct(klachten, verzonden)}%, grens ${inst.max_klacht_pct}%)`
  }

  // Bounces vanaf meet_vanaf, uit onze eigen tabel (de webhook vult die per
  // bounce). Postmarks telling kan niet vanaf een tijdstip en zou de bounces
  // van vóór de lijstcontrole van 21-10 blijven meetellen; zonder meet_vanaf
  // geldt de oude regel over de hele ronde, met Postmark als vangnet.
  let bounces: number
  let basis: number
  if (inst.meet_vanaf) {
    const [{ count: v }, { count: b }] = await Promise.all([
      db.from('toestemming_ontvangers').select('email', { count: 'exact', head: true }).neq('groep', 'test').gte('verzonden_op', inst.meet_vanaf),
      db.from('toestemming_ontvangers').select('email', { count: 'exact', head: true }).neq('groep', 'test').eq('status', 'bounce').gte('verzonden_op', inst.meet_vanaf),
    ])
    basis = v ?? 0
    bounces = b ?? 0
  } else {
    basis = verzonden
    bounces = Math.max(eigen.bounces, (pm?.bounces ?? 0) - testSignalen)
  }
  if (basis >= 100 && pct(bounces, basis) > inst.max_bounce_pct) {
    return `${bounces} bounces op ${basis} verstuurd (${pct(bounces, basis)}%, grens ${inst.max_bounce_pct}%)`
  }
  // Grens per pluk schaalt mee met de plukgrootte: 3 was bedoeld voor plukken
  // van 50 (6 %); bij 125 was het 2,4 % en stopte de ronde op gewone bounces.
  const plukGrens = Math.max(inst.max_bounces_pluk, Math.ceil(inst.plukgrootte * 0.04))
  if (plukBounces >= plukGrens) {
    return `${plukBounces} bounces in één pluk (grens ${plukGrens})`
  }
  return null
}

// ─── Tempo opbouwen ────────────────────────────────────────────────────────

/**
 * Drie standen. Mailproviders vertrouwen een afzender meer als het volume
 * geleidelijk groeit, dus omhoog gaat stap voor stap en alleen na een schone
 * periode; omlaag gaat in één keer terug naar de rustigste stand.
 */
export const TEMPO = [
  { plukgrootte: 50, interval: 120, perDag: 350, omschrijving: '50 per 2 uur' },
  { plukgrootte: 50, interval: 60, perDag: 650, omschrijving: '50 per uur' },
  { plukgrootte: 100, interval: 60, perDag: 1300, omschrijving: '100 per uur' },
] as const

/** Omhoog als het sinds de vorige stap zo schoon is gebleven. */
// 12 uur en 150 mails (Rick, 21-10): lang genoeg om klachten van een avond
// binnen te laten komen, kort genoeg om op een gecontroleerde lijst niet een
// hele dag te wachten.
const OMHOOG = { minUren: 12, minVerstuurd: 150, maxBouncePct: 2, maxAfmeldPct: 5 }
/** Terug naar stand 0 boven deze bounce, of boven OMLAAG_KLACHT_PCT klachten. */
const OMLAAG_BOUNCE_PCT = 2.5
/**
 * Klachtpercentage over de hele ronde sinds de lijstcontrole (meet_vanaf),
 * niet over de laatste stap. Eén losse klacht kort na een stap gaf anders
 * meteen 1 % en zette het tempo terug (23-10: 1 klacht op 2.400 = 0,04 %).
 * De noodstop blijft bij max_klacht_pct (0,1 %).
 */
const OMLAAG_KLACHT_PCT = 0.05
/**
 * Ruimte die altijd vrij blijft voor ordermails. De grens is de bundel uit
 * de instellingen (postmark_bundel, standaard 10.000) min deze reserve; boven
 * die grens wachten toestemmingsronde en campagnes.
 */
export const ORDERRESERVE = 1500

async function telSinds(sinds: string) {
  const db = createServiceClient()
  const basis = () => db.from('toestemming_ontvangers').select('email', { count: 'exact', head: true }).neq('groep', 'test').gte('verzonden_op', sinds)
  const [v, b, k, a] = await Promise.all([
    basis(),
    basis().eq('status', 'bounce'),
    basis().eq('status', 'klacht'),
    basis().eq('status', 'afgemeld'),
  ])
  return { verstuurd: v.count ?? 0, bounces: b.count ?? 0, klachten: k.count ?? 0, afgemeld: a.count ?? 0 }
}

/** Past de stand aan als dat moet. Geeft een omschrijving terug bij een wijziging. */
export async function pasTempoAan(): Promise<string | null> {
  const inst = await leesInstellingen()
  if (!inst.tempo_automatisch) return null
  const sinds = inst.tempo_sinds || inst.meet_vanaf
  if (!sinds) return null
  const t = await telSinds(sinds)
  const pct = (n: number) => (t.verstuurd > 0 ? (n / t.verstuurd) * 100 : 0)
  const uren = (Date.now() - new Date(sinds).getTime()) / 3_600_000

  const ronde = inst.meet_vanaf ? await telSinds(inst.meet_vanaf) : t
  const klachtPct = ronde.verstuurd > 0 ? (ronde.klachten / ronde.verstuurd) * 100 : 0

  let nieuw = inst.tempo_stap
  let reden = ''
  const teveelKlachten = ronde.klachten > 0 && klachtPct > OMLAAG_KLACHT_PCT
  if (inst.tempo_stap > 0 && (teveelKlachten || (t.verstuurd >= 100 && pct(t.bounces) > OMLAAG_BOUNCE_PCT))) {
    nieuw = 0
    reden = teveelKlachten
      ? `${ronde.klachten} klacht${ronde.klachten === 1 ? '' : 'en'} op ${ronde.verstuurd} sinds de lijstcontrole (${klachtPct.toFixed(2)}%)`
      : `${pct(t.bounces).toFixed(1)}% bounces sinds de vorige stap`
  } else if (
    inst.tempo_stap < TEMPO.length - 1 &&
    uren >= OMHOOG.minUren &&
    t.verstuurd >= OMHOOG.minVerstuurd &&
    t.klachten === 0 &&
    pct(t.bounces) < OMHOOG.maxBouncePct &&
    pct(t.afgemeld) < OMHOOG.maxAfmeldPct
  ) {
    nieuw = inst.tempo_stap + 1
    reden = `${t.verstuurd} verstuurd, ${pct(t.bounces).toFixed(1)}% bounces, 0 klachten, ${pct(t.afgemeld).toFixed(1)}% afgemeld`
  }
  if (nieuw === inst.tempo_stap) return null

  const stand = TEMPO[nieuw]
  const db = createServiceClient()
  await db
    .from('toestemming_instellingen')
    .update({ tempo_stap: nieuw, tempo_sinds: new Date().toISOString(), plukgrootte: stand.plukgrootte, interval_minuten: stand.interval, updated_at: new Date().toISOString() })
    .eq('id', 1)

  const richting = nieuw > inst.tempo_stap ? 'verhoogd' : 'teruggezet'
  const tekst = `Het tempo van de toestemmingsronde is ${richting} naar ${stand.omschrijving} (ongeveer ${stand.perDag} per dag).\n\nReden: ${reden}.\n\n${site()}/admin/toestemming`
  await sendEmail({
    From: 'MOSE Webshop <orders@mosewear.com>',
    To: MELDING_AAN,
    Subject: `Toestemmingsronde: tempo ${richting} naar ${stand.omschrijving}`,
    HtmlBody: `<pre style="font-family:inherit;white-space:pre-wrap">${tekst}</pre>`,
    TextBody: tekst,
    Tag: 'toestemming-melding',
  }).catch((e) => console.error('[toestemming] tempomelding mislukt', e))
  return `tempo ${richting} naar ${stand.omschrijving}`
}

/** Alles wat er de laatste 30 dagen via Postmark is verstuurd, over alle streams. */
export async function verstuurdLaatste30Dagen(): Promise<number | null> {
  const van = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
  let totaal = 0
  for (const stream of ['outbound', 'broadcast', TOESTEMMING_STREAM, 'campagnes']) {
    const res = await postmark<{ Sent?: number }>(`/stats/outbound?messagestream=${stream}&fromdate=${van}`)
    // Een stream die nog niet bestaat telt als nul, niet als fout.
    if (res.status === 422 || res.status === 404) continue
    if (res.status !== 200) return null
    totaal += res.data?.Sent ?? 0
  }
  return totaal
}

// ─── De mail ───────────────────────────────────────────────────────────────

const TEKST = {
  nl: {
    onderwerp: 'Je staat op de maillijst van MOSE',
    voorvertoning: 'Af en toe nieuws over drops en restocks. Liever niet? Afmelden kan met één klik.',
    aanhef: 'Hoi,',
    alinea1: 'Je adres staat op de maillijst van MOSE, het kledingmerk uit Groningen. We sturen je af en toe een mail over nieuwe drops en restocks, en nooit vaker dan nodig.',
    alinea2: 'Vind je dat goed? Bevestig het met de knop hieronder, dan weten we het zeker.',
    knop: 'Ja, houd me op de hoogte',
    niets: 'Liever geen mail meer van ons?',
    afmelden: 'Meld je hier af, dan halen we je direct van de lijst',
    groet: 'Groet,',
    namen: 'Irma en Rick',
    voet: (email: string) => `Je krijgt deze mail eenmalig omdat ${email} op de maillijst van MOSE staat.`,
    uitschrijven: 'Uitschrijven',
  },
  en: {
    onderwerp: 'You are on the MOSE mailing list',
    voorvertoning: 'Now and then news about drops and restocks. Rather not? Unsubscribe in one click.',
    aanhef: 'Hi,',
    alinea1: 'Your address is on the mailing list of MOSE, the clothing brand from Groningen. Now and then we send an email about new drops and restocks, never more often than needed.',
    alinea2: 'Is that fine with you? Confirm with the button below, so we know for sure.',
    knop: 'Yes, keep me posted',
    niets: 'Rather not hear from us?',
    afmelden: 'Unsubscribe here and we will take you off the list right away',
    groet: 'Best,',
    namen: 'Irma and Rick',
    voet: (email: string) => `You are receiving this one-time email because ${email} is on the MOSE mailing list.`,
    uitschrijven: 'Unsubscribe',
  },
} as const

export function bouwMail(o: { email: string; taal: 'nl' | 'en'; token: string }) {
  const t = TEKST[o.taal]
  const ja = `${site()}/${o.taal}/toestemming?t=${o.token}`
  const nee = `${site()}/${o.taal}/toestemming?t=${o.token}&actie=afmelden`
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Bewust kaal: één kolom, systeemlettertype, één knop. Een mail die op een
  // persoonlijke vraag lijkt, wordt minder vaak als reclame weggezet dan een
  // volle nieuwsbrief, en hij leest goed met afbeeldingen uit.
  const html = `<!doctype html>
<html lang="${o.taal}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(t.onderwerp)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f2;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(t.voorvertoning)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f2;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border:2px solid #000000;">
<tr><td style="padding:28px 28px 8px 28px;">
<img src="${site()}/logomose.png" alt="MOSE" width="92" height="38" style="display:block;border:0;width:92px;height:38px;">
</td></tr>
<tr><td style="padding:16px 28px 0 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1a1a1a;">
<p style="margin:0 0 14px 0;">${esc(t.aanhef)}</p>
<p style="margin:0 0 14px 0;">${esc(t.alinea1)}</p>
<p style="margin:0 0 24px 0;">${esc(t.alinea2)}</p>
</td></tr>
<tr><td style="padding:0 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#00A676;">
<a href="${ja}" style="display:inline-block;padding:15px 26px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#ffffff;text-decoration:none;">${esc(t.knop)}</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:24px 28px 28px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;">
<p style="margin:0 0 20px 0;">${esc(t.niets)} <a href="${nee}" style="color:#1a1a1a;">${esc(t.afmelden)}</a>.</p>
<p style="margin:0;">${esc(t.groet)}<br>${esc(t.namen)}<br>MOSE</p>
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
<tr><td style="padding:16px 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6b6b6b;">
${esc(t.voet(o.email))}<br>MOSE, Stavangerweg 13, 9723 JC Groningen. <a href="${site()}" style="color:#6b6b6b;">mosewear.com</a> · <a href="{{{ pm:unsubscribe }}}" style="color:#6b6b6b;">${esc(t.uitschrijven)}</a>
</td></tr></table>
</td></tr></table>
</body></html>`

  const tekst = `${t.aanhef}\n\n${t.alinea1}\n\n${t.alinea2}\n\n${t.knop}:\n${ja}\n\n${t.niets}\n${t.afmelden}: ${nee}\n\n${t.groet}\n${t.namen}\nMOSE\n\n${t.voet(o.email)}\nMOSE, Stavangerweg 13, 9723 JC Groningen\n${t.uitschrijven}: {{{ pm:unsubscribe }}}`

  return { onderwerp: t.onderwerp, html, tekst: tekst || htmlToText(html) }
}

async function verstuurEen(o: { email: string; taal: 'nl' | 'en'; token: string; pluk: number }) {
  const mail = bouwMail(o)
  return sendEmail({
    From: AFZENDER,
    To: o.email,
    ReplyTo: 'info@mosewear.com',
    Subject: mail.onderwerp,
    HtmlBody: mail.html,
    TextBody: mail.tekst,
    MessageStream: TOESTEMMING_STREAM,
    Tag: 'toestemming',
    Metadata: { ronde: TOESTEMMING_STREAM, pluk: String(o.pluk) },
    TrackLinks: 'None',
  })
}

// ─── Een pluk ──────────────────────────────────────────────────────────────

export interface PlukUitslag {
  pluk: number | null
  verzonden: number
  overgeslagen: number
  mislukt: number
  gestopt: string | null
  reden?: string
}

export async function verstuurPluk(opties: { negeerWachttijd?: boolean } = {}): Promise<PlukUitslag> {
  const db = createServiceClient()

  const opzet = await zorgVoorPostmark()
  if (!opzet.ok) {
    await stop(`Postmark niet klaar: ${opzet.fout}`)
    return { pluk: null, verzonden: 0, overgeslagen: 0, mislukt: 0, gestopt: opzet.fout || 'postmark' }
  }

  // Grenzen vóór de pluk: bounces en klachten van de vorige pluk zijn er nu.
  const vooraf = await controleerGrenzen(0, { afleverCheck: true })
  if (vooraf) {
    await stop(vooraf)
    return { pluk: null, verzonden: 0, overgeslagen: 0, mislukt: 0, gestopt: vooraf }
  }

  const tempo = await pasTempoAan()
  if (tempo) console.log('[toestemming]', tempo)

  const bundel = await verstuurdLaatste30Dagen()
  if (bundel !== null) {
    const inst = await leesInstellingen()
    const grens = (inst.postmark_bundel || 10000) - ORDERRESERVE
    if (bundel + inst.plukgrootte > grens) {
      return { pluk: null, verzonden: 0, overgeslagen: 0, mislukt: 0, gestopt: null, reden: `bundel: ${bundel} mails in 30 dagen, grens ${grens}` }
    }
  }

  const { data: rijen, error } = await db.rpc('toestemming_claim_pluk', {
    p_negeer_wachttijd: Boolean(opties.negeerWachttijd),
  })
  if (error) throw new Error(`Pluk claimen mislukt: ${error.message}`)
  const lijst = (rijen || []) as Array<{ pluk: number; email: string; taal: string; token: string }>
  if (lijst.length === 0) {
    return { pluk: null, verzonden: 0, overgeslagen: 0, mislukt: 0, gestopt: null, reden: 'niets te doen (uit, buiten venster, wachttijd of lege wachtrij)' }
  }

  const pluk = lijst[0].pluk
  let verzonden = 0
  let overgeslagen = 0
  let mislukt = 0
  const voorBrevo: string[] = []

  for (const r of lijst) {
    // Bounces en klachten op de transactionele stream tellen ook.
    if (await isEmailSuppressed(r.email)) {
      await db.from('toestemming_ontvangers').update({ status: 'mislukt', fout: 'staat op de blokkadelijst' }).eq('email', r.email)
      overgeslagen++
      continue
    }

    const res = await verstuurEen({ email: r.email, taal: r.taal === 'en' ? 'en' : 'nl', token: r.token, pluk })
    if (res.success) {
      await db
        .from('toestemming_ontvangers')
        .update({ status: 'verzonden', verzonden_op: new Date().toISOString(), postmark_id: res.data?.id ?? null })
        .eq('email', r.email)
      verzonden++
      voorBrevo.push(r.email)
    } else {
      const fout = res.error as { ErrorCode?: number; Message?: string; message?: string } | undefined
      const code = fout?.ErrorCode
      const melding = fout?.Message || fout?.message || 'onbekend'
      await db.from('toestemming_ontvangers').update({ status: 'mislukt', fout: `${code ?? ''} ${melding}`.trim() }).eq('email', r.email)
      mislukt++
      if (code === undefined || !FOUT_PER_ADRES.has(code)) {
        // Zet wat nog op 'bezig' staat terug, zodat het bij een herstart meegaat.
        await db.from('toestemming_ontvangers').update({ status: 'wachtrij', pluk: null }).eq('status', 'bezig')
        const reden = `Postmark weigert de verzending: ${melding}`
        await stop(reden)
        return { pluk, verzonden, overgeslagen, mislukt, gestopt: reden }
      }
    }
    // Rustig tempo binnen de pluk; geen salvo van vijftig in één seconde.
    await new Promise((r2) => setTimeout(r2, 250))
  }

  // Wie de toestemmingsmail kreeg, hoort op de opgeschoonde Brevo-lijst
  // (afmeldmodel, keuze Rick 21-10). Afmelden, bounces en klachten blokkeren
  // het contact daarna in Brevo; dat houdt de lijst schoon.
  const inst = await leesInstellingen()
  if (inst.brevo_lijst_id && voorBrevo.length > 0) {
    await voegToeAanLijstBulk(voorBrevo, inst.brevo_lijst_id).catch((e) => console.error('[toestemming] Brevo-lijst', e))
  }

  return { pluk, verzonden, overgeslagen, mislukt, gestopt: null }
}

// ─── Signalen uit de webhook ───────────────────────────────────────────────

export async function verwerkSignaal(email: string, soort: 'bounce' | 'klacht' | 'afgemeld'): Promise<void> {
  const adres = email.trim().toLowerCase()
  if (!adres) return
  const db = createServiceClient()
  const { data } = await db
    .from('toestemming_ontvangers')
    .update({ status: soort, signaal_op: new Date().toISOString(), ...(soort === 'afgemeld' ? { afgemeld_op: new Date().toISOString() } : {}) })
    .eq('email', adres)
    // Een bevestiging laat zich niet door een late bounce overschrijven,
    // een klacht wel: wie klaagt, wil geen mail.
    .in('status', soort === 'klacht' ? ['verzonden', 'bevestigd', 'bezig'] : ['verzonden', 'bezig'])
    .select('pluk, groep')
  if (!data || data.length === 0) return

  // Ook bij een harde bounce: een dood adres hoort niet op de Brevo-lijst.
  await schrijfContactUit(adres)

  if (data[0].groep === 'test') return
  // De plukregel geldt alleen voor de laatste pluk. Een late bounce uit een
  // oudere pluk zette de ronde anders opnieuw stil nadat hij net weer was
  // gestart (23-10, 17:14); de totale bouncegrens telt hem wel gewoon mee.
  const inst = await leesInstellingen()
  if (data[0].pluk !== inst.laatste_pluk) {
    const reden = await controleerGrenzen(0)
    if (reden) await stop(reden)
    return
  }
  const { count } = await db
    .from('toestemming_ontvangers')
    .select('email', { count: 'exact', head: true })
    .eq('pluk', data[0].pluk)
    .eq('status', 'bounce')
  const reden = await controleerGrenzen(count ?? 0)
  if (reden) await stop(reden)
}

// ─── Bevestigen en afmelden vanaf de site ──────────────────────────────────

export async function bevestig(token: string, bewijs: { ip: string | null; browser: string | null }) {
  const db = createServiceClient()
  const { data: rij } = await db.from('toestemming_ontvangers').select('email, taal, status').eq('token', token).maybeSingle()
  if (!rij) return { ok: false as const, reden: 'onbekend' }
  if (rij.status === 'bevestigd') return { ok: true as const, al: true }

  const nu = new Date().toISOString()
  await db
    .from('toestemming_ontvangers')
    .update({ status: 'bevestigd', bevestigd_op: nu, afgemeld_op: null, bevestiging: { op: nu, ...bewijs } })
    .eq('token', token)

  // Bestaat het adres al, dan houdt het zijn oorspronkelijke bron en komt de
  // toestemming in de metadata erbij. Anders een nieuwe rij met bron
  // 'toestemming'. Fouten loggen: de CHECK op `source` weigerde eerder stil.
  const toestemming = { toestemming_bevestigd_op: nu, ip: bewijs.ip, browser: bewijs.browser }
  const { data: abonnee } = await db.from('newsletter_subscribers').select('id, metadata').eq('email', rij.email).maybeSingle()
  const { error: abonneeFout } = abonnee
    ? await db
        .from('newsletter_subscribers')
        .update({
          status: 'active',
          unsubscribed_at: null,
          metadata: { ...((abonnee.metadata as Record<string, unknown>) || {}), ...toestemming },
        })
        .eq('id', abonnee.id)
    : await db.from('newsletter_subscribers').insert({
        email: rij.email,
        status: 'active',
        source: 'toestemming',
        locale: rij.taal,
        subscribed_at: nu,
        metadata: toestemming,
      })
  if (abonneeFout) console.error('[toestemming] nieuwsbriefrij niet bijgewerkt', rij.email, abonneeFout.message)

  const inst = await leesInstellingen()
  if (inst.brevo_lijst_id) await voegToeAanLijst(rij.email, inst.brevo_lijst_id)
  return { ok: true as const, al: false }
}

export async function meldAf(token: string) {
  const db = createServiceClient()
  const { data: rij } = await db.from('toestemming_ontvangers').select('email').eq('token', token).maybeSingle()
  if (!rij) return { ok: false as const }
  const nu = new Date().toISOString()
  await db.from('toestemming_ontvangers').update({ status: 'afgemeld', afgemeld_op: nu }).eq('token', token)
  // Alleen de nieuwsbrief. Geen algemene blokkade: een orderbevestiging moet
  // iemand die later toch bestelt nog steeds krijgen.
  await db.from('newsletter_subscribers').update({ status: 'unsubscribed', unsubscribed_at: nu }).eq('email', rij.email)
  await schrijfContactUit(rij.email)
  return { ok: true as const }
}

// ─── Test en overzicht voor de admin ───────────────────────────────────────

/**
 * Stuurt de echte mail, via de echte stream, naar één testadres. Het adres
 * komt als groep 'test' in de tabel, zodat de links werken en het nooit in de
 * cijfers of de stopregels meetelt.
 */
export async function verstuurTest(email: string, taal: 'nl' | 'en') {
  const adres = email.trim().toLowerCase()
  const db = createServiceClient()
  const opzet = await zorgVoorPostmark()
  if (!opzet.ok) return { ok: false, fout: opzet.fout }

  const { data: bestaand } = await db.from('toestemming_ontvangers').select('token, groep').eq('email', adres).maybeSingle()
  if (bestaand && bestaand.groep !== 'test') return { ok: false, fout: 'Dit adres staat in de echte wachtrij; kies een ander testadres.' }
  if (!bestaand) {
    const { error } = await db.from('toestemming_ontvangers').insert({ email: adres, taal, groep: 'test', status: 'verzonden', prioriteit: 0 })
    if (error) return { ok: false, fout: error.message }
  }
  const { data: rij } = await db.from('toestemming_ontvangers').select('token').eq('email', adres).single()
  await db.from('toestemming_ontvangers').update({ status: 'verzonden', taal, verzonden_op: new Date().toISOString() }).eq('email', adres)
  const res = await verstuurEen({ email: adres, taal, token: rij!.token, pluk: 0 })
  return res.success ? { ok: true } : { ok: false, fout: JSON.stringify(res.error) }
}

export async function overzichtPerPluk() {
  const db = createServiceClient()
  const { data } = await db
    .from('toestemming_ontvangers')
    .select('pluk, status, verzonden_op')
    .not('pluk', 'is', null)
    .neq('groep', 'test')
    .order('pluk', { ascending: false })
    .limit(5000)
  const per = new Map<number, { pluk: number; op: string | null; verzonden: number; bevestigd: number; afgemeld: number; bounces: number; klachten: number; mislukt: number }>()
  for (const r of data || []) {
    const p = per.get(r.pluk) || { pluk: r.pluk, op: null, verzonden: 0, bevestigd: 0, afgemeld: 0, bounces: 0, klachten: 0, mislukt: 0 }
    if (r.verzonden_op) {
      p.verzonden++
      if (!p.op || r.verzonden_op < p.op) p.op = r.verzonden_op
    }
    if (r.status === 'bevestigd') p.bevestigd++
    if (r.status === 'afgemeld') p.afgemeld++
    if (r.status === 'bounce') p.bounces++
    if (r.status === 'klacht') p.klachten++
    if (r.status === 'mislukt') p.mislukt++
    per.set(r.pluk, p)
  }
  return [...per.values()].sort((a, b) => b.pluk - a.pluk).slice(0, 50)
}

/**
 * Afleverstatus van losse berichten bij Postmark, voor controle achteraf
 * (bijvoorbeeld orderbevestigingen tijdens een blokkade).
 */
export async function postmarkBerichten(ids: string[]) {
  return Promise.all(
    ids.slice(0, 20).map(async (id) => {
      const res = await postmark<{ Status?: string; Recipients?: string[]; Subject?: string; MessageStream?: string; MessageEvents?: Array<{ Type: string; ReceivedAt: string; Details?: Record<string, unknown> }> }>(
        `/messages/outbound/${encodeURIComponent(id)}/details`,
      )
      return {
        id,
        http: res.status,
        status: res.data?.Status ?? null,
        stream: res.data?.MessageStream ?? null,
        onderwerp: res.data?.Subject ?? null,
        gebeurtenissen: (res.data?.MessageEvents || []).map((e) => ({ type: e.Type, op: e.ReceivedAt, details: e.Details })),
      }
    }),
  )
}

/** Postmarks eigen tellingen per stream, voor het dashboard. */
export async function postmarkStreamCijfers() {
  const uit: Record<string, unknown> = {}
  for (const stream of [TOESTEMMING_STREAM, 'outbound', 'campagnes']) {
    const res = await postmark<Record<string, number>>(`/stats/outbound?messagestream=${stream}`)
    uit[stream] = res.status === 200 ? res.data : { http: res.status }
  }
  return uit
}

/** Laatste berichten aan één ontvanger, over alle streams. */
export async function postmarkZoekOntvanger(email: string) {
  const res = await postmark<{ Messages?: Array<{ MessageID: string; Status: string; Subject: string; ReceivedAt: string; MessageStream: string }> }>(
    `/messages/outbound?recipient=${encodeURIComponent(email)}&count=20&offset=0`,
  )
  return { http: res.status, berichten: res.data?.Messages || [] }
}
