import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Meta Commerce Manager offers / "Aanbiedingen" feed (feed_type: OFFER).
 *
 * Schema: https://developers.facebook.com/docs/marketing-api/catalog/guides/offers-api/
 * This is NOT the product catalog feed (see /google-shopping-feed.xml).
 *
 * Content policy: only include offers that are genuinely active on mosewear.com.
 * Currently: site-wide free shipping from the configured threshold. No invented
 * sale percentages — products have flat prices with no sale_price.
 */

const HEADERS = [
  'offer_id',
  'title',
  'application_type',
  'start_date_time',
  'end_date_time',
  'value_type',
  'percent_off',
  'target_granularity',
  'target_selection',
  'target_type',
  'target_shipping_option_types',
  'min_subtotal',
  'offer_terms',
] as const

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function parseThreshold(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw))
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

async function loadFreeShippingThreshold(): Promise<number | null> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'free_shipping_threshold')
      .maybeSingle()

    if (error) {
      console.error('[meta-offers-feed] site_settings error:', error.message)
      return null
    }

    return parseThreshold(data?.value)
  } catch (err) {
    console.error('[meta-offers-feed] failed to load settings:', err)
    return null
  }
}

function buildFreeShippingRow(threshold: number): string {
  // Open-ended offer; Meta accepts ISO-8601. Pin start far enough in the past
  // that the offer is immediately active for crawlers.
  const start = '2024-01-01T00:00:00Z'
  const minSubtotal = `${threshold.toFixed(2)} EUR`
  const title =
    threshold === 0
      ? 'Gratis verzending'
      : `Gratis verzending vanaf €${threshold.toFixed(0)}`
  const terms =
    threshold === 0
      ? 'Gratis standaardverzending op alle bestellingen via mosewear.com.'
      : `Gratis standaardverzending bij bestellingen vanaf ${minSubtotal} op mosewear.com.`

  const cells = [
    'mose-free-shipping',
    title,
    'AUTOMATIC_AT_CHECKOUT',
    start,
    '', // no end date
    'PERCENTAGE',
    '100',
    'ITEM_LEVEL',
    'ALL_CATALOG_PRODUCTS',
    'SHIPPING',
    '["STANDARD"]',
    minSubtotal,
    terms,
  ]

  return cells.map(csvEscape).join(',')
}

export async function GET() {
  const threshold = await loadFreeShippingThreshold()

  const lines: string[] = [HEADERS.join(',')]

  // Honest site-wide free-shipping threshold from admin settings (€150 today).
  // If settings are unavailable, serve a valid headers-only CSV so Meta accepts
  // the URL without inventing fake product discounts.
  if (threshold !== null) {
    lines.push(buildFreeShippingRow(threshold))
  }

  const body = `${lines.join('\n')}\n`

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=1800',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'all',
    },
  })
}
