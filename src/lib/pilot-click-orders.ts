import { createServiceClient } from '@/lib/supabase/service'
import { postmark } from '@/lib/toestemming'
import { getMollieClient } from '@/lib/mollie'
import type { PostmarkStatsRequester } from './postmark-campaign-report'

const CAMPAIGN = 'a24813a0-1db4-4a1c-b79b-880a3be756d2'
const TAG = 'mose-edit-01-hoodie'
const STREAM = 'campagnes'
const DAY = 86_400_000
const PAGE = 500
const CLICK_CAP = 5_000
const ORDER_CAP = 25
const MARKETING = new Set(['marketing', 'insider', 'campaign', 'loyalty'])
const NOTE = 'Gekoppeld op e-mailadres en betaalmoment aan de laatste eerdere campagneklik, maximaal 7 dagen. Latere commerciële mails in de lokale administratie sluiten een order uit. Klikken kunnen automatisch zijn; andere kanalen kunnen de aankoop hebben beïnvloed. Geen bewijs van extra omzet door deze mail. Terugbetaalde orders en testbetalingen uitgesloten; bedrag daadwerkelijk betaald via Mollie, geen winst.'

export type PilotClickOrders = {
  status: 'ok' | 'unavailable'
  paidOrders7d: number | null
  paidRevenue7d: number | null
  coverageNote: string
  error: string | null
}
export interface PilotLedger {
  campagne_id: string; email: string; status: string
  postmark_id: string | null; verzonden_op: string | null
}
export interface PilotOrder {
  id: string; email: string; payment_status: string; status: string
  paid_at: string | null; mollie_payment_id: string | null
  returns: Array<{ status: string; refunded_at: string | null }>
}
export interface CommercialLog {
  recipient_email: string; status: string; email_type: string; template_key: string | null
  sent_at: string | null; metadata: Record<string, unknown> | null
}
export interface PilotClick {
  MessageID: string; MessageStream: string; ReceivedAt: string; OriginalLink: string
  Recipient?: string; Tag?: string
}
export interface PilotOrderSources { orders: PilotOrder[]; campaigns: PilotLedger[]; logs: CommercialLog[] }
export interface PilotOrderCandidate extends PilotOrder { matchedClickAt: number }
export interface PilotAttributionDependencies {
  request: PostmarkStatsRequester
  readLedger: () => Promise<PilotLedger[]>
  readSources: (emails: string[]) => Promise<PilotOrderSources>
  readPayment: (id: string) => Promise<unknown>
  now: () => number
}
class CoverageError extends Error {}
function fail(reason: string): never { throw new CoverageError(reason) }
function email(value: string) { return value.trim().toLowerCase() }
function timestamp(value: string | null): number {
  // Postgres paid_at is timestamp-without-timezone and is stored as UTC by the app.
  // Require an explicit timezone for provider values; normalize DB values at the adapter.
  if (!value || !/(?:Z|[+-]\d\d:\d\d)$/i.test(value)) return fail('Een benodigd tijdstip ontbreekt of is ongeldig.')
  const valueMs = Date.parse(value)
  if (!Number.isFinite(valueMs)) return fail('Een benodigd tijdstip ontbreekt of is ongeldig.')
  return valueMs
}
const dbTime = (value: string | null) => value && !/(?:Z|[+-]\d\d:\d\d)$/i.test(value) ? `${value}Z` : value
function ok(orders = 0, cents = 0): PilotClickOrders {
  return { status: 'ok', paidOrders7d: orders, paidRevenue7d: cents / 100, coverageNote: NOTE, error: null }
}

/** Official schema: https://postmarkapp.com/developer/api/messages-api#message-clicks */
export async function readCompletePilotClicks(request: PostmarkStatsRequester): Promise<PilotClick[]> {
  const clicks: PilotClick[] = []
  let total: number | undefined
  while (true) {
    const query = new URLSearchParams({ tag: TAG, messagestream: STREAM, count: String(PAGE), offset: String(clicks.length) })
    const response = await request<{ TotalCount: number; Clicks: PilotClick[] }>(`/messages/outbound/clicks?${query}`, {
      method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(8_000),
    })
    const data = response.data
    if (response.status !== 200 || !data || !Number.isSafeInteger(data.TotalCount) || data.TotalCount < 0 || !Array.isArray(data.Clicks)) fail('Postmark-klikgegevens zijn niet volledig beschikbaar.')
    if (data.TotalCount > CLICK_CAP || (total !== undefined && total !== data.TotalCount)) fail('De klikgeschiedenis is te groot of veranderde tijdens het ophalen. Vernieuw het overzicht.')
    total = data.TotalCount
    if (data.Clicks.length > PAGE || clicks.length + data.Clicks.length > total) fail('Postmark gaf een onvolledige klikpagina terug.')
    clicks.push(...data.Clicks)
    if (clicks.length === total) return clicks
    if (!data.Clicks.length) fail('Postmark gaf een onvolledige klikpagina terug.')
  }
}

/** Pure matching; does not assert human clicks or incremental causation. */
export function pilotOrderCandidates(ledger: PilotLedger[], clicks: PilotClick[], sources: PilotOrderSources, now: number): PilotOrderCandidate[] {
  if (!Number.isFinite(now)) fail('Het meetmoment is ongeldig.')
  const messages = new Map<string, { email: string; sent: number }>()
  for (const row of ledger) {
    if (row.campagne_id !== CAMPAIGN) fail('De campagneadministratie komt niet overeen.')
    if (row.status === 'bezig') fail('Een verzending wacht nog op controle bij Postmark.')
    if (!row.postmark_id) {
      if (row.verzonden_op) fail('Een verzonden bericht heeft geen Postmark-identificatie.')
      continue
    }
    const mapped = { email: email(row.email), sent: timestamp(row.verzonden_op) }
    const prior = messages.get(row.postmark_id)
    if (prior && (prior.email !== mapped.email || prior.sent !== mapped.sent)) fail('Een bericht heeft tegenstrijdige ontvangergegevens.')
    messages.set(row.postmark_id, mapped)
  }
  const byEmail = new Map<string, Array<{ at: number; sent: number }>>()
  for (const click of clicks) {
    if (click.MessageStream !== STREAM || (click.Tag !== undefined && click.Tag !== TAG)) fail('De klikgegevens horen niet uitsluitend bij deze campagne.')
    const message = messages.get(click.MessageID)
    if (!message || (click.Recipient !== undefined && email(click.Recipient) !== message.email)) fail('Een klik kan niet betrouwbaar aan een ontvanger worden gekoppeld.')
    const at = timestamp(click.ReceivedAt)
    if (at < message.sent || at > now) fail('Een kliktijdstip past niet bij de verzending.')
    let destination: URL
    try { destination = new URL(click.OriginalLink) } catch { return fail('Een klikbestemming is ongeldig.') }
    // Only commercial site links stamped by pilotMail; unsubscribe/external links never qualify.
    if (destination.protocol !== 'https:' || !['mosewear.com', 'www.mosewear.com'].includes(destination.hostname) || destination.searchParams.get('utm_campaign') !== TAG) continue
    if (/(?:^|\/)(?:unsubscribe|uitschrijven|afmelden)(?:\/|$)/i.test(destination.pathname) || destination.searchParams.has('unsubscribe')) continue
    const existing = byEmail.get(message.email) || []
    existing.push({ at, sent: message.sent }); byEmail.set(message.email, existing)
  }
  const candidates = new Map<string, PilotOrderCandidate>()
  const seenOrders = new Map<string, string>()
  for (const order of sources.orders) {
    if (!order.id) fail('Een order mist een identificatie.')
    const serialized = JSON.stringify(order)
    if (seenOrders.has(order.id) && seenOrders.get(order.id) !== serialized) fail('Een order heeft tegenstrijdige gegevens.')
    seenOrders.set(order.id, serialized)
    const recipient = email(order.email)
    const recipientClicks = byEmail.get(recipient)
    if (!recipientClicks || order.payment_status !== 'paid' || ['cancelled', 'canceled', 'refunded', 'returned'].includes(order.status)) continue
    if (!Array.isArray(order.returns)) fail('Retourgegevens ontbreken.')
    if (order.returns.some(r => r.status === 'refunded' || r.refunded_at !== null)) continue
    const paid = timestamp(order.paid_at)
    if (paid > now) fail('Een betaalmoment ligt in de toekomst.')
    const latest = recipientClicks.filter(c => c.at < paid).sort((a, b) => b.at - a.at)[0]
    if (!latest || paid - latest.at > 7 * DAY) continue
    // Conservative: another commercial send after this pilot message and before payment
    // disqualifies the order, even if its recipient later clicked the older pilot mail.
    const laterCampaign = sources.campaigns.some(row => {
      if (email(row.email) !== recipient || row.campagne_id === CAMPAIGN) return false
      if (!row.verzonden_op && ['mislukt', 'wachtend', 'overgeslagen'].includes(row.status)) return false
      const at = timestamp(row.verzonden_op)
      return at > latest.sent && at <= paid
    })
    const laterLog = sources.logs.some(log => {
      if (email(log.recipient_email) !== recipient || log.status !== 'sent') return false
      if (!MARKETING.has(log.email_type) && log.template_key !== 'abandoned_cart' && !(log.metadata?.message_stream && log.metadata.message_stream !== 'outbound')) return false
      // An optional duplicate of the pilot's own ledger entry is not another campaign.
      if (log.metadata?.campaign_slug === TAG || log.metadata?.campagne_id === CAMPAIGN) return false
      const at = timestamp(log.sent_at)
      return at > latest.sent && at <= paid
    })
    if (laterCampaign || laterLog) continue
    candidates.set(order.id, { ...order, matchedClickAt: latest.at })
  }
  return [...candidates.values()]
}

function euroCents(amount: unknown): number {
  if (!amount || typeof amount !== 'object') return fail('Het betaalde bedrag kon niet worden gecontroleerd.')
  const value = amount as Record<string, unknown>
  if (value.currency !== 'EUR' || typeof value.value !== 'string' || !/^\d+\.\d{2}$/.test(value.value)) return fail('Het betaalde bedrag kon niet in euro worden gecontroleerd.')
  const cents = Math.round(Number(value.value) * 100)
  if (!Number.isSafeInteger(cents)) fail('Het betaalde bedrag is ongeldig.')
  return cents
}
function verifiedPaymentCents(value: unknown, order: PilotOrderCandidate, now: number): number | null {
  if (!value || typeof value !== 'object') return fail('Betaalgegevens ontbreken.')
  const payment = value as Record<string, unknown>
  if (payment.id !== order.mollie_payment_id) fail('De betaling hoort niet bij deze order.')
  if (payment.mode === 'test') return null
  if (payment.mode !== 'live') fail('Live- of testbetaling kon niet worden vastgesteld.')
  if (payment.status !== 'paid') return null
  if (typeof payment.paidAt !== 'string') fail('Het echte betaalmoment ontbreekt bij Mollie.')
  const providerPaid = timestamp(payment.paidAt)
  if (providerPaid > now) fail('Het echte betaalmoment ligt in de toekomst.')
  // orders.paid_at is currently webhook-processing time. A delayed webhook must not
  // turn a payment made BEFORE the click into a post-click conversion.
  if (providerPaid <= order.matchedClickAt || providerPaid - order.matchedClickAt > 7 * DAY) return null
  const metadata = payment.metadata as Record<string, unknown> | undefined
  if (metadata?.orderId !== order.id) fail('De betaling kan niet aan deze order worden bevestigd.')
  // Exclude any partial/full refund or chargeback rather than report a gross amount as net.
  for (const key of ['amountRefunded', 'amountChargedBack', 'amountCanceled']) {
    if (payment[key] !== undefined && euroCents(payment[key]) > 0) return null
  }
  for (const key of ['hasRefunds', 'hasChargebacks']) {
    if (payment[key] === true || (typeof payment[key] === 'function' && (payment[key] as () => boolean).call(payment))) return null
  }
  return euroCents(payment.amount)
}

async function rows<T>(query: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const result = await query
  if (result.error || !Array.isArray(result.data) || result.data.length >= 1000) fail('De lokale order- of mailgeschiedenis is niet volledig leesbaar.')
  return result.data
}
async function paymentWithinTimeout(read: () => Promise<unknown>): Promise<unknown> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([read(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new CoverageError('De betaalcontrole duurde te lang. Probeer opnieuw.')), 8_000)
    })])
  } finally { if (timer !== undefined) clearTimeout(timer) }
}
function defaultDependencies(): PilotAttributionDependencies {
  // Construct clients lazily: a valid empty ledger needs no provider request.
  const db = () => createServiceClient()
  const ledgerFields = 'campagne_id,email,status,postmark_id,verzonden_op'
  const escapedLike = (value: string) => value.replace(/[\\%_]/g, '\\$&')
  return {
    request: postmark,
    readLedger: () => rows<PilotLedger>(db().from('campagne_ontvangers').select(ledgerFields).eq('campagne_id', CAMPAIGN).limit(1000)),
    readSources: async emails => {
      const results = await Promise.all(emails.map(async address => {
        const [orders, campaigns, logs] = await Promise.all([
          rows<PilotOrder>(db().from('orders').select('id,email,payment_status,status,paid_at,mollie_payment_id,returns(status,refunded_at)').ilike('email', escapedLike(address)).limit(1000)),
          rows<PilotLedger>(db().from('campagne_ontvangers').select(ledgerFields).ilike('email', escapedLike(address)).limit(1000)),
          rows<CommercialLog>(db().from('order_emails').select('recipient_email,status,email_type,template_key,sent_at,metadata').ilike('recipient_email', escapedLike(address)).eq('status', 'sent').limit(1000)),
        ])
        return { orders: orders.map(o => ({ ...o, paid_at: dbTime(o.paid_at) })), campaigns, logs }
      }))
      return { orders: results.flatMap(r => r.orders), campaigns: results.flatMap(r => r.campaigns), logs: results.flatMap(r => r.logs) }
    },
    readPayment: id => getMollieClient().payments.get(id),
    now: Date.now,
  }
}

/** Read-only, bounded pilot attribution. A missing source means unknown, never zero. */
export async function getPilotClickOrders(
  expectedUniqueLinks: number | null,
  deps: PilotAttributionDependencies = defaultDependencies(),
): Promise<PilotClickOrders> {
  try {
    const ledger = await deps.readLedger()
    if (!ledger.length) {
      if (expectedUniqueLinks !== 0) fail('Er is geen verzendadministratie waarmee de klikdekking kan worden bevestigd.')
      return ok()
    }
    const clicks = await readCompletePilotClicks(deps.request)
    // Stats outlive detailed message retention. Do not silently lose older click evidence.
    if (expectedUniqueLinks === null || !Number.isSafeInteger(expectedUniqueLinks) || expectedUniqueLinks < 0 || clicks.length < expectedUniqueLinks) fail('Klikdekking kan niet worden bevestigd; de bewaartermijn kan zijn verstreken.')
    const now = deps.now()
    // Validate ledger/click identity and timestamps even when there are no candidate orders.
    pilotOrderCandidates(ledger, clicks, { orders: [], campaigns: [], logs: [] }, now)
    if (!clicks.length) return ok()
    const sources = await deps.readSources([...new Set(ledger.map(r => email(r.email)))])
    const candidates = pilotOrderCandidates(ledger, clicks, sources, now)
    if (candidates.length > ORDER_CAP) fail('Meer dan 25 betalingen vragen controle; het overzicht is nog onbekend.')
    let count = 0; let cents = 0
    if (candidates.some(order => !order.mollie_payment_id)) fail('Een mogelijke order heeft geen verifieerbare Mollie-betaling.')
    for (let offset = 0; offset < candidates.length; offset += 5) {
      const payments = await Promise.all(candidates.slice(offset, offset + 5).map(async order =>
        verifiedPaymentCents(await paymentWithinTimeout(() => deps.readPayment(order.mollie_payment_id!)), order, now)))
      for (const paid of payments) if (paid !== null) { count++; cents += paid }
    }
    return ok(count, cents)
  } catch (error) {
    return { status: 'unavailable', paidOrders7d: null, paidRevenue7d: null, coverageNote: NOTE,
      error: error instanceof CoverageError ? error.message : 'Klik-, order- of betaalgegevens tijdelijk niet beschikbaar. Probeer opnieuw.' }
  }
}
