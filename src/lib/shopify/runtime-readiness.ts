import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReadinessCheck } from '@/lib/shopify-readiness'
import { loyaltyRuntimeReady } from './loyalty-readiness'

/** Public cutover requires computed financial/stock health, including empty queues.
 * A mutable benefits_verified/inventory_verified flag cannot establish this.
 */
export async function runtimeReadiness(db: SupabaseClient, now = Date.now()): Promise<ReadinessCheck[]> {
  const loyalty: ReadinessCheck = { key: 'loyaltyRuntime', label: 'Loyaliteit draait met actuele, gecontroleerde verwerking', status: 'missing' }
  const stock: ReadinessCheck = { key: 'legacyStockBridge', label: 'Historische voorraadmutaties zijn volledig met Shopify verrekend', status: 'missing' }
  const loyaltyEnabled = process.env.SHOPIFY_LOYALTY_SYNC_ENABLED === 'true' && process.env.LOYALTY_ATOMIC_ENABLED === 'true'
  const stockEnabled = process.env.SHOPIFY_SYNC_ENABLED === 'true' && process.env.SHOPIFY_LEGACY_STOCK_SYNC_ENABLED === 'true' && process.env.LEGACY_INVENTORY_ATOMIC_ENABLED === 'true'
  const benefits: ReadinessCheck = { key: 'benefitRuntime', label: 'Kortingen en spaarpunten worden aantoonbaar verwerkt', status: 'missing' }
  const benefitsEnabled = ['SHOPIFY_SYNC_ENABLED', 'SHOPIFY_BENEFIT_SYNC_ENABLED', 'ATOMIC_PROMO_ENABLED', 'SHOPIFY_BENEFIT_WRITES_ENABLED', 'SHOPIFY_CUSTOMER_BINDING_ENABLED'].every(key => process.env[key] === 'true')
  const signal = AbortSignal.timeout(12_000)
  const jobs: Promise<void>[] = []
  if (loyaltyEnabled) jobs.push((async () => {
    loyalty.status = 'unknown'
    try {
      const [contract, result] = await Promise.all([
        db.rpc('legacy_loyalty_writer_health').abortSignal(signal),
        db.rpc('shopify_loyalty_health').abortSignal(signal),
      ])
      if (contract.error || result.error) return
      loyalty.status = contract.data?.[0]?.generation === 1 && loyaltyRuntimeReady(result.data?.[0], now) ? 'verified' : 'missing'
    } catch { /* Missing evidence remains unknown, never green. */ }
  })())
  if (stockEnabled) jobs.push((async () => {
    stock.status = 'unknown'
    try {
      const result = await db.rpc('legacy_stock_bridge_health').abortSignal(signal)
      if (result.error || !result.data || typeof result.data !== 'object') return
      const health = result.data
      const count = (value: unknown): number | null => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null
      const expected = count(health.expectedOwnershipCount), verified = count(health.verifiedOwnershipCount)
      const heartbeat = typeof health.lastWorkerAt === 'string' ? Date.parse(health.lastWorkerAt) : NaN
      stock.status = ['pending', 'deadLetters', 'shortfalls'].every(key => count(health[key]) === 0) &&
        expected !== null && verified === expected && health.returnStockCutoverReady === true &&
        Number.isFinite(heartbeat) && heartbeat <= now + 60_000 && now - heartbeat <= 15 * 60_000 ? 'verified' : 'missing'
    } catch { /* Missing evidence remains unknown, never green. */ }
  })())
  if (benefitsEnabled) jobs.push((async () => {
    benefits.status = 'unknown'
    try {
      const result = await db.rpc('shopify_benefits_health').abortSignal(signal)
      if (result.error) return
      benefits.status = loyaltyRuntimeReady(result.data?.[0], now) ? 'verified' : 'missing'
    } catch { /* Unavailable evidence blocks public cutover. */ }
  })())
  await Promise.all(jobs)
  return [loyalty, stock, benefits]
}
