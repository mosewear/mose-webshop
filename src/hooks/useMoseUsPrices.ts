'use client'

import { useEffect, useState } from 'react'

type UsMarketQuote = {
  currency?: string
  country?: string
  lines?: Array<{ variantId: string; unitAmount: string }>
}

/** US prices are displayed ONLY when the Shopify Storefront confirms USD.
 * A country cookie is a presentation hint, not price authority. Any quote
 * failure hides EUR prices in a US context rather than masquerading as USD.
 */
export function useMoseUsPrices(variantIds: string[]) {
  const enabled = process.env.NEXT_PUBLIC_MOSE_US_MARKET_ENABLED === 'true'
  const key = [...new Set(variantIds)].filter(Boolean).sort().join('|')
  const [isUs, setIsUs] = useState(false)
  const [prices, setPrices] = useState<Record<string, number> | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle')

  useEffect(() => {
    if (!enabled) return
    const detect = () => {
      const cookie = document.cookie.split(';').map(s => s.trim()).find(s => s.startsWith('mose-country='))
      setIsUs(cookie?.slice('mose-country='.length) === 'US')
    }
    detect()
    window.addEventListener('pageshow', detect)
    return () => window.removeEventListener('pageshow', detect)
  }, [enabled])

  useEffect(() => {
    if (!enabled || !isUs || !key) {
      setPrices(null)
      setState('idle')
      return
    }
    const controller = new AbortController()
    setPrices(null)
    setState('loading')
    void (async () => {
      try {
        const ids = key.split('|')
        if (ids.length > 30) throw new Error('TOO_MANY_VARIANTS')
        const response = await fetch('/api/shopify/us-market-prices', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          cache: 'no-store', credentials: 'same-origin', signal: controller.signal,
          body: JSON.stringify({ country: 'US', variantIds: ids }),
        })
        if (!response.ok) throw new Error('US_PRICE_UNAVAILABLE')
        const payload = await response.json() as UsMarketQuote
        if (payload.currency !== 'USD' || payload.country !== 'US' || !Array.isArray(payload.lines) || payload.lines.length !== ids.length) throw new Error('US_PRICE_INVALID')
        const next: Record<string, number> = Object.create(null) as Record<string, number>
        for (const line of payload.lines) {
          if (!ids.includes(line.variantId) || typeof line.unitAmount !== 'string' || !/^(0|[1-9]\d*)\.\d{2}$/.test(line.unitAmount)) throw new Error('US_PRICE_INVALID')
          const amount = Number(line.unitAmount)
          if (amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100)) || next[line.variantId] !== undefined) throw new Error('US_PRICE_INVALID')
          next[line.variantId] = amount
        }
        if (!controller.signal.aborted) { setPrices(next); setState('ready') }
      } catch { if (!controller.signal.aborted) { setPrices(null); setState('unavailable') } }
    })()
    return () => controller.abort()
  }, [enabled, isUs, key])

  const price = (id: string) => state === 'ready' && prices ? prices[id] : undefined
  const amount = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  return { isUs: enabled && isUs, price, amount, state }
}
