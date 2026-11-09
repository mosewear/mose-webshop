import type { SupabaseClient } from '@supabase/supabase-js'
export function atomicPromoEnabled() { return process.env.ATOMIC_PROMO_ENABLED === 'true' }
/** The original promo table stores expires_at as a UTC timestamp without a zone. */
export function promoExpiry(value: unknown): string | null {
  if (value === null) return null
  const raw = typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?$/.test(value) ? value + 'Z' : value
  const time = typeof raw === 'string' ? Date.parse(raw) : NaN
  if (!Number.isFinite(time)) throw new Error('PROMO_INVALID_EXPIRY')
  return new Date(time).toISOString()
}
export function promoSnapshot(p: Record<string, unknown>) {
  return Object.fromEntries(['id','discount_type','discount_value','min_order_value','applies_to_sale_items','expires_at','is_active','usage_limit']
    .map(key => [key, p[key] ?? null]))
}
export async function createAtomicLegacyPromoOrder(db: SupabaseClient, order: Record<string, unknown>, promo: Record<string, unknown>) {
  const saved = await db.rpc('create_legacy_promo_order', { p_order: order, p_promo: promo.id, p_snapshot: promoSnapshot(promo) })
  if (saved.error || !Array.isArray(saved.data) || saved.data.length !== 1) throw new Error('PROMO_ORDER_UNCONFIRMED')
  return saved.data[0]
}
