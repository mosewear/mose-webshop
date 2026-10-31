'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { VariantAvailability } from '@/lib/variant-availability'

type Variant = VariantAvailability & { id?: string }
type Product = { id: string; variants?: Variant[] | null; product_variants?: Variant[] | null }
type Observation = VariantAvailability & { id: string; product_id: string }
export const AVAILABILITY_SELECT = 'id,product_id,is_available,stock_quantity,presale_enabled,presale_stock_quantity,fulfillment_mode,supplier_orderable,supplier_checked_at'
const REFRESH_MS = 60_000

/** Refresh the public stock projection, without replacing photos, prices or selections.
 * One bounded request per visible collection, also on returning to an old tab.
 * Checkout still validates the selected SKU independently. */
export function useLiveAvailability<T extends Product>(products: readonly T[]): T[] {
  const ids = [...new Set(products.map(p => p.id))].sort().join(',')
  const [snapshot, setSnapshot] = useState<{ ids: string; rows: Observation[] | null; checkedAt: number } | null>(null)
  useEffect(() => {
    if (!ids) return
    let stopped = false
    let pending = false
    const abort = new AbortController()
    const refresh = async () => {
      if (stopped || pending || document.visibilityState === 'hidden') return
      pending = true
      try {
        const result = await createClient().from('product_variants').select(AVAILABILITY_SELECT)
          .in('product_id', ids.split(',')).abortSignal(AbortSignal.any([abort.signal, AbortSignal.timeout(8000)]))
        if (stopped) return
        if (!result.error && result.data) setSnapshot({ ids, rows: result.data as Observation[], checkedAt: Date.now() })
        else setSnapshot(previous => previous ? { ...previous, checkedAt: Date.now() } : { ids, rows: null, checkedAt: Date.now() })
      } catch {
        // Keep the last observation on transient errors; its original supplier
        // timestamp still expires. Never turn a network error into fresh stock.
        if (!stopped) setSnapshot(previous => previous ? { ...previous, checkedAt: Date.now() } : { ids, rows: null, checkedAt: Date.now() })
      } finally { pending = false }
    }
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, REFRESH_MS)
    const resume = () => { void refresh() }
    window.addEventListener('focus', resume)
    window.addEventListener('online', resume)
    document.addEventListener('visibilitychange', resume)
    return () => {
      stopped = true
      abort.abort()
      window.clearInterval(timer)
      window.removeEventListener('focus', resume)
      window.removeEventListener('online', resume)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [ids])

  return useMemo(() => {
    if (!snapshot?.rows || snapshot.ids !== ids) return [...products]
    const rows = new Map(snapshot.rows.map(row => [row.id, row]))
    return products.map(product => {
      const merge = (variants: Variant[] | null | undefined) => variants?.map(variant => {
        const row = variant.id ? rows.get(variant.id) : undefined
        // A complete successful public response which omits a formerly visible
        // variant must not retain its previous permission to sell.
        if (!row || row.product_id !== product.id) return { ...variant, is_available: false, supplier_orderable: false }
        const { id: _id, product_id: _productId, ...availability } = row
        void _id; void _productId
        return { ...variant, ...availability }
      })
      return { ...product,
        ...(product.variants !== undefined ? { variants: merge(product.variants) } : {}),
        ...(product.product_variants !== undefined ? { product_variants: merge(product.product_variants) } : {}),
      }
    })
  }, [products, ids, snapshot])
}
