'use client'

import { useMoseUsPrices } from './useMoseUsPrices'
import { formatBedrag } from '@/lib/format-price'

type PriceLine = { variantId: string; price: number; quantity: number; isGiftCard?: boolean }

/** Store EUR catalogue values unchanged; display only Shopify-confirmed USD. */
export function useMoseCartPrices(items: PriceLine[], locale: string, active = true) {
  const market = useMoseUsPrices(active ? items.filter(item => !item.isGiftCard).map(item => item.variantId) : [])
  const unavailable = market.state === 'unavailable' || items.some(item => item.isGiftCard)
  const pending = unavailable ? 'USD price unavailable' : 'Checking USD price…'
  const ready = items.length > 0 && !items.some(item => item.isGiftCard || market.price(item.variantId) === undefined)
  const subtotalCents = ready ? items.reduce((sum, item) => sum + Math.round(market.price(item.variantId)! * 100) * item.quantity, 0) : null
  return {
    isUs: market.isUs,
    subtotalLabel: market.isUs ? (subtotalCents === null ? pending : market.amount(subtotalCents / 100))
      : formatBedrag(items.reduce((sum, item) => sum + item.price * item.quantity, 0), locale),
    lineLabel: (item: PriceLine, quantity = item.quantity) => market.isUs
      ? (item.isGiftCard || market.price(item.variantId) === undefined ? pending : market.amount(Math.round(market.price(item.variantId)! * 100) * quantity / 100))
      : formatBedrag(item.price * quantity, locale),
  }
}
