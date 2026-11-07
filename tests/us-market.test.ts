// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { currencyForCountry, resolveMoseCountry, resolveStorefrontCountry, verifyMarketPriceSubtotal } from '@/lib/shopify/us-market'

const lines = [{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 2, expectedPriceCents: 7900 }]
const eur = [{ id: lines[0].merchandiseId, availableForSale: true, quantityAvailable: 5,
  price: { amount: '79.00', currencyCode: 'EUR' } }]

describe('MOSE United States market safety', () => {
  it('defaults to Netherlands and only uses US geo when enabled', () => {
    expect(resolveMoseCountry(undefined, 'US', false)).toBe('NL')
    expect(resolveMoseCountry(undefined, 'US', true)).toBe('US')
    expect(resolveMoseCountry('NL', 'US', true)).toBe('NL')
    expect(resolveMoseCountry('US', 'NL', true)).toBe('US')
    expect(resolveMoseCountry('bad', 'FR', true)).toBe('NL')
    expect(currencyForCountry('NL')).toBe('EUR')
    expect(currencyForCountry('BE')).toBe('EUR')
    expect(currencyForCountry('US')).toBe('USD')
    expect(resolveMoseCountry(undefined, 'BE', false)).toBe('BE')
    expect(resolveMoseCountry('BE', 'US', true)).toBe('BE')
  })
  it('forces all Dutch storefront routes to EUR, even with a stale US cookie', () => {
    expect(resolveStorefrontCountry('nl', 'US', 'NL', true)).toBe('NL')
    expect(resolveStorefrontCountry('nl', 'US', 'BE', true)).toBe('BE')
    expect(resolveStorefrontCountry('nl', 'US', null, true)).toBe('NL')
    expect(resolveStorefrontCountry('nl', 'NL', 'US', true)).toBe('NL')
    expect(resolveStorefrontCountry('nl', 'BE', 'US', true)).toBe('BE')
    expect(resolveStorefrontCountry('nl', undefined, 'US', true)).toBe('NL')
    expect(currencyForCountry(resolveStorefrontCountry('nl', 'US', 'NL', true))).toBe('EUR')
    expect(currencyForCountry(resolveStorefrontCountry('nl', 'US', 'BE', true))).toBe('EUR')
  })
  it('keeps actual US visitors in USD on English storefront URLs', () => {
    expect(resolveStorefrontCountry('en', 'US', 'US', true)).toBe('US')
    expect(resolveStorefrontCountry('en', undefined, 'US', true)).toBe('US')
    expect(resolveStorefrontCountry('en', 'NL', 'US', true)).toBe('NL')
    expect(currencyForCountry(resolveStorefrontCountry('en', 'US', 'US', true))).toBe('USD')
  })
  it('preserves existing EUR price integrity', () => {
    expect(verifyMarketPriceSubtotal(lines, eur, 'NL')).toEqual({
      currency: 'EUR', subtotalCents: 15800, perVariantCents: { [lines[0].merchandiseId]: 7900 },
    })
    expect(() => verifyMarketPriceSubtotal(lines, [{ ...eur[0], price: { amount: '78.99', currencyCode: 'EUR' } }], 'NL')).toThrow('MARKET_PRICE_MISMATCH')
    expect(verifyMarketPriceSubtotal(lines, eur, 'BE').currency).toBe('EUR')
    expect(() => verifyMarketPriceSubtotal(lines, [{ ...eur[0], price: { amount: '78.99', currencyCode: 'EUR' } }], 'BE')).toThrow('MARKET_PRICE_MISMATCH')
  })
  it('requires real Shopify USD prices; never infers USD from EUR', () => {
    expect(() => verifyMarketPriceSubtotal(lines, eur, 'US')).toThrow('MARKET_VARIANT_UNAVAILABLE')
    const usd = [{ ...eur[0], price: { amount: '89.00', currencyCode: 'USD' } }]
    expect(verifyMarketPriceSubtotal(lines, usd, 'US').subtotalCents).toBe(17800)
  })
  it('preserves multiple gift recipients using the same Shopify variant', () => {
    const giftLines = [
      { merchandiseId: lines[0].merchandiseId, quantity: 1, expectedPriceCents: 5000, gift: true },
      { merchandiseId: lines[0].merchandiseId, quantity: 1, expectedPriceCents: 5000, gift: true },
    ]
    const giftVariant = { ...eur[0], quantityAvailable: 0, price: { amount: '50.00', currencyCode: 'EUR' } }
    expect(verifyMarketPriceSubtotal(giftLines, [giftVariant, giftVariant], 'NL').subtotalCents).toBe(10000)
  })
  it('rejects unavailable, duplicate and malformed variants', () => {
    const usd = [{ ...eur[0], price: { amount: '89.00', currencyCode: 'USD' } }]
    expect(() => verifyMarketPriceSubtotal(lines, [{ ...usd[0], availableForSale: false }], 'US')).toThrow()
    expect(() => verifyMarketPriceSubtotal(lines, [{ ...usd[0], quantityAvailable: 1 }], 'US')).toThrow()
    expect(verifyMarketPriceSubtotal(lines, [...usd, ...usd], 'US').subtotalCents).toBe(17800)
    expect(() => verifyMarketPriceSubtotal(lines, [...usd, { ...usd[0], price: { amount: '90.00', currencyCode: 'USD' } }], 'US')).toThrow('INVALID_MARKET_VARIANTS')
    expect(() => verifyMarketPriceSubtotal(lines, [{ ...usd[0], price: { amount: '0', currencyCode: 'USD' } }], 'US')).toThrow()
    expect(() => verifyMarketPriceSubtotal(lines, [{ ...usd[0], price: { amount: '-1', currencyCode: 'USD' } }], 'US')).toThrow()
  })
})
