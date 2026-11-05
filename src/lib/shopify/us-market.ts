/** Shared, fail-closed currency contract for MOSE's NL and forthcoming US checkout. */
export type MoseCheckoutCountry = 'NL' | 'BE' | 'US'
export type MoseCheckoutCurrency = 'EUR' | 'USD'
export type MarketLine = { merchandiseId: string; quantity: number; expectedPriceCents: number; gift?: unknown }
export type MarketVariant = {
  id: string
  availableForSale: boolean
  quantityAvailable: number | null
  price: { amount: string; currencyCode: string }
}

export function currencyForCountry(country: MoseCheckoutCountry): MoseCheckoutCurrency {
  return country === 'US' ? 'USD' : 'EUR'
}

/** Location is a hint for the storefront, never permission to charge a buyer. */
export function resolveMoseCountry(cookie: string | undefined, geoCountry: string | null, enabled: boolean): MoseCheckoutCountry {
  if (!enabled) return 'NL'
  if (cookie === 'NL' || cookie === 'US') return cookie
  return geoCountry === 'US' ? 'US' : 'NL'
}

function cents(amount: string): number {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amount)) throw new Error('INVALID_MARKET_PRICE')
  const [whole, fraction = ''] = amount.split('.')
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('INVALID_MARKET_PRICE')
  return value
}

/** Shopify Storefront @inContext price is the payable source of truth.
 * Existing EUR mapping remains mandatory for NL checkout. The US price must
 * come from Shopify USD market context, not a client FX calculation. */
export function verifyMarketPriceSubtotal(
  lines: MarketLine[],
  variants: (MarketVariant | null)[],
  country: MoseCheckoutCountry,
): { currency: MoseCheckoutCurrency; subtotalCents: number; perVariantCents: Record<string, number> } {
  const currency = currencyForCountry(country)
  const map = new Map<string, MarketVariant>()
  for (const variant of variants) {
    if (!variant) throw new Error('INVALID_MARKET_VARIANTS')
    const previous = map.get(variant.id)
    // Shopify nodes(ids:) can return the same merchandise more than once.
    // Distinct gift recipients must remain distinct cart lines even when the
    // same gift-card variant is reused. Reject inconsistent duplicate values.
    if (previous) {
      if (previous.price.amount !== variant.price.amount ||
          previous.price.currencyCode !== variant.price.currencyCode ||
          previous.quantityAvailable !== variant.quantityAvailable ||
          previous.availableForSale !== variant.availableForSale) throw new Error('INVALID_MARKET_VARIANTS')
    } else map.set(variant.id, variant)
  }
  if (map.size !== new Set(lines.map(line => line.merchandiseId)).size) {
    throw new Error('INVALID_MARKET_VARIANTS')
  }
  const physicalTotals = new Map<string, number>()
  for (const line of lines) if (!line.gift) physicalTotals.set(line.merchandiseId, (physicalTotals.get(line.merchandiseId) ?? 0) + line.quantity)
  let subtotalCents = 0
  const perVariantCents: Record<string, number> = {}
  for (const line of lines) {
    const variant = map.get(line.merchandiseId)
    if (!variant || !variant.availableForSale || variant.price.currencyCode !== currency ||
        !Number.isSafeInteger(line.quantity) || line.quantity <= 0 ||
        (variant.quantityAvailable !== null && variant.quantityAvailable < (physicalTotals.get(line.merchandiseId) ?? 0))) {
      throw new Error('MARKET_VARIANT_UNAVAILABLE')
    }
    const unitCents = cents(variant.price.amount)
    if (country !== 'US' && unitCents !== line.expectedPriceCents) throw new Error('MARKET_PRICE_MISMATCH')
    subtotalCents += unitCents * line.quantity
    if (!Number.isSafeInteger(subtotalCents)) throw new Error('INVALID_MARKET_PRICE')
    perVariantCents[line.merchandiseId] = unitCents
  }
  return { currency, subtotalCents, perVariantCents }
}
