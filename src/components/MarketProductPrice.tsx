'use client'

import type { ReactNode } from 'react'
import { useMoseUsPrices } from '@/hooks/useMoseUsPrices'

/** Recommendations use a real variant quote too, never a client-side FX rate. */
export default function MarketProductPrice({ variantId, children }: { variantId?: string; children: ReactNode }) {
  const market = useMoseUsPrices(variantId ? [variantId] : [])
  if (!market.isUs) return <>{children}</>
  const value = variantId ? market.price(variantId) : undefined
  return <span>{value !== undefined ? market.amount(value) : market.state === 'unavailable' ? 'USD price unavailable' : variantId ? 'Checking USD price…' : 'Choose a size for USD price'}</span>
}
