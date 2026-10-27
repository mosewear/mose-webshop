import { beforeEach, describe, expect, it, vi } from 'vitest'
const { responses, signals } = vi.hoisted(() => ({ responses: [] as unknown[], signals: [] as AbortSignal[] }))
vi.mock('server-only', () => ({}))
vi.mock('react', () => ({ cache: (fn: unknown) => fn }))
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }))
vi.mock('@/lib/supabase/server', () => ({ createAnonClient: () => ({ from: () => {
  const response = responses.shift()
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order', 'maybeSingle']) chain[method] = () => chain
  chain.abortSignal = (signal: AbortSignal) => { signals.push(signal); return chain }
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(response).then(resolve)
  return chain
} }) }))
import { getCatalogProduct, getShopCatalog } from '@/lib/catalog-server'
beforeEach(() => { responses.length = 0; signals.length = 0 })
describe('public presentation data', () => {
  it('throws database failures instead of converting an outage to a cached missing product', async () => {
    responses.push({ data: null, error: { message: 'statement timeout' } })
    await expect(getCatalogProduct('hoodie')).rejects.toThrow('Public product unavailable')
    expect(signals[0]).toBeInstanceOf(AbortSignal)
  })
  it('distinguishes a successful empty result from an unavailable database', async () => {
    responses.push({ data: null, error: null })
    await expect(getCatalogProduct('missing')).resolves.toBeNull()
  })
  it('does not cache a partial catalogue when categories fail', async () => {
    responses.push({ data: [{ id: 'p', images: [] }], error: null }, { data: null, error: { message: 'timeout' } })
    await expect(getShopCatalog()).rejects.toThrow('Public categories unavailable')
    expect(signals).toHaveLength(2)
  })
})
