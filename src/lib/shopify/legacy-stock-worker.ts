import { z } from 'zod'
import { admin } from './client'
import { createServiceClient } from '@/lib/supabase/service'
import { boundedSyncQuery, assertSyncBudget } from './sync-deadline'
import type { AdminExecutor } from './orders'

/** 2026-10 requires a stable provider idempotency key. Never replace it on timeout. */
export const LEGACY_STOCK_ADJUST = `mutation MoseLegacyStock($input: InventoryAdjustQuantitiesInput!, $key: String!) {
  inventoryAdjustQuantities(input: $input) @idempotent(key: $key) {
    inventoryAdjustmentGroup { referenceDocumentUri }
    userErrors { code }
  }
}`
export const OWNED_STOCK_SET = `mutation MoseOwnedStockSet($input: InventorySetQuantitiesInput!, $key: String!) {
  inventorySetQuantities(input: $input) @idempotent(key: $key) {
    inventoryAdjustmentGroup { referenceDocumentUri }
    userErrors { code }
  }
}`
const eventSchema = z.object({ id: z.string().uuid(), order_id: z.string().uuid().nullable(), variant_id: z.string().uuid(),
  generation: z.string().uuid(), inventory_item_id: z.string().regex(/^gid:\/\/shopify\/InventoryItem\/\d+$/),
  location_id: z.string().regex(/^gid:\/\/shopify\/Location\/\d+$/), delta: z.number().int().refine(n => n !== 0), expected_quantity: z.number().int().nonnegative().nullable().optional(), target_quantity: z.number().int().nonnegative().nullable().optional(), lease_token: z.string().uuid() })
const adjustmentSchema = z.object({
  inventoryAdjustmentGroup: z.object({ referenceDocumentUri: z.string().nullable() }).nullable(),
  userErrors: z.array(z.object({ code: z.string().nullable() })),
})
export async function runLegacyStockWorker(db = createServiceClient(), execute: AdminExecutor = admin,
  options: { deadline?: number; signal?: AbortSignal } = {}) {
  const totals = { processed: 0, failed: 0, leaseLost: 0 }
  for (let index = 0; index < 5; index++) {
    assertSyncBudget(options.signal, (options.deadline ?? Infinity) - 18_000)
    const claimed = await boundedSyncQuery(db.rpc('claim_legacy_stock_delta'), options.signal)
    if (claimed.error || !Array.isArray(claimed.data) || claimed.data.length > 1) throw new Error('STOCK_DELTA_CLAIM_FAILED')
    if (!claimed.data.length) break
    const e = eventSchema.parse(claimed.data[0])
    let error: string | null = null
    try {
      const ownership = await boundedSyncQuery(db.from('shopify_stock_ownership')
        .select('generation,inventory_item_id,location_id').eq('variant_id', e.variant_id).limit(2), options.signal)
      const owner = ownership.data?.[0]
      if (ownership.error || ownership.data?.length !== 1 || owner?.generation !== e.generation || owner.inventory_item_id !== e.inventory_item_id ||
        owner.location_id !== e.location_id) throw new Error('STOCK_OWNERSHIP_CHANGED')
      const reference = `mose://legacy-stock/${e.id}`
      const absolute = e.expected_quantity !== null && e.expected_quantity !== undefined
      if (absolute && (e.target_quantity === null || e.target_quantity === undefined || e.target_quantity - e.expected_quantity! !== e.delta)) throw new Error('STOCK_INTENT_INVALID')
      if (!absolute && e.target_quantity !== null && e.target_quantity !== undefined) throw new Error('STOCK_INTENT_INVALID')
      const input = absolute ? {
        name: 'available', reason: 'correction', referenceDocumentUri: reference,
        quantities: [{ inventoryItemId: e.inventory_item_id, locationId: e.location_id, quantity: e.target_quantity, changeFromQuantity: e.expected_quantity }],
      } : {
        name: 'available', reason: 'correction', referenceDocumentUri: reference,
        changes: [{ inventoryItemId: e.inventory_item_id, locationId: e.location_id, delta: e.delta, changeFromQuantity: null }],
      }
      const response = await execute<Record<string, unknown>>(absolute ? OWNED_STOCK_SET : LEGACY_STOCK_ADJUST, { key: e.id, input })
      const adjusted = adjustmentSchema.parse(response[absolute ? 'inventorySetQuantities' : 'inventoryAdjustQuantities'])
      if (adjusted.userErrors.some(item => item.code === 'CHANGE_FROM_QUANTITY_STALE')) {
        error = 'STOCK_COMPARE_FAILED_REVIEW_REQUIRED'
      } else if (adjusted.userErrors.length || adjusted.inventoryAdjustmentGroup?.referenceDocumentUri !== reference) {
        error = 'STOCK_DELTA_RETRY_REQUIRED'
      }
    } catch { error = 'STOCK_DELTA_RETRY_REQUIRED' }
    const saved = await boundedSyncQuery(db.rpc('finish_legacy_stock_delta', { p_id: e.id, p_lease: e.lease_token, p_error: error }), options.signal)
    if (saved.error) throw new Error('STOCK_DELTA_SAVE_FAILED')
    if (saved.data !== true) totals.leaseLost++
    else if (error) totals.failed++
    else totals.processed++
  }
  if (totals.failed === 0 && totals.leaseLost === 0) {
    const heartbeat = await boundedSyncQuery(db.rpc('mark_legacy_stock_worker'), options.signal)
    if (heartbeat.error) throw new Error('STOCK_BRIDGE_HEARTBEAT_FAILED')
  }
  return totals
}
