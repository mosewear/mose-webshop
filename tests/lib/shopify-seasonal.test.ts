// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { activeSeasonalOffer, isSeasonalCode, SEASONAL_OFFERS } from '@/lib/seasonal-offers'
import { assertSeasonalCart } from '@/lib/shopify/seasonal-proof'

describe('MOSE seasonal discount windows', () => {
  it.each(SEASONAL_OFFERS)('opens and closes $id on the published Dutch midnight', offer => {
    const start = Date.parse(offer.startsAt)
    const end = Date.parse(offer.endsAt)
    const midnight = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    expect(midnight.format(start)).toBe('00:00')
    expect(midnight.format(end)).toBe('00:00')
    expect(activeSeasonalOffer(start - 1)).toBeUndefined()
    expect(activeSeasonalOffer(start)?.code).toBe(offer.code)
    expect(activeSeasonalOffer(end - 1)?.code).toBe(offer.code)
    expect(activeSeasonalOffer(end)).toBeUndefined()
    expect(isSeasonalCode(offer.code.toLowerCase())).toBe(true)
    expect(isSeasonalCode('WELCOME10')).toBe(false)
  })
})

describe('Shopify seasonal checkout proof', () => {
  const offer = SEASONAL_OFFERS[0]
  function fixture(currencyCode: 'EUR' | 'USD') {
    const prices = currencyCode === 'EUR' ? [7400, 2000] : [8400, 2400]
    const discounts = currencyCode === 'EUR' ? [1110, 300] : [1260, 360]
    const lines = prices.map((unitCents, i) => ({ variantId: 'gid://shopify/ProductVariant/' + (i + 101), quantity: 1, unitCents }))
    const money = (cent: number) => ({ amount: (cent / 100).toFixed(2), currencyCode })
    const nodes = lines.map((line, i) => ({
      quantity: 1, merchandise: { id: line.variantId },
      cost: { amountPerQuantity: money(line.unitCents), subtotalAmount: money(line.unitCents), totalAmount: money(line.unitCents - discounts[i]) },
      discountAllocations: [{ __typename: 'CartCodeDiscountAllocation', code: offer.code, discountedAmount: money(discounts[i]) }],
    }))
    const cart = {
      discountCodes: [{ code: String(offer.code), applicable: true }],
      deliveryGroups: { pageInfo: { hasNextPage: false }, nodes: [{ discountAllocations: [] }] },
      lines: { pageInfo: { hasNextPage: false }, nodes },
    }
    return { cart, nodes, lines, gross: prices.reduce((a, b) => a + b), discount: discounts.reduce((a, b) => a + b), money }
  }
  it.each(['EUR', 'USD'] as const)('accepts the exact product discount on a mixed cart in %s', currency => {
    const { cart, lines, gross, discount } = fixture(currency)
    expect(assertSeasonalCart(cart, offer, currency, lines, gross - discount)).toEqual({ gross, savings: discount, net: gross - discount })
  })
  it('refuses a code that Shopify reports eligible when one item did not actually receive it', () => {
    const { cart, nodes, lines, gross } = fixture('EUR')
    nodes[1].discountAllocations = []
    expect(() => assertSeasonalCart(cart, offer, 'EUR', lines, gross)).toThrow()
  })
  it('refuses the wrong amount or a stacked unrelated code', () => {
    const { cart, nodes, lines, gross, money } = fixture('USD')
    nodes[0].discountAllocations[0].discountedAmount = money(1600)
    expect(() => assertSeasonalCart(cart, offer, 'USD', lines, gross)).toThrow('SEASONAL_CART_ALLOCATION')
    cart.discountCodes.push({ code: 'OTHER', applicable: true })
    expect(() => assertSeasonalCart(cart, offer, 'USD', lines, gross)).toThrow()
  })
})
