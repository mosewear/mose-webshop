import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isMadeToOrderAvailable, type VariantAvailability } from '@/lib/variant-availability'

type StockRow = VariantAvailability & { id: string }

/** Heartbeat timestamps change every sync; only shopper-visible changes bust the catalogue. */
export function publicStockSignature(rows: StockRow[], now = Date.now()) {
  return JSON.stringify([...rows].sort((a, b) => a.id.localeCompare(b.id)).map(row => [
    row.id, row.stock_quantity, row.presale_stock_quantity, row.presale_enabled, row.is_available,
    row.fulfillment_mode,
    row.fulfillment_mode === 'made_to_order' ? isMadeToOrderAvailable(row, now) : null,
  ]))
}

/** Unknown/truncated reads deliberately fall back to invalidation, never hide a stock update. */
export async function readPublicStockSignature(db: SupabaseClient, signal: AbortSignal): Promise<string | null> {
  try {
    const { data, error } = await db.from('product_variants')
      .select('id,stock_quantity,presale_stock_quantity,presale_enabled,is_available,fulfillment_mode,supplier_orderable,supplier_checked_at')
      .order('id').limit(1000).abortSignal(AbortSignal.any([signal, AbortSignal.timeout(5000)]))
    if (error || !data || data.length >= 1000) return null
    return publicStockSignature(data as StockRow[])
  } catch { return null }
}
