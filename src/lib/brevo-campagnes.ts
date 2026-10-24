/**
 * Cijfers van de campagnes die via Brevo gaan (sinds 24-10-2026), voor
 * /admin/email-marketing.
 *
 * Brevo levert wat er in de mailbox gebeurt: afgeleverd, opens, kliks per
 * link, afmeldingen, klachten, bounces. Wat daarna op de site gebeurt, halen
 * we uit onze eigen data, gekoppeld via utm_campaign en utm_content op de
 * links:
 *   bezoekers        unieke sessies die met utm_campaign binnenkwamen
 *   orders na klik   aankopen in hetzelfde bezoek als de klik (de site houdt
 *                    sessies per tabblad bij en heeft geen vaste
 *                    bezoekers-id; komt die er, dan telt hij 7 dagen mee)
 *   orders ontvangers  bestellingen binnen 72 uur na verzending door iemand
 *                    die op de lijst stond, ook zonder klik (bijvoorbeeld
 *                    later zelf naar de site getypt)
 */

import { roep } from '@/lib/brevo'
import { createServiceClient } from '@/lib/supabase/service'

/** Campagnes van voor de opgeschoonde lijst laten we weg. */
const VANAF = '2026-10-23T00:00:00Z'
const KLIKVENSTER_MS = 7 * 86_400_000
const ONTVANGERVENSTER_MS = 72 * 3_600_000

interface BrevoStats {
  sent?: number
  delivered?: number
  uniqueViews?: number
  trackableViews?: number
  appleMppOpens?: number
  uniqueClicks?: number
  clickers?: number
  unsubscriptions?: number
  complaints?: number
  hardBounces?: number
  softBounces?: number
}

interface BrevoCampagneRuw {
  id: number
  name: string
  subject: string
  status: string
  createdAt: string
  scheduledAt?: string | null
  sentDate?: string | null
  htmlContent?: string
  statistics?: { globalStats?: BrevoStats; linksStats?: Record<string, number>; remaining?: number }
}

export interface BrevoLink {
  plek: string
  kliks: number
  bezoekers: number
}

export interface BrevoCampagne {
  id: number
  naam: string
  onderwerp: string
  status: string
  verzendmoment: string | null
  utm: string | null
  ontvangersGepland: number | null
  mailbox: Required<BrevoStats>
  bezoekers: number
  ordersNaKlik: { aantal: number; omzet: number }
  ordersOntvangers: { aantal: number; omzet: number }
  links: BrevoLink[]
}

function leeg(): Required<BrevoStats> {
  return { sent: 0, delivered: 0, uniqueViews: 0, trackableViews: 0, appleMppOpens: 0, uniqueClicks: 0, clickers: 0, unsubscriptions: 0, complaints: 0, hardBounces: 0, softBounces: 0 }
}

function utmUit(url: string, sleutel: string): string | null {
  try {
    return new URL(url.replace(/&amp;/g, '&')).searchParams.get(sleutel)
  } catch {
    return null
  }
}

/** Bezoek en orders op de site voor één utm_campaign. */
async function siteCijfers(utm: string, verzonden: Date | null) {
  const db = createServiceClient()
  const { data: views } = await db
    .from('analytics_events')
    .select('session_id, anonymous_id, page_url, created_at')
    .eq('event_name', 'page_view')
    .ilike('page_url', `%utm_campaign=${utm}%`)
    .order('created_at')
    .limit(20000)

  const sessies = new Set<string>()
  const perPlek = new Map<string, Set<string>>()
  const eersteKlik = new Map<string, number>()
  for (const v of views || []) {
    if (v.session_id) sessies.add(v.session_id)
    const plek = utmUit(v.page_url || '', 'utm_content') || 'onbekend'
    if (!perPlek.has(plek)) perPlek.set(plek, new Set())
    if (v.session_id) perPlek.get(plek)!.add(v.session_id)
    const wie = v.anonymous_id || v.session_id
    if (wie && !eersteKlik.has(wie)) eersteKlik.set(wie, new Date(v.created_at).getTime())
  }

  // Orders na klik: een aankoop van dezelfde bezoeker binnen 7 dagen.
  const ordersNaKlik = { aantal: 0, omzet: 0 }
  const bezoekersIds = [...eersteKlik.keys()]
  if (bezoekersIds.length > 0) {
    const vroegste = Math.min(...eersteKlik.values())
    const aankopen: Array<{ anonymous_id: string | null; session_id: string | null; created_at: string; event_properties: { order_id?: string } | null }> = []
    for (let i = 0; i < bezoekersIds.length; i += 200) {
      const deel = bezoekersIds.slice(i, i + 200)
      const lijst = deel.map((x) => `"${x}"`).join(',')
      const { data } = await db
        .from('analytics_events')
        .select('anonymous_id, session_id, created_at, event_properties')
        .eq('event_name', 'purchase')
        .gte('created_at', new Date(vroegste).toISOString())
        .or(`anonymous_id.in.(${lijst}),session_id.in.(${lijst})`)
      aankopen.push(...((data || []) as typeof aankopen))
    }
    const orderIds = new Set<string>()
    for (const a of aankopen) {
      const wie = (a.anonymous_id && eersteKlik.has(a.anonymous_id) ? a.anonymous_id : a.session_id) || ''
      const klik = eersteKlik.get(wie)
      const t = new Date(a.created_at).getTime()
      if (klik !== undefined && t >= klik && t <= klik + KLIKVENSTER_MS && a.event_properties?.order_id) orderIds.add(a.event_properties.order_id)
    }
    if (orderIds.size > 0) {
      const { data: orders } = await db.from('orders').select('id, total').in('id', [...orderIds]).in('payment_status', ['paid', 'refunded'])
      for (const o of orders || []) {
        ordersNaKlik.aantal++
        ordersNaKlik.omzet += Number(o.total) || 0
      }
    }
  }

  // Orders van ontvangers binnen 72 uur, ook zonder klik.
  const ordersOntvangers = { aantal: 0, omzet: 0 }
  if (verzonden) {
    const t0 = verzonden.toISOString()
    const t1 = new Date(verzonden.getTime() + ONTVANGERVENSTER_MS).toISOString()
    const { data: orders } = await db.from('orders').select('email, total').in('payment_status', ['paid', 'refunded']).gte('created_at', t0).lte('created_at', t1)
    const adressen = [...new Set((orders || []).map((o) => (o.email || '').toLowerCase()).filter(Boolean))]
    if (adressen.length > 0) {
      // Zelfde samenstelling als lijst 13: toestemmingsmail gehad, zelf
      // aangemeld, of eerder klant geweest; en niet afgemeld.
      const [ronde, aanmelders, klanten, afgemeld] = await Promise.all([
        db.from('toestemming_ontvangers').select('email').in('email', adressen).in('status', ['verzonden', 'bevestigd']),
        db.from('newsletter_subscribers').select('email').in('email', adressen).eq('status', 'active').neq('source', 'admin_import'),
        db.from('orders').select('email').in('email', adressen).in('payment_status', ['paid', 'refunded']).lt('created_at', t0),
        db.from('newsletter_subscribers').select('email, unsubscribed_at').in('email', adressen).eq('status', 'unsubscribed'),
      ])
      const opLijst = new Set<string>()
      for (const r of [...(ronde.data || []), ...(aanmelders.data || []), ...(klanten.data || [])]) opLijst.add((r.email || '').toLowerCase())
      // Wie zich pas na de verzending afmeldde, kreeg de mail wel.
      for (const a of afgemeld.data || []) if (!a.unsubscribed_at || a.unsubscribed_at < t0) opLijst.delete((a.email || '').toLowerCase())
      for (const o of orders || []) {
        if (opLijst.has((o.email || '').toLowerCase())) {
          ordersOntvangers.aantal++
          ordersOntvangers.omzet += Number(o.total) || 0
        }
      }
    }
  }

  return { bezoekers: sessies.size, perPlek, ordersNaKlik, ordersOntvangers }
}

export async function brevoCampagneOverzicht(): Promise<{ campagnes: BrevoCampagne[]; fout?: string }> {
  const lijst = await roep<{ campaigns?: BrevoCampagneRuw[] }>('/emailCampaigns?limit=20&sort=desc&excludeHtmlContent=true')
  if (!lijst.ok) return { campagnes: [], fout: lijst.fout }

  const relevant = (lijst.data?.campaigns || []).filter(
    (c) => c.createdAt >= VANAF && ['queued', 'inProcess', 'sent', 'suspended'].includes(c.status),
  )

  const campagnes = await Promise.all(
    relevant.map(async (kort): Promise<BrevoCampagne> => {
      const vol = await roep<BrevoCampagneRuw>(`/emailCampaigns/${kort.id}?statistics=linksStats`)
      const detail = await roep<BrevoCampagneRuw>(`/emailCampaigns/${kort.id}?statistics=globalStats`)
      const c = { ...kort, ...(detail.data || {}) }
      const html = vol.data?.htmlContent || detail.data?.htmlContent || ''
      const utm = html.match(/utm_campaign=([a-z0-9-]+)/i)?.[1] ?? null
      const verzendmoment = c.sentDate || c.scheduledAt || null
      const verzonden = c.sentDate ? new Date(c.sentDate) : null

      const site = utm ? await siteCijfers(utm, verzonden) : null

      // Kliks per plek in de mail: Brevo telt per url, de plek staat in utm_content.
      const kliksPerPlek = new Map<string, number>()
      for (const [url, n] of Object.entries(vol.data?.statistics?.linksStats || {})) {
        const plek = utmUit(url, 'utm_content') || url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)
        kliksPerPlek.set(plek, (kliksPerPlek.get(plek) || 0) + (Number(n) || 0))
      }
      // Ook plekken zonder klik tonen, in de volgorde van de mail.
      const volgorde = [...html.matchAll(/utm_content=([a-z0-9-]+)/gi)].map((m) => m[1])
      const plekken = [...new Set([...volgorde, ...kliksPerPlek.keys(), ...(site ? site.perPlek.keys() : [])])]
      const links = plekken.map((plek) => ({ plek, kliks: kliksPerPlek.get(plek) || 0, bezoekers: site?.perPlek.get(plek)?.size || 0 }))

      return {
        id: c.id,
        naam: c.name,
        onderwerp: c.subject,
        status: c.status,
        verzendmoment,
        utm,
        ontvangersGepland: c.status === 'queued' ? (detail.data?.statistics?.remaining ?? null) : null,
        mailbox: { ...leeg(), ...(c.statistics?.globalStats || {}) },
        bezoekers: site?.bezoekers ?? 0,
        ordersNaKlik: site?.ordersNaKlik ?? { aantal: 0, omzet: 0 },
        ordersOntvangers: site?.ordersOntvangers ?? { aantal: 0, omzet: 0 },
        links,
      }
    }),
  )

  return { campagnes }
}
