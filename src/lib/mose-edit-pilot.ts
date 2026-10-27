import 'server-only'
import { createHash } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { postmark, leesInstellingen, verstuurdLaatste30Dagen, ORDERRESERVE } from '@/lib/toestemming'
import { roep } from '@/lib/brevo'
import { htmlToText } from '@/lib/postmark'
import { MOSE_EDIT_PILOT_CONFIG as config, MOSE_EDIT_PILOT_CONFIG_READY } from './mose-edit-pilot-config-server'

export const MOSE_EDIT_PILOT = config
const DAY = 86_400_000
const HOODIE = '3692f227-52fc-41d5-911c-5c539448070b'
const MARKETING = new Set(['marketing', 'insider', 'campaign', 'loyalty'])
type Send = { id: string; at: string }
type Campaign = { id: string; slug: string; onderwerp: string; html: string; status: string }
type Moment = { id: string; label: string; start_op: string }
type Result = { moment: string | null; verzonden: number; mislukt: number; reden?: string }

/** Inclusive 7-day gap; fewer than two sends in the open rolling 30-day window. */
export function pilotFrequency(sends: Send[], now: number, minimumGapDays = 7, maximumIn30Days = 2): boolean {
  if (!Number.isFinite(now) || !Number.isFinite(minimumGapDays) || minimumGapDays < 0 || !Number.isInteger(maximumIn30Days) || maximumIn30Days < 1 || maximumIn30Days > 3) return false
  const unique = new Map<string, number>()
  for (const s of sends) {
    const time = Date.parse(s.at)
    if (!Number.isFinite(time) || !s.id) return false
    unique.set(s.id, Math.max(unique.get(s.id) ?? 0, time))
  }
  const times = [...unique.values()]
  return !times.some(t => t > now - minimumGapDays * DAY) && times.filter(t => t > now - 30 * DAY).length < maximumIn30Days
}

type Signup = { source: string; subscribed_at: string | null }
type Consent = { status: string; groep: string; bevestigd_op: string | null }
export function hasPilotConsent(subscriber: Signup, consent: Consent | undefined, proofKind: string, now: number): boolean {
  if (!Number.isFinite(now) || consent?.groep === 'test' || ['afgemeld', 'bounce', 'klacht', 'vastgehouden'].includes(consent?.status || '')) return false
  const within = (date: string | null | undefined, days: number) => {
    const at = Date.parse(date || '')
    return Number.isFinite(at) && at <= now && at >= now - days * DAY
  }
  if (proofKind === 'confirmed') return consent?.status === 'bevestigd' && within(consent.bevestigd_op, 90)
  // These sources require submitting the newsletter/insider form. Imported records
  // and historical checkout checkboxes are not treated as this evidence.
  return proofKind === 'site-signup' && ['homepage', 'early_access', 'early_access_landing'].includes(subscriber.source) && within(subscriber.subscribed_at, 365)
}

export function pilotMail(html: string, label: string) {
  const moment = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
  const result = html.replace(/href="(https:\/\/(?:www\.)?mosewear\.com[^\"]*)"/g, (_, encoded: string) => {
    const u = new URL(encoded.replaceAll('&amp;', '&'))
    if (!['mosewear.com', 'www.mosewear.com'].includes(u.hostname)) return `href="${encoded}"`
    u.searchParams.set('utm_source', 'nieuwsbrief')
    u.searchParams.set('utm_medium', 'email')
    u.searchParams.set('utm_campaign', config.slug)
    u.searchParams.set('utm_term', moment)
    return `href="${u.href.replaceAll('&', '&amp;')}"`
  })
  // Preserve destinations in the text alternative; the shared converter strips anchors.
  const textSource = result.replace(/<head>[\s\S]*?<\/head>/gi, '')
    .replace(/<div style="display:none[\s\S]*?<\/div>/gi, '')
    .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_match, attributes: string, body: string) => {
      const href = attributes.match(/href="([^"]+)"/i)?.[1]
      const label = htmlToText(body).trim() || body.match(/alt="([^"]+)"/i)?.[1] || 'Bekijk de productbeelden'
      return href ? `${label} (${href})` : label
    })
  return { html: result, tekst: htmlToText(textSource).replaceAll('&#8594;', '→').replaceAll('&#8599;', '↗') }
}

async function checked<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<NonNullable<T>> {
  const r = await p
  if (r.error || r.data === null) throw new Error('Proefcontrole: database niet volledig leesbaar')
  return r.data as NonNullable<T>
}
async function pm<T>(path: string, init: RequestInit = {}): Promise<T> {
  const readOnly = !init.method || init.method === 'GET'
  for (let attempt = 0; ; attempt++) {
    const r = await postmark<T>(path, { ...init, signal: AbortSignal.timeout(25_000) })
    if (r.status >= 200 && r.status < 300 && r.data) return r.data
    if (readOnly && attempt < 2 && [429, 500, 502, 503, 504].includes(r.status)) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
      continue
    }
    // No automatic retries for POST /email, even when acceptance is uncertain.
    throw new Error(`Proefcontrole: Postmark HTTP ${r.status} op ${path.split('?')[0]}`)
  }
}
type Message = { MessageID: string; ReceivedAt: string; Tag?: string; MessageStream: string }

/** Fixed, reviewed roster: IDs plus email hash prevent a changed subscriber from replacing a recipient. */
export async function eligiblePilotRecipients(now = Date.now(), diagnostics?: Record<string, number>) {
  if (!MOSE_EDIT_PILOT_CONFIG_READY) throw new Error('Privéconfiguratie van de proefgroep ontbreekt of is ongeldig')
  const excluded = (reason: string) => { if (diagnostics) diagnostics[reason] = (diagnostics[reason] || 0) + 1 }
  const db = createServiceClient()
  if (config.roster.length > 100 || config.roster.length === 0) throw new Error('Ongeldige proefgroep')
  const subscribers = await checked(db.from('newsletter_subscribers').select('id,email,status,source,subscribed_at,suppressed_at,bounced_at,unsubscribed_at').in('id', config.roster.map(r => r.id)))
  const addresses = subscribers.map(s => s.email.toLowerCase())
  if (!addresses.length) return []
  const [consent, suppressed, history, logs, orders, existing, streamResponse] = await Promise.all([
    checked(db.from('toestemming_ontvangers').select('email,status,groep,bevestigd_op').in('email', addresses)),
    checked(db.from('email_suppressions').select('email').in('email', addresses)),
    checked(db.from('campagne_ontvangers').select('email,status,postmark_id,campagne_id,verzonden_op').in('email', addresses)),
    checked(db.from('order_emails').select('id,recipient_email,email_type,template_key,sent_at,resend_id,metadata').in('recipient_email', addresses).eq('status', 'sent').gte('sent_at', new Date(now - 30 * DAY).toISOString())),
    checked(db.from('orders').select('email,order_items(product_id)').in('email', addresses)),
    checked(db.from('campagne_ontvangers').select('email,status').eq('campagne_id', config.campaignId)),
    pm<{ MessageStreams: { ID: string; MessageStreamType: string; ArchivedAt: string | null }[] }>('/message-streams'),
  ])
  // Fail closed on PostgREST's default row cap; this tiny roster should never hit it.
  if ([consent, suppressed, history, logs, orders, existing].some(rows => rows.length >= 1000)) throw new Error('Proefcontrole: onvolledige historie')
  if (existing.some(r => r.status === 'bezig')) throw new Error('Een eerdere verzending moet eerst met Postmark worden vergeleken')
  if (existing.some(r => ['bounce', 'klacht', 'afgemeld', 'mislukt'].includes(r.status))) throw new Error('Een ontvangerssignaal vraagt beoordeling van de proef')
  const streams = streamResponse.MessageStreams.filter(s => s.MessageStreamType === 'Broadcasts').map(s => s.ID)
  if (!streams.includes('campagnes') || streamResponse.MessageStreams.find(s => s.ID === 'campagnes')?.ArchivedAt) throw new Error('Campagnestream niet actief')
  const deny = new Set(suppressed.map(s => s.email.toLowerCase()))
  for (const s of streams) {
    const response = await pm<{ Suppressions: { EmailAddress: string }[] }>(`/message-streams/${encodeURIComponent(s)}/suppressions/dump`)
    if (!Array.isArray(response.Suppressions)) throw new Error('Blokkadelijst ontbreekt')
    for (const row of response.Suppressions) deny.add(row.EmailAddress.toLowerCase())
  }
  for (const h of history) if (['bounce', 'klacht', 'afgemeld'].includes(h.status)) deny.add(h.email.toLowerCase())
  for (const o of orders) if (o.order_items.some(i => i.product_id === HOODIE)) deny.add(o.email.toLowerCase())
  const result: string[] = []
  const consider = async (s: typeof subscribers[number]) => {
    const email = s.email.toLowerCase()
    const roster = config.roster.find(r => r.id === s.id)
    const proof = consent.find(c => c.email.toLowerCase() === email)
    if (!roster || createHash('sha256').update(email).digest('hex') !== roster.emailHash) return excluded('identity_changed')
    if (s.status !== 'active' || s.suppressed_at || s.bounced_at || s.unsubscribed_at || deny.has(email)) return excluded('blocked_or_buyer')
    if (s.source !== roster.source || !hasPilotConsent(s, proof, roster.proofKind, now)) return excluded('signup_evidence')
    if (existing.some(r => r.email.toLowerCase() === email)) return excluded('already_claimed')
    const sends: Send[] = history.filter(h => h.email.toLowerCase() === email && h.verzonden_op).map(h => ({ id: h.postmark_id || h.campagne_id, at: h.verzonden_op! }))
    for (const l of logs.filter(l => l.recipient_email.toLowerCase() === email)) {
      if (MARKETING.has(l.email_type) || l.template_key === 'abandoned_cart' || (l.metadata?.message_stream && l.metadata.message_stream !== 'outbound')) sends.push({ id: l.resend_id || l.id, at: l.sent_at })
    }
    // Provider history catches sends whose local logging failed. Explicit stream filter is mandatory.
    for (const stream of streams.filter(s => s !== 'toestemming-2026')) {
      const h = await pm<{ TotalCount: number; Messages: Message[] }>(`/messages/outbound?count=500&offset=0&recipient=${encodeURIComponent(email)}&messagestream=${encodeURIComponent(stream)}`)
      if (!Array.isArray(h.Messages) || h.TotalCount > 500 || h.Messages.length !== h.TotalCount) throw new Error('Onvolledige Postmark-historie')
      for (const message of h.Messages) sends.push({ id: message.MessageID, at: message.ReceivedAt })
    }
    const brevo = await roep<{ emailBlacklisted?: boolean; statistics?: { messagesSent?: { campaignId: number; eventTime: string }[]; hardBounces?: unknown[]; softBounces?: unknown[]; complaints?: unknown[] } }>(`/contacts/${encodeURIComponent(email)}`)
    if (!brevo.ok && brevo.status !== 404) throw new Error('Brevo-uitsluitingen niet controleerbaar')
    if (brevo.data?.emailBlacklisted) return excluded('brevo_blacklisted')
    if (brevo.data?.statistics?.hardBounces?.length || brevo.data?.statistics?.softBounces?.length || brevo.data?.statistics?.complaints?.length) return excluded('brevo_bounce_or_complaint')
    for (const message of brevo.data?.statistics?.messagesSent || []) sends.push({ id: `brevo:${message.campaignId}`, at: message.eventTime })
    if (pilotFrequency(sends, now, config.minimumGapDays, config.maximumCommercialEmails30d)) result.push(email)
    else {
      excluded(sends.some(s => !Number.isFinite(Date.parse(s.at))) ? 'invalid_history_timestamp' : sends.some(s => Date.parse(s.at) > now) ? 'future_history_timestamp' : 'frequency')
      if (diagnostics) for (const id of new Set(sends.filter(s => Date.parse(s.at) > now - 30 * DAY && s.id.startsWith('brevo:')).map(s => s.id))) excluded(`recent_${id}`)
    }
  }
  // Bound provider concurrency so a larger reviewed group fits the cron runtime.
  for (let offset = 0; offset < subscribers.length; offset += 3) await Promise.all(subscribers.slice(offset, offset + 3).map(consider))
  return result.sort()
}

/** Separate runner. The legacy broad-list RPC is never called for this campaign.
 * Its database wachttijd_minuten is deliberately 52,560,000 (100 years): an
 * older deployment must also fail closed instead of selecting the old list.
 * The one-off immediate-send instruction permits a zero-day gap for this campaign;
 * the rolling two-commercial-messages limit and recipient uniqueness still apply.
 */
export async function runMoseEditPilot(c: Campaign, m: Moment, now = Date.now()): Promise<Result> {
  if (!MOSE_EDIT_PILOT_CONFIG_READY) return { moment: m.label, verzonden: 0, mislukt: 0, reden: 'Privéconfiguratie van de proefgroep ontbreekt of is ongeldig; niets verstuurd' }
  const db = createServiceClient()
  const result: Result = { moment: m.label, verzonden: 0, mislukt: 0 }
  if (c.id !== config.campaignId || c.slug !== config.slug || c.status !== 'actief') return { ...result, reden: 'proef niet actief' }
  if (now < Date.parse(config.startAt)) return { ...result, reden: 'verzendmoment nog niet begonnen' }
  const stop = async (reason: string) => {
    await checked(db.from('campagnes').update({ status: 'gestopt', stopreden: reason, gestopt_op: new Date().toISOString() }).eq('id', c.id).select('id'))
    return { ...result, reden: reason }
  }
  if (now >= Date.parse(config.endAt)) {
    await checked(db.from('campagne_momenten').update({ status: 'klaar', klaar_op: new Date().toISOString() }).eq('id', m.id).select('id'))
    await checked(db.from('campagnes').update({ status: 'klaar' }).eq('id', c.id).select('id'))
    return { ...result, reden: 'proefvenster gesloten; geen automatische vervolgverzending' }
  }
  if (c.onderwerp !== config.subject || createHash('sha256').update(c.html).digest('hex') !== config.htmlSha256) return stop('Campagne-inhoud gewijzigd; controleer de nieuwe versie')
  try {
    const product = await checked(db.from('products').select('base_price,sale_price,is_active,product_variants(color,is_available,stock_quantity)').eq('id', HOODIE).single<{
      base_price: number; sale_price: number | null; is_active: boolean;
      product_variants: { color: string; is_available: boolean; stock_quantity: number }[];
    }>())
    if (!product.is_active || Number(product.sale_price ?? product.base_price) !== 79 || ['Bruin', 'Groen', 'Zwart'].some(color => !product.product_variants.some(v => v.color === color && v.is_available && v.stock_quantity > 0))) return stop('Hoodieprijs of beschikbaarheid wijkt af van de mail; controleer de campagne')
    const stats = await pm<{ Bounced: number; SpamComplaints: number }>(`/stats/outbound?tag=${config.slug}&messagestream=campagnes`)
    if (!Number.isFinite(stats.Bounced) || !Number.isFinite(stats.SpamComplaints)) return stop('Providersignalen niet controleerbaar')
    if (stats.Bounced || stats.SpamComplaints) return stop('Bounce of klacht in de proef; beoordeel vóór verdere verzending')
    const eligible = await eligiblePilotRecipients(now)
    if (!eligible.length) {
      await checked(db.from('campagne_momenten').update({ status: 'klaar', klaar_op: new Date().toISOString() }).eq('id', m.id).select('id'))
      await checked(db.from('campagnes').update({ status: 'klaar' }).eq('id', c.id).select('id'))
      return { ...result, reden: 'proef afgerond; overige kandidaten uitgesloten of zonder frequentieruimte' }
    }
    const [settings, usage] = await Promise.all([leesInstellingen(), verstuurdLaatste30Dagen()])
    if (usage === null) return stop('Bundelgebruik niet controleerbaar')
    if (!Number.isInteger(config.batchSize) || config.batchSize < 1 || config.batchSize > 25) return stop('Ongeldige batchgrootte')
    if (usage + config.batchSize > settings.postmark_bundel - ORDERRESERVE) return { ...result, reden: 'wacht op ruimte binnen de Postmark-bundel' }
    const mail = pilotMail(c.html, m.label)
    for (const email of eligible.slice(0, config.batchSize)) {
      // Re-read the switch and local consent immediately before each atomic claim.
      const active = await checked(db.from('campagnes').select('status').eq('id', c.id).single<{ status: string }>())
      if (active.status !== 'actief') break
      const sub = await checked(db.from('newsletter_subscribers').select('status,suppressed_at,bounced_at,unsubscribed_at').eq('email', email).single<{ status: string; suppressed_at: string | null; bounced_at: string | null; unsubscribed_at: string | null }>())
      if (sub.status !== 'active' || sub.suppressed_at || sub.bounced_at || sub.unsubscribed_at) continue
      const claim = await checked(db.from('campagne_ontvangers').upsert({ campagne_id: c.id, moment_id: m.id, email, status: 'bezig' }, { onConflict: 'campagne_id,email', ignoreDuplicates: true }).select('email'))
      if (!claim.length) continue // Another cron request owns this recipient. Never retry an uncertain send.
      await checked(db.from('campagne_momenten').update({ status: 'bezig', gestart_op: new Date().toISOString() }).eq('id', m.id).select('id'))
      const answer = await pm<{ ErrorCode: number; MessageID?: string; SubmittedAt?: string }>('/email', { method: 'POST', body: JSON.stringify({
        From: 'MOSE <info@mosewear.com>', To: email, ReplyTo: 'info@mosewear.com', Subject: c.onderwerp,
        HtmlBody: mail.html, TextBody: mail.tekst, MessageStream: 'campagnes', Tag: config.slug,
        Metadata: { campagne: config.slug, moment: m.label, campagne_id: c.id, moment_id: m.id }, TrackLinks: 'HtmlAndText', TrackOpens: false,
      }) })
      if (answer.ErrorCode !== 0 || !answer.MessageID) {
        await checked(db.from('campagne_ontvangers').update({ status: 'mislukt', fout: `Postmark-code ${answer.ErrorCode}` }).eq('campagne_id', c.id).eq('email', email).select('email'))
        result.mislukt++
        return stop('Postmark heeft een proefmail geweigerd; controle vereist')
      }
      // Update only our pending claim: an already recorded bounce/unsubscribe must not be overwritten.
      await checked(db.from('campagne_ontvangers').update({ postmark_id: answer.MessageID, verzonden_op: answer.SubmittedAt || new Date().toISOString() }).eq('campagne_id', c.id).eq('email', email).select('email'))
      await checked(db.from('campagne_ontvangers').update({ status: 'verzonden' }).eq('campagne_id', c.id).eq('email', email).eq('status', 'bezig').select('email'))
      result.verzonden++
    }
    return result
  } catch {
    return stop('Verzendcontrole of Postmark-antwoord onzeker. Geen automatische herhaling; vergelijk eerst het verzendlog.')
  }
}
