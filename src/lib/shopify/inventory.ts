import { z } from 'zod'
import { admin } from './client'
import { MAX_ORDER_QUANTITY } from '@/lib/variant-availability'
import { supplierReleaseAuthorized } from './policy'
import { moneyToCents } from './policy'
import { createServiceClient } from '@/lib/supabase/service'
import { assertSyncBudget, boundedSyncQuery } from './sync-deadline'
import { safeWorkerError } from './worker'
import type { AdminExecutor } from './orders'

/** Explicit location, never aggregate inventoryQuantity or untracked supplier sentinels. */
export const INVENTORY_QUERY = `query MoseInventory($ids: [ID!]!, $location: ID!) {
  shop { currencyCode }
  nodes(ids: $ids) { ... on ProductVariant {
    id sku selectedOptions { name value } price inventoryPolicy product { id status }
    inventoryItem { id tracked inventoryLevel(locationId: $location) {
      location { id isActive fulfillsOnlineOrders }
      quantities(names: ["available"]) { name quantity }
    } }
  } }
}`
const nodeSchema = z.object({ id: z.string(), sku: z.string().nullable(), selectedOptions: z.array(z.object({ name: z.string(), value: z.string() })), price: z.string(), inventoryPolicy: z.enum(['DENY','CONTINUE']),
  product: z.object({ id: z.string(), status: z.string() }), inventoryItem: z.object({ id: z.string().optional(), tracked: z.boolean(),
    inventoryLevel: z.object({ location: z.object({ id: z.string(), isActive: z.boolean(), fulfillsOnlineOrders: z.boolean() }),
      quantities: z.array(z.object({ name: z.string(), quantity: z.number().int().safe() })) }).nullable() }) })
const responseSchema = z.object({ shop: z.object({ currencyCode: z.string() }), nodes: z.array(nodeSchema.nullable()) })
export type InventoryMapping = { mose_variant_id: string; shopify_variant_id: string; shopify_product_id: string;
  supplier_reference?: string | null; supplier_color?: string | null; size?: string | null; inventory_location_id: string | null; inventory_item_id?: string | null; inventory_revision: string; inventory_lease_token: string; price_eur_cents: number; fulfillment_owner?: string; fulfillment_mode?: string; supplier_link_verified?: boolean; sample_verified?: boolean; owner_release_authorized_at?: string | null; owner_release_reference?: string | null }
type Observation = { status: 'known' | 'made_to_order' | 'unknown' | 'error'; quantity: number | null; reason: string }
export function projectInventory(mapping: InventoryMapping, response: z.infer<typeof responseSchema>): Observation {
  const unknown = (reason: string): Observation => ({ status: 'unknown', quantity: null, reason })
  const nodes = response.nodes.filter(n => n?.id === mapping.shopify_variant_id)
  if (nodes.length !== 1) return unknown('INVENTORY_VARIANT_MISSING')
  const node = nodes[0]!
  if (node.product.id !== mapping.shopify_product_id) return unknown('INVENTORY_MAPPING_CHANGED')
  if (response.shop.currencyCode !== 'EUR' || moneyToCents(node.price) !== mapping.price_eur_cents) return unknown('INVENTORY_PRICE_CHANGED')
  if (mapping.inventory_item_id && node.inventoryItem.id !== mapping.inventory_item_id) return unknown('INVENTORY_ITEM_CHANGED')
  // UNLISTED is active for direct-ID Storefront purchase (Shopify 2025-10+).
  // Only explicitly released supplier links may use that direct-sale status.
  if (node.product.status !== 'ACTIVE' && !(mapping.fulfillment_mode === 'made_to_order' && node.product.status === 'UNLISTED')) return unknown('INVENTORY_PRODUCT_INACTIVE')
  const level = node.inventoryItem.inventoryLevel
  if (!mapping.inventory_location_id || !level || level.location.id !== mapping.inventory_location_id ||
    !level.location.isActive || !level.location.fulfillsOnlineOrders) return unknown('INVENTORY_LOCATION_UNVERIFIED')
  if (mapping.fulfillment_owner === 'tapstitch') {
    // A product edit may change the supplier route without changing Shopify IDs.
    const sizes = node.selectedOptions.filter(o => /^(size|maat)$/i.test(o.name))
    const colors = node.selectedOptions.filter(o => /^(color|colour|kleur)$/i.test(o.name))
    if (!mapping.supplier_reference || node.sku !== mapping.supplier_reference || !mapping.size || !mapping.supplier_color ||
      sizes.length !== 1 || sizes[0].value !== mapping.size || colors.length !== 1 || colors[0].value !== mapping.supplier_color)
      return unknown('SUPPLIER_VARIANT_CHANGED')
  }
  if (mapping.fulfillment_mode === 'made_to_order') {
    if (mapping.fulfillment_owner !== 'tapstitch' || mapping.supplier_link_verified !== true ||
      !supplierReleaseAuthorized({ sample_verified: mapping.sample_verified === true, owner_release_authorized_at: mapping.owner_release_authorized_at, owner_release_reference: mapping.owner_release_reference }) || !mapping.inventory_item_id ||
      node.inventoryItem.tracked || node.inventoryPolicy !== 'CONTINUE') return unknown('SUPPLIER_CONTRACT_UNVERIFIED')
    // Shopify's untracked quantity is deliberately ignored. Fresh storefront
    // availability is checked again immediately before issuing the payable cart.
    return { status: 'made_to_order', quantity: null, reason: 'SUPPLIER_MADE_TO_ORDER_VERIFIED' }
  }
  // 9,999,999 from an untracked supplier is never physical merchant stock.
  if (!node.inventoryItem.tracked) return unknown('INVENTORY_UNTRACKED')
  if (node.inventoryPolicy !== 'DENY') return unknown('INVENTORY_OVERSELL_ALLOWED')
  const quantities = level.quantities.filter(q => q.name === 'available')
  if (quantities.length !== 1) return unknown('INVENTORY_QUANTITY_UNKNOWN')
  if (quantities[0].quantity < 0) return unknown('INVENTORY_NEGATIVE_QUANTITY')
  return { status: 'known', quantity: quantities[0].quantity, reason: 'INVENTORY_VERIFIED' }
}

/** One fenced location batch, at most 50 variants and one read-only provider request. */
export async function reconcileInventory(db = createServiceClient(), execute: AdminExecutor = admin,
  options: { signal?: AbortSignal; deadline?: number } = {}) {
  assertSyncBudget(options.signal, (options.deadline ?? Infinity) - 18_000)
  const claimed = await boundedSyncQuery(db.rpc('claim_shopify_inventory'), options.signal)
  if (claimed.error || !Array.isArray(claimed.data) || claimed.data.length > 50) throw new Error('INVENTORY_CLAIM_FAILED')
  const mappings = claimed.data as InventoryMapping[]
  if (!mappings.length) return { processed: 0, unknown: 0, failed: 0, leaseLost: 0 }
  let response: z.infer<typeof responseSchema> | null = null, failure: string | null = null
  const location = mappings[0].inventory_location_id
  if (!mappings.every(m => m.inventory_location_id === location)) throw new Error('INVENTORY_BATCH_INVALID')
  if (location) {
    try {
      response = responseSchema.parse(await execute(INVENTORY_QUERY, { ids: mappings.map(m => m.shopify_variant_id), location }))
    } catch (error) { failure = safeWorkerError(error) }
  }
  const result = { processed: 0, unknown: 0, failed: 0, leaseLost: 0 }
  for (const mapping of mappings) {
    assertSyncBudget(options.signal, options.deadline)
    let observation: Observation
    try { observation = failure ? { status: 'error', quantity: null, reason: failure }
      : response ? projectInventory(mapping, response) : { status: 'unknown', quantity: null, reason: 'INVENTORY_LOCATION_UNVERIFIED' }
    } catch { observation = { status: 'error', quantity: null, reason: 'INVENTORY_RESPONSE_INVALID' } }
    const saved = await boundedSyncQuery(db.rpc('complete_shopify_inventory', { p_id: mapping.mose_variant_id,
      p_lease: mapping.inventory_lease_token, p_revision: mapping.inventory_revision,
      p_status: observation.status, p_quantity: observation.quantity, p_reason: observation.reason }), options.signal)
    if (saved.error) throw new Error('INVENTORY_SAVE_FAILED')
    if (saved.data !== true) result.leaseLost++
    else { result.processed++; if (observation.status === 'unknown') result.unknown++; if (observation.status === 'error') result.failed++ }
  }
  return result
}

export type InventoryEvidence = { mose_variant_id: string; mapping_revision?: string | null; mapping_current: boolean | null; status: string | null;
  available_quantity: number | null; observed_at: string | null; reason?: string | null }
export function assertInventoryEvidence(lines: { localVariantId: string; quantity: number }[], evidence: InventoryEvidence[], now = Date.now(), expectedRevisions?: Map<string, string>) {
  for (const line of lines) {
    const matches = evidence.filter(s => s.mose_variant_id === line.localVariantId)
    const s = matches[0], age = now - Date.parse(s?.observed_at ?? '')
    if ((expectedRevisions && (typeof expectedRevisions.get(line.localVariantId) !== 'string' || s?.mapping_revision !== expectedRevisions.get(line.localVariantId))) ||
      matches.length !== 1 || s.mapping_current !== true || !['known', 'made_to_order'].includes(s.status ?? '') || !Number.isFinite(age) || age < 0 || age > 900_000 ||
      (s.status === 'made_to_order'
        ? s.available_quantity !== null || s.reason !== 'SUPPLIER_MADE_TO_ORDER_VERIFIED' || line.quantity > MAX_ORDER_QUANTITY
        : !Number.isSafeInteger(s.available_quantity) || s.available_quantity === null || s.available_quantity < line.quantity)) throw new Error('INVENTORY_NOT_READY')
  }
}

export function inventoryReadiness(evidence: InventoryEvidence[] | null, expected: number | null, now = Date.now()) {
  if (!evidence || expected === null) return { key: 'inventoryEvidence', label: 'Actuele voorraad per geverifieerde locatie', status: 'unknown' as const }
  let verified = evidence.length === expected && expected > 0 && new Set(evidence.map(s => s.mose_variant_id)).size === evidence.length
  try { assertInventoryEvidence(evidence.map(s => ({ localVariantId: s.mose_variant_id, quantity: 0 })), evidence, now) } catch { verified = false }
  return { key: 'inventoryEvidence', label: 'Actuele voorraad per geverifieerde locatie', status: verified ? 'verified' as const : 'missing' as const }
}
