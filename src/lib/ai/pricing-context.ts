/**
 * Pricing & promo context for the AI Campaign Autopilot.
 *
 * One call → everything an LLM or Meta-copy generator needs to reason
 * about what to *show* to a customer for a given product:
 *
 *  - base_price / sale_price / effective_price (NL VAT-inclusive, in EUR).
 *  - has_active_sale (sale_price set + lower than base).
 *  - active general promo codes (NEVER subscriber-specific personal codes
 *    — those are scoped to one customer and unsafe to broadcast).
 *  - active staffel tiers (product_quantity_discounts where is_active=true)
 *    BUT only when no sale is active on the product — same rule the
 *    storefront cart enforces in `src/lib/promo-staffel-eligibility.ts`.
 *
 * Then composes a "best offer" copy block in NL + EN so the publish flow
 * can drop it straight into the Meta ad text. The "best offer" is picked
 * with a simple precedence:
 *   1. Active sale (highest off% wins if multiple)
 *   2. Active general promo code (largest % or € off wins)
 *   3. Active staffel (deepest tier shown)
 *   4. None — just price.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'

export interface StaffelTier {
  min_quantity: number
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  /** Human-readable label like "2+ stuks → 10% korting" / "2+ items → 10% off". */
  label_nl: string
  label_en: string
}

export interface ActivePromoCode {
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_value: number | null
  expires_at: string | null
  /** Days until expiry — null if no expiry. */
  expires_in_days: number | null
}

export interface PricingContext {
  product_id: string
  product_name: string
  product_slug: string
  base_price: number | null
  sale_price: number | null
  effective_price: number | null
  /** Sale_price strictly below base_price. */
  has_active_sale: boolean
  /** Percentage off when on sale (rounded). 0 when not on sale. */
  sale_off_pct: number
  /**
   * Staffel applies only when there is NO active sale on the product —
   * matches the cart/checkout rule in promo-staffel-eligibility.ts.
   */
  staffel_tiers: StaffelTier[]
  has_active_staffel: boolean
  active_promo_codes: ActivePromoCode[]
  has_active_promo: boolean
  /**
   * "Best offer" copy block — what we surface in Meta ads. Empty when
   * nothing meaningful is active beyond the standard price.
   */
  offer_copy_nl: string
  offer_copy_en: string
  /** Compact one-line summary for the daily-audit LLM prompt. */
  summary_line: string
}

interface ProductRow {
  id: string
  name: string
  slug: string
  base_price: string | number | null
  sale_price: string | number | null
}

interface QtyDiscountRow {
  product_id: string
  min_quantity: number
  discount_type: string
  discount_value: string | number
  is_active: boolean | null
}

interface PromoRow {
  code: string
  description: string | null
  discount_type: string
  discount_value: string | number
  min_order_value: string | number | null
  expires_at: string | null
  is_active: boolean | null
  subscriber_id: string | null
  usage_limit: number | null
  usage_count: number | null
}

function num(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function formatEur(v: number | null | undefined, locale: 'nl' | 'en'): string {
  if (v == null || !Number.isFinite(v)) return locale === 'nl' ? 'op aanvraag' : 'on request'
  return new Intl.NumberFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)
}

function staffelLabel(tier: QtyDiscountRow, locale: 'nl' | 'en'): string {
  const t = (tier.discount_type || '').toLowerCase()
  const v = num(tier.discount_value)
  if (t === 'percentage') {
    return locale === 'nl'
      ? `${tier.min_quantity}+ stuks → ${v}% korting`
      : `${tier.min_quantity}+ items → ${v}% off`
  }
  return locale === 'nl'
    ? `${tier.min_quantity}+ stuks → €${v.toFixed(2)} korting`
    : `${tier.min_quantity}+ items → €${v.toFixed(2)} off`
}

function deepestTier(tiers: QtyDiscountRow[], locale: 'nl' | 'en'): string | null {
  if (tiers.length === 0) return null
  // Deepest = highest min_quantity (assumes tiers grow with qty).
  const sorted = [...tiers].sort((a, b) => b.min_quantity - a.min_quantity)
  return staffelLabel(sorted[0], locale)
}

/**
 * Load and compose the pricing/promo context for a single product. Safe
 * to call from server actions, route handlers and cron jobs. NEVER from
 * client components — uses the service-role Supabase client.
 */
export async function getPricingContext(productId: string): Promise<PricingContext> {
  const supabase = createServiceRoleClient()
  const nowIso = new Date().toISOString()

  const [productRes, tiersRes, promosRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, slug, base_price, sale_price')
      .eq('id', productId)
      .maybeSingle(),
    supabase
      .from('product_quantity_discounts')
      .select('product_id, min_quantity, discount_type, discount_value, is_active')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('min_quantity', { ascending: true }),
    supabase
      .from('promo_codes')
      .select(
        'code, description, discount_type, discount_value, min_order_value, expires_at, is_active, subscriber_id, usage_limit, usage_count',
      )
      .eq('is_active', true)
      .is('subscriber_id', null) // skip personal/subscriber-bound codes
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
  ])

  const productRow = (productRes.data as ProductRow | null) ?? null
  if (!productRow) {
    throw new Error(`Product not found: ${productId}`)
  }

  const base = num(productRow.base_price) || null
  const sale = productRow.sale_price != null ? num(productRow.sale_price) : null
  const hasSale = sale != null && base != null && sale > 0 && sale < base
  const effective = hasSale ? sale : base
  const saleOffPct = hasSale && base ? Math.max(0, Math.round(((base - (sale ?? base)) / base) * 100)) : 0

  // Staffel only counts when there is NO active sale on the product
  // (matches storefront / cart rule).
  const rawTiers = (tiersRes.data ?? []) as QtyDiscountRow[]
  const staffelEligible = !hasSale
  const tiersNl: StaffelTier[] = staffelEligible
    ? rawTiers.map((t) => ({
        min_quantity: t.min_quantity,
        discount_type: t.discount_type === 'percentage' ? 'percentage' : 'fixed',
        discount_value: num(t.discount_value),
        label_nl: staffelLabel(t, 'nl'),
        label_en: staffelLabel(t, 'en'),
      }))
    : []

  // Promo codes — filter exhausted ones client-side because the
  // usage_count vs usage_limit comparison can't easily be expressed in
  // the Supabase JS query builder.
  const promos = ((promosRes.data ?? []) as PromoRow[])
    .filter((p) => {
      if (!p.is_active) return false
      if (p.subscriber_id) return false
      if (p.usage_limit != null && p.usage_count != null && p.usage_count >= p.usage_limit) return false
      return true
    })
    .map<ActivePromoCode>((p) => {
      const exp = p.expires_at ? new Date(p.expires_at).getTime() : null
      const days = exp ? Math.max(0, Math.round((exp - Date.now()) / 86_400_000)) : null
      return {
        code: p.code,
        description: p.description,
        discount_type: p.discount_type === 'percentage' ? 'percentage' : 'fixed',
        discount_value: num(p.discount_value),
        min_order_value: p.min_order_value != null ? num(p.min_order_value) : null,
        expires_at: p.expires_at,
        expires_in_days: days,
      }
    })

  // Pick best promo for display: largest discount value, preferring %.
  const bestPromo = [...promos].sort((a, b) => {
    const score = (p: ActivePromoCode) =>
      p.discount_type === 'percentage' ? p.discount_value * 10 : p.discount_value
    return score(b) - score(a)
  })[0]

  const offerCopyNl = composeOfferCopy({
    locale: 'nl',
    name: productRow.name,
    base,
    sale,
    hasSale,
    saleOffPct,
    bestPromo,
    deepestStaffel: deepestTier(staffelEligible ? rawTiers : [], 'nl'),
  })
  const offerCopyEn = composeOfferCopy({
    locale: 'en',
    name: productRow.name,
    base,
    sale,
    hasSale,
    saleOffPct,
    bestPromo,
    deepestStaffel: deepestTier(staffelEligible ? rawTiers : [], 'en'),
  })

  const summary = [
    `price ${formatEur(effective, 'nl')}`,
    hasSale ? `(sale, -${saleOffPct}% van ${formatEur(base, 'nl')})` : null,
    tiersNl.length > 0 ? `staffel ${tiersNl.length} tier(s)` : null,
    promos.length > 0 ? `${promos.length} promo code(s)` : null,
  ]
    .filter(Boolean)
    .join(' | ')

  return {
    product_id: productRow.id,
    product_name: productRow.name,
    product_slug: productRow.slug,
    base_price: base,
    sale_price: sale,
    effective_price: effective,
    has_active_sale: hasSale,
    sale_off_pct: saleOffPct,
    staffel_tiers: tiersNl,
    has_active_staffel: tiersNl.length > 0,
    active_promo_codes: promos,
    has_active_promo: promos.length > 0,
    offer_copy_nl: offerCopyNl,
    offer_copy_en: offerCopyEn,
    summary_line: summary,
  }
}

interface OfferCopyArgs {
  locale: 'nl' | 'en'
  name: string
  base: number | null
  sale: number | null
  hasSale: boolean
  saleOffPct: number
  bestPromo?: ActivePromoCode
  deepestStaffel?: string | null
}

function composeOfferCopy(args: OfferCopyArgs): string {
  const { locale, base, sale, hasSale, saleOffPct, bestPromo, deepestStaffel } = args
  const T = locale === 'nl' ? COPY_NL : COPY_EN

  const priceLine =
    hasSale && sale != null && base != null
      ? `${T.priceNow} ${formatEur(sale, locale)} ${T.was} ${formatEur(base, locale)} (-${saleOffPct}%)`
      : `${T.price} ${formatEur(base, locale)}`

  const extras: string[] = []

  if (hasSale) {
    extras.push(T.saleHint)
  } else if (deepestStaffel) {
    // Staffel beats promo for streetwear-style multi-buy framing.
    extras.push(deepestStaffel)
  } else if (bestPromo) {
    const disc =
      bestPromo.discount_type === 'percentage'
        ? `${bestPromo.discount_value}%`
        : formatEur(bestPromo.discount_value, locale)
    const minOrder = bestPromo.min_order_value
      ? ` ${T.minOrder} ${formatEur(bestPromo.min_order_value, locale)}`
      : ''
    extras.push(`${T.codeHint} ${bestPromo.code} ${T.for} ${disc} ${T.off}${minOrder}`.trim())
  }

  return [priceLine, ...extras].join(' · ')
}

const COPY_NL = {
  price: 'Nu',
  priceNow: 'Nu',
  was: 'i.p.v.',
  saleHint: 'tijdelijk in de aanbieding',
  codeHint: 'Code',
  for: 'voor',
  off: 'korting',
  minOrder: 'vanaf',
}

const COPY_EN = {
  price: 'Now',
  priceNow: 'Now',
  was: 'was',
  saleHint: 'limited-time sale',
  codeHint: 'Code',
  for: 'for',
  off: 'off',
  minOrder: 'from',
}

/**
 * Batched variant — handy for the daily audit prompt which needs the
 * summary line per SKU without making N round-trips. Loads products,
 * tiers and promos in three queries regardless of input size.
 */
export async function getPricingContextBatch(productIds: string[]): Promise<Map<string, PricingContext>> {
  const out = new Map<string, PricingContext>()
  if (productIds.length === 0) return out

  const supabase = createServiceRoleClient()
  const nowIso = new Date().toISOString()

  const [productsRes, tiersRes, promosRes] = await Promise.all([
    supabase.from('products').select('id, name, slug, base_price, sale_price').in('id', productIds),
    supabase
      .from('product_quantity_discounts')
      .select('product_id, min_quantity, discount_type, discount_value, is_active')
      .in('product_id', productIds)
      .eq('is_active', true),
    supabase
      .from('promo_codes')
      .select(
        'code, description, discount_type, discount_value, min_order_value, expires_at, is_active, subscriber_id, usage_limit, usage_count',
      )
      .eq('is_active', true)
      .is('subscriber_id', null)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
  ])

  const tiersByProduct = new Map<string, QtyDiscountRow[]>()
  for (const row of (tiersRes.data ?? []) as QtyDiscountRow[]) {
    const arr = tiersByProduct.get(row.product_id) ?? []
    arr.push(row)
    tiersByProduct.set(row.product_id, arr)
  }

  const allPromos = ((promosRes.data ?? []) as PromoRow[]).filter((p) => {
    if (!p.is_active) return false
    if (p.subscriber_id) return false
    if (p.usage_limit != null && p.usage_count != null && p.usage_count >= p.usage_limit) return false
    return true
  })

  for (const row of (productsRes.data ?? []) as ProductRow[]) {
    const base = num(row.base_price) || null
    const sale = row.sale_price != null ? num(row.sale_price) : null
    const hasSale = sale != null && base != null && sale > 0 && sale < base
    const effective = hasSale ? sale : base
    const saleOffPct = hasSale && base ? Math.max(0, Math.round(((base - (sale ?? base)) / base) * 100)) : 0
    const rawTiers = tiersByProduct.get(row.id) ?? []
    const staffelEligible = !hasSale
    const tiersNl: StaffelTier[] = staffelEligible
      ? rawTiers.map((t) => ({
          min_quantity: t.min_quantity,
          discount_type: t.discount_type === 'percentage' ? 'percentage' : 'fixed',
          discount_value: num(t.discount_value),
          label_nl: staffelLabel(t, 'nl'),
          label_en: staffelLabel(t, 'en'),
        }))
      : []

    const promos = allPromos.map<ActivePromoCode>((p) => {
      const exp = p.expires_at ? new Date(p.expires_at).getTime() : null
      const days = exp ? Math.max(0, Math.round((exp - Date.now()) / 86_400_000)) : null
      return {
        code: p.code,
        description: p.description,
        discount_type: p.discount_type === 'percentage' ? 'percentage' : 'fixed',
        discount_value: num(p.discount_value),
        min_order_value: p.min_order_value != null ? num(p.min_order_value) : null,
        expires_at: p.expires_at,
        expires_in_days: days,
      }
    })
    const bestPromo = [...promos].sort((a, b) => {
      const score = (p: ActivePromoCode) =>
        p.discount_type === 'percentage' ? p.discount_value * 10 : p.discount_value
      return score(b) - score(a)
    })[0]

    const offerCopyNl = composeOfferCopy({
      locale: 'nl',
      name: row.name,
      base,
      sale,
      hasSale,
      saleOffPct,
      bestPromo,
      deepestStaffel: deepestTier(staffelEligible ? rawTiers : [], 'nl'),
    })
    const offerCopyEn = composeOfferCopy({
      locale: 'en',
      name: row.name,
      base,
      sale,
      hasSale,
      saleOffPct,
      bestPromo,
      deepestStaffel: deepestTier(staffelEligible ? rawTiers : [], 'en'),
    })

    const summary = [
      `price ${formatEur(effective, 'nl')}`,
      hasSale ? `(sale, -${saleOffPct}% van ${formatEur(base, 'nl')})` : null,
      tiersNl.length > 0 ? `staffel ${tiersNl.length} tier(s)` : null,
      promos.length > 0 ? `${promos.length} promo code(s)` : null,
    ]
      .filter(Boolean)
      .join(' | ')

    out.set(row.id, {
      product_id: row.id,
      product_name: row.name,
      product_slug: row.slug,
      base_price: base,
      sale_price: sale,
      effective_price: effective,
      has_active_sale: hasSale,
      sale_off_pct: saleOffPct,
      staffel_tiers: tiersNl,
      has_active_staffel: tiersNl.length > 0,
      active_promo_codes: promos,
      has_active_promo: promos.length > 0,
      offer_copy_nl: offerCopyNl,
      offer_copy_en: offerCopyEn,
      summary_line: summary,
    })
  }

  return out
}

/**
 * Globally-active general promo codes (no specific product context).
 * Used by the daily audit prompt to remind the LLM that *any* promo is
 * currently broadcastable. Service-role only.
 */
export async function getActiveGeneralPromos(): Promise<ActivePromoCode[]> {
  const supabase = createServiceRoleClient()
  const nowIso = new Date().toISOString()
  const { data } = await supabase
    .from('promo_codes')
    .select(
      'code, description, discount_type, discount_value, min_order_value, expires_at, is_active, subscriber_id, usage_limit, usage_count',
    )
    .eq('is_active', true)
    .is('subscriber_id', null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)

  return ((data ?? []) as PromoRow[])
    .filter((p) => {
      if (!p.is_active) return false
      if (p.subscriber_id) return false
      if (p.usage_limit != null && p.usage_count != null && p.usage_count >= p.usage_limit) return false
      return true
    })
    .map((p) => {
      const exp = p.expires_at ? new Date(p.expires_at).getTime() : null
      const days = exp ? Math.max(0, Math.round((exp - Date.now()) / 86_400_000)) : null
      return {
        code: p.code,
        description: p.description,
        discount_type: p.discount_type === 'percentage' ? 'percentage' : 'fixed',
        discount_value: num(p.discount_value),
        min_order_value: p.min_order_value != null ? num(p.min_order_value) : null,
        expires_at: p.expires_at,
        expires_in_days: days,
      }
    })
}
