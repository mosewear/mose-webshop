import { z } from 'zod'
import { moneyToCents } from './policy'
import type { SeasonalOffer } from '@/lib/seasonal-offers'
import type { MoseCheckoutCurrency } from './us-market'

export type SeasonalCartLine = { variantId: string; quantity: number; unitCents: number }

/** The price source is the verified Shopify price for this market. Seasonal
 * codes are native product percentage discounts, including selected gift-card
 * products. Prove each allocation independently, allowing only cent rounding. */
export function assertSeasonalCart(
  raw: unknown, offer: SeasonalOffer, currency: MoseCheckoutCurrency,
  lines: SeasonalCartLine[], storefrontSubtotalCents: number,
) {
  const money = z.object({ amount: z.string(), currencyCode: z.literal(currency) })
  const cart = z.object({
    discountCodes: z.array(z.object({ code: z.literal(offer.code), applicable: z.literal(true) })).length(1),
    deliveryGroups: z.object({ pageInfo: z.object({ hasNextPage: z.literal(false) }), nodes: z.array(z.object({ discountAllocations: z.array(z.unknown()).max(0) })) }),
    lines: z.object({ pageInfo: z.object({ hasNextPage: z.literal(false) }), nodes: z.array(z.object({
      quantity: z.number().int().positive(), merchandise: z.object({ id: z.string() }),
      cost: z.object({ amountPerQuantity: money, subtotalAmount: money, totalAmount: money }),
      discountAllocations: z.array(z.object({
        __typename: z.literal('CartCodeDiscountAllocation'), code: z.literal(offer.code), discountedAmount: money,
      })).length(1),
    })) }),
  }).parse(raw)
  const expected = new Map(lines.map(line => [line.variantId, { ...line }]))
  if (!lines.length || expected.size !== lines.length) throw new Error('SEASONAL_CART_LINES')
  let gross = 0
  let savings = 0
  for (const line of cart.lines.nodes) {
    const trusted = expected.get(line.merchandise.id)
    if (!trusted || trusted.quantity < line.quantity) throw new Error('SEASONAL_CART_LINES')
    const lineGross = trusted.unitCents * line.quantity
    if (moneyToCents(line.cost.amountPerQuantity.amount) !== trusted.unitCents ||
        moneyToCents(line.cost.subtotalAmount.amount) !== lineGross) throw new Error('SEASONAL_CART_PRICE')
    const units = trusted.unitCents * offer.percent / 100
    const wholeLine = lineGross * offer.percent / 100
    const possible = [Math.floor(wholeLine), Math.ceil(wholeLine), Math.floor(units) * line.quantity, Math.ceil(units) * line.quantity]
    const amount = moneyToCents(line.discountAllocations[0].discountedAmount.amount)
    if (!possible.includes(amount) || amount <= 0 || amount >= lineGross || moneyToCents(line.cost.totalAmount.amount) !== lineGross - amount) throw new Error('SEASONAL_CART_ALLOCATION')
    gross += lineGross
    savings += amount
    trusted.quantity -= line.quantity
  }
  if ([...expected.values()].some(line => line.quantity !== 0) ||
      (storefrontSubtotalCents !== gross && storefrontSubtotalCents !== gross - savings)) {
    throw new Error('SEASONAL_CART_SUBTOTAL')
  }
  return { gross, savings, net: gross - savings }
}
