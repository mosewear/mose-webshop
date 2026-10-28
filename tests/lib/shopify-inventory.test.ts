// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { assertInventoryEvidence, inventoryReadiness, projectInventory, reconcileInventory, type InventoryMapping } from '@/lib/shopify/inventory'
import type { AdminExecutor } from '@/lib/shopify/orders'
const mapping: InventoryMapping = { mose_variant_id: 'v1', shopify_variant_id: 'gid://shopify/ProductVariant/1', shopify_product_id: 'gid://shopify/Product/2',
  inventory_location_id: 'gid://shopify/Location/3', inventory_revision: 'revision', inventory_lease_token: 'lease', price_eur_cents: 7900 }
const response = () => ({ shop: { currencyCode: 'EUR' }, nodes: [{ id: mapping.shopify_variant_id, price: '79.00', inventoryPolicy: 'DENY' as const,
  product: { id: mapping.shopify_product_id, status: 'ACTIVE' }, inventoryItem: { tracked: true, inventoryLevel: {
    location: { id: mapping.inventory_location_id!, isActive: true, fulfillsOnlineOrders: true }, quantities: [{ name: 'available', quantity: 3 }] } } }] })
const evidence = () => ({ mose_variant_id: 'v1', mapping_current: true, status: 'known', available_quantity: 3, observed_at: new Date().toISOString() })
describe('authoritative location inventory', () => {
  it('uses the configured location available quantity, clamps negative stock, and never counts incoming/on hand', () => {
    const r = response()
    r.nodes[0].inventoryItem.inventoryLevel.quantities.push({ name: 'on_hand', quantity: 999 })
    expect(projectInventory(mapping, r)).toEqual({ status: 'known', quantity: 3, reason: 'INVENTORY_VERIFIED' })
    r.nodes[0].inventoryItem.inventoryLevel.quantities[0].quantity = -2
    expect(projectInventory(mapping, r).quantity).toBe(0)
  })
  it('never represents untracked supplier sentinel inventory as real stock', () => {
    const r = response()
    r.nodes[0].inventoryItem.tracked = false
    r.nodes[0].inventoryItem.inventoryLevel.quantities[0].quantity = 9999999
    expect(projectInventory(mapping, r)).toEqual({ status: 'unknown', quantity: null, reason: 'INVENTORY_UNTRACKED' })
  })
  it.each(['currency', 'price', 'product', 'inactive', 'oversell', 'wrong-location', 'inactive-location', 'offline-location', 'missing-quantity', 'duplicate-quantity', 'missing-node', 'duplicate-node'])('fails closed on %s', change => {
    const r = response(), n = r.nodes[0], level = n.inventoryItem.inventoryLevel
    if (change === 'currency') r.shop.currencyCode = 'USD'
    if (change === 'price') n.price = '78.00'
    if (change === 'product') n.product.id = 'gid://shopify/Product/99'
    if (change === 'inactive') n.product.status = 'DRAFT'
    if (change === 'oversell') Object.assign(n, { inventoryPolicy: 'CONTINUE' })
    if (change === 'wrong-location') level.location.id = 'gid://shopify/Location/99'
    if (change === 'inactive-location') level.location.isActive = false
    if (change === 'offline-location') level.location.fulfillsOnlineOrders = false
    if (change === 'missing-quantity') level.quantities = []
    if (change === 'duplicate-quantity') level.quantities.push({ name: 'available', quantity: 100 })
    if (change === 'missing-node') r.nodes = []
    if (change === 'duplicate-node') r.nodes.push(n)
    expect(projectInventory(mapping, r)).toMatchObject({ status: 'unknown', quantity: null })
  })
  it('fetches one bounded location batch and persists fenced observations without changing local stock or release flags', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: [mapping] }).mockResolvedValue({ data: true })
    const execute = vi.fn().mockResolvedValue(response())
    const result = await reconcileInventory({ rpc } as never, execute as AdminExecutor)
    expect(result).toEqual({ processed: 1, unknown: 0, failed: 0, leaseLost: 0 })
    expect(execute).toHaveBeenCalledOnce()
    expect(execute.mock.calls[0][1]).toEqual({ ids: [mapping.shopify_variant_id], location: mapping.inventory_location_id })
    expect(rpc.mock.calls[1]).toEqual(['complete_shopify_inventory', { p_id: 'v1', p_lease: 'lease', p_revision: 'revision', p_status: 'known', p_quantity: 3, p_reason: 'INVENTORY_VERIFIED' }])
  })
  it('does no provider work for unverified locations and never saves a quantity', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: [{ ...mapping, inventory_location_id: null }] }).mockResolvedValue({ data: true })
    const execute = vi.fn()
    expect(await reconcileInventory({ rpc } as never, execute)).toMatchObject({ unknown: 1 })
    expect(execute).not.toHaveBeenCalled()
    expect(rpc.mock.calls[1][1]).toMatchObject({ p_status: 'unknown', p_quantity: null })
  })
  it('replaces old known evidence with safe failure evidence; rejects stale leases and malformed provider results', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: [mapping] }).mockResolvedValue({ data: false })
    const execute = vi.fn().mockRejectedValue(new Error('private provider details'))
    expect(await reconcileInventory({ rpc } as never, execute)).toMatchObject({ leaseLost: 1 })
    expect(rpc.mock.calls[1][1]).toMatchObject({ p_status: 'error', p_quantity: null, p_reason: 'WORKER_FAILED' })
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('private provider')
  })
  it.each([{ status: 'unknown', available_quantity: null }, { mapping_current: false }, { observed_at: '2000-01-01T00:00:00Z' }, { observed_at: '2999-01-01T00:00:00Z' }, { available_quantity: 0 }])('blocks checkout on incomplete, stale or insufficient evidence', patch => {
    expect(() => assertInventoryEvidence([{ localVariantId: 'v1', quantity: 1 }], [{ ...evidence(), ...patch }])).toThrow('INVENTORY_NOT_READY')
  })
  it('does not use a newly remapped variant snapshot to authorize an older checkout mapping', () => {
    expect(() => assertInventoryEvidence([{ localVariantId: 'v1', quantity: 1 }], [{ ...evidence(), mapping_revision: 'new' }], Date.now(), new Map([['v1','old']]))).toThrow('INVENTORY_NOT_READY')
    expect(() => assertInventoryEvidence([{ localVariantId: 'v1', quantity: 1 }], [{ ...evidence(), mapping_revision: 'new' }], Date.now(), new Map())).toThrow('INVENTORY_NOT_READY')
  })
  it('requires complete current evidence for readiness but allows known zero stock', () => {
    const e = { ...evidence(), available_quantity: 0 }
    expect(inventoryReadiness([e], 1).status).toBe('verified')
    expect(inventoryReadiness([e], 2).status).toBe('missing')
    expect(inventoryReadiness(null, 1).status).toBe('unknown')
    expect(inventoryReadiness([e, e], 2).status).toBe('missing')
    expect(() => assertInventoryEvidence([{ localVariantId: 'missing', quantity: 1 }], [e])).toThrow()
  })
})
