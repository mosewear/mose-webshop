// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { publicStockSignature, readPublicStockSignature } from '@/lib/shopify/public-stock-signature'
const now = Date.parse('2026-11-24T12:00:00Z')
const local = { id: 'local', stock_quantity: 1, presale_enabled: false, presale_stock_quantity: 0, is_available: true, fulfillment_mode: 'local_stock' as const }
const supplier = { ...local, id: 'supplier', stock_quantity: 0, fulfillment_mode: 'made_to_order' as const, supplier_orderable: true, supplier_checked_at: new Date(now - 300_000).toISOString() }
describe('catalogue invalidation reflects availability, not sync traffic', () => {
 it('ignores supplier heartbeat refreshes while both observations remain fresh', () => {
  expect(publicStockSignature([supplier, local], now)).toBe(publicStockSignature([local, { ...supplier, supplier_checked_at: new Date(now).toISOString() }], now))
 })
 it.each([{ stock_quantity: 0 }, { is_available: false }, { presale_enabled: true, presale_stock_quantity: 2 }])('detects shopper-visible physical stock changes %j', change => {
  expect(publicStockSignature([local], now)).not.toBe(publicStockSignature([{ ...local, ...change }], now))
 })
 it('detects supplier availability, recovery from stale evidence, and variant removal', () => {
  expect(publicStockSignature([supplier], now)).not.toBe(publicStockSignature([{ ...supplier, supplier_orderable: false }], now))
  expect(publicStockSignature([supplier], now)).not.toBe(publicStockSignature([{ ...supplier, supplier_checked_at: new Date(now - 901_000).toISOString() }], now))
  expect(publicStockSignature([local], now)).not.toBe(publicStockSignature([], now))
 })
 it('falls back safely on truncated, failed and thrown reads', async () => {
  const read = vi.fn()
  const q = { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), abortSignal: read }
  const db = { from: vi.fn().mockReturnValue(q) }
  read.mockResolvedValueOnce({ data: Array(1000).fill(local), error: null })
  expect(await readPublicStockSignature(db as never, new AbortController().signal)).toBeNull()
  read.mockResolvedValueOnce({ data: null, error: { message: 'unavailable' } })
  expect(await readPublicStockSignature(db as never, new AbortController().signal)).toBeNull()
  read.mockRejectedValueOnce(new Error('private connection details'))
  expect(await readPublicStockSignature(db as never, new AbortController().signal)).toBeNull()
  read.mockResolvedValueOnce({ data: [local], error: null })
  expect(await readPublicStockSignature(db as never, new AbortController().signal)).toBe(publicStockSignature([local]))
 })
})
