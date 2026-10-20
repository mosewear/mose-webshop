/**
 * Toestemmingsronde voor de oude maillijst.
 *
 * Eén mail per adres met de vraag of het op de lijst wil blijven. Wie op de
 * knop drukt, komt in Brevo-lijst "Toestemming bevestigd" en in
 * newsletter_subscribers, met tijdstip, IP en browser als bewijs. Wie niets
 * doet, krijgt niets meer.
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
import { schrijfContactUit, voegToeAanLijst } from '@/lib/brevo'

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

async function postmark<T>(pad: string, init: RequestInit = {}): Promise<{ status: number; data: T | null }> {
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
  const stream = await postmark<{ ID?: string }>(`/message-streams/${TOESTEMMING_STREAM}`)
  if (stream.status === 404 || (stream.status === 422 && !stream.data?.ID)) {
    const nieuw = await postmark<{ ID?: string; Message?: string }>('/message-streams', {
      method: 'POST',
      body: JSON.stringify({
        ID: TOESTEMMING_STREAM,
        Name: 'Toestemmingsronde 2026',
        Description: 'Eenmalige vraag aan de oude lijst of ze mail willen blijven ontvangen',
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
    `/webhooks?MessageStream=${TOESTEMMING_STREAM}`,
  )
  const url = `${site()}/api/postmark-webhook`
  if (!lijst.data?.Webhooks?.some((w) => w.Url === url)) {
    const maak = await postmark<{ Message?: string }>('/webhooks', {
      method: 'POST',
      body: JSON.stringify({
        Url: url,
        MessageStream: TOESTEMMING_STREAM,
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
async function postmarkTellingen(): Promise<{ bounces: number; klachten: number } | null> {
  const res = await postmark<{ Bounced?: number; SpamComplaints?: number }>(
    `/stats/outbound?messagestream=${TOESTEMMING_STREAM}`,
  )
  if (res.status !== 200 || !res.data) return null
  return { bounces: res.data.Bounced ?? 0, klachten: res.data.SpamComplaints ?? 0 }
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
export async function controleerGrenzen(plukBounces = 0): Promise<string | null> {
  const db = createServiceClient()
  const [inst, eigen, pm, test] = await Promise.all([
    leesInstellingen(),
    leesCijfers(),
    postmarkTellingen(),
    db.from('toestemming_ontvangers').select('status').eq('groep', 'test').in('status', ['bounce', 'klacht']),
  ])
  const verzonden = eigen.verzonden
  if (verzonden === 0) return null
  // Postmarks tellingen bevatten ook de testmails naar de simulatoradressen.
  // Die eerst eraf, anders legt een test later de echte ronde stil. Postmark
  // telt een spammelding als bounce, dus alle testsignalen gaan van de bounces.
  const testSignalen = (test.data || []).length
  const klachten = Math.max(eigen.klachten, pm?.klachten ?? 0)
  const bounces = Math.max(eigen.bounces, (pm?.bounces ?? 0) - testSignalen)
  const pct = (n: number) => Math.round((n / verzonden) * 10000) / 100

  if (klachten > 0 && pct(klachten) > inst.max_klacht_pct) {
    return `${klachten} spamklacht${klachten === 1 ? '' : 'en'} op ${verzonden} verstuurd (${pct(klachten)}%, grens ${inst.max_klacht_pct}%)`
  }
  if (verzonden >= 100 && pct(bounces) > inst.max_bounce_pct) {
    return `${bounces} bounces op ${verzonden} verstuurd (${pct(bounces)}%, grens ${inst.max_bounce_pct}%)`
  }
  if (plukBounces >= inst.max_bounces_pluk) {
    return `${plukBounces} bounces in één pluk (grens ${inst.max_bounces_pluk})`
  }
  return null
}

// ─── De mail ───────────────────────────────────────────────────────────────

const TEKST = {
  nl: {
    onderwerp: 'Wil je nog mail van MOSE?',
    voorvertoning: 'Eén klik en je blijft op de lijst. Doe je niets, dan mailen we je niet meer.',
    aanhef: 'Hoi,',
    alinea1: 'Je adres staat op de maillijst van MOSE, het kledingmerk uit Groningen. We ruimen die lijst op en mailen voortaan alleen nog mensen die dat zelf willen.',
    alinea2: 'Wil je horen over nieuwe drops en restocks? Bevestig het dan met de knop hieronder.',
    knop: 'Ja, ik blijf op de lijst',
    niets: 'Doe je niets, dan krijg je geen mail meer van ons. Liever meteen weg?',
    afmelden: 'Meld je hier af',
    groet: 'Groet,',
    namen: 'Irma en Rick',
    voet: (email: string) => `Je krijgt deze mail eenmalig omdat ${email} op de maillijst van MOSE staat.`,
    uitschrijven: 'Uitschrijven',
  },
  en: {
    onderwerp: 'Still want emails from MOSE?',
    voorvertoning: 'One click and you stay on the list. Do nothing and we will stop emailing you.',
    aanhef: 'Hi,',
    alinea1: 'Your address is on the mailing list of MOSE, the clothing brand from Groningen. We are cleaning up that list and from now on we only email people who want to hear from us.',
    alinea2: 'Want to hear about new drops and restocks? Confirm with the button below.',
    knop: 'Yes, keep me on the list',
    niets: 'If you do nothing, you will not get any more emails from us. Rather leave now?',
    afmelden: 'Unsubscribe here',
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
  const vooraf = await controleerGrenzen()
  if (vooraf) {
    await stop(vooraf)
    return { pluk: null, verzonden: 0, overgeslagen: 0, mislukt: 0, gestopt: vooraf }
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

  if (soort !== 'bounce') await schrijfContactUit(adres)

  if (data[0].groep === 'test') return
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
