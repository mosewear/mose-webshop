// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { postInventoryAdjust } from '@/lib/admin/inventory-api'
const storage = new Map<string, string>()
const fetchMock = vi.fn()
beforeEach(() => {
 vi.stubGlobal('crypto', webcrypto)
 vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) })
 vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset()
})
afterEach(() => vi.unstubAllGlobals())
it('retains the operation key through lost or malformed responses and only rotates on confirmed stock', async () => {
 const body = { variantId: crypto.randomUUID(), field: 'regular' as const, delta: 1, expectedStock: 0 }
 fetchMock.mockRejectedValueOnce(new Error('connection lost'))
 await expect(postInventoryAdjust(body)).rejects.toThrow('connection lost')
 fetchMock.mockResolvedValueOnce(Response.json({ ok: true, result: {} }))
 await expect(postInventoryAdjust(body)).rejects.toThrow('nog niet bevestigd')
 fetchMock.mockResolvedValue(Response.json({ ok: true, result: { new_stock: 1 } }))
 await postInventoryAdjust(body)
 const keys = fetchMock.mock.calls.map(call => call[1].headers['Idempotency-Key'])
 expect(new Set(keys).size).toBe(1)
 fetchMock.mockResolvedValue(Response.json({ ok: true, result: { new_stock: 1 } }))
 await postInventoryAdjust(body)
 expect(fetchMock.mock.calls[3][1].headers['Idempotency-Key']).not.toBe(keys[0])
})
