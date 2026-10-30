// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ variant: {} as Record<string, unknown>, insert: vi.fn() }))
vi.mock('@/lib/legacy-checkout-catalog', () => ({ authorizeLegacyCatalog: async (_db: unknown, items: unknown) => items, LegacyCatalogError: class extends Error {} }))
vi.mock('@/lib/legacy-cutover-freeze', () => ({ legacyCutoverFreezeResponse: async () => null }))
vi.mock('@/lib/checkout-cutover', () => ({ shopifyCheckoutEnabled: () => false }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => {
  const chain = {
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [{ id: 'hoodie' }], error: null }).then(resolve),
    single: async () => ({ data: mock.variant, error: null }),
    insert: mock.insert,
  }
  return chain
} }))
import { POST } from '@/app/api/checkout/route'
const request = (quantity: number) => new Request('https://www.mosewear.com/api/checkout', {
  method: 'POST', body: JSON.stringify({ order: {}, items: [{ product_id: 'hoodie', variant_id: 'black-l', product_name: 'Hoodie', size: 'L', color: 'Zwart', quantity }] }),
})
beforeEach(() => {
  mock.insert.mockReset()
  mock.variant = { stock_quantity: 0, presale_stock_quantity: 5, presale_enabled: false, is_available: true }
})
describe('legacy checkout accepts only enabled presale stock', () => {
  it('rejects unavailable stock before creating an order even when disabled presale has units', async () => {
    const response = await POST(request(1))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'Onvoldoende voorraad', details: expect.stringContaining('0 op voorraad') })
    expect(mock.insert).not.toHaveBeenCalled()
  })
  it('does not supplement physical stock with disabled presale units', async () => {
    mock.variant.stock_quantity = 2
    const response = await POST(request(3))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ details: expect.stringContaining('2 op voorraad') })
  })
  it('retains actual enabled presale units when determining the available total', async () => {
    mock.variant.presale_enabled = true
    const response = await POST(request(6))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ details: expect.stringContaining('5 op voorraad') })
  })
})

it('aggregates duplicate variant lines before validating physical availability', async () => {
  mock.variant.stock_quantity = 1
  const line = { product_id: 'hoodie', variant_id: 'black-l', product_name: 'Hoodie', quantity: 1 }
  const req = new Request('https://www.mosewear.com/api/checkout', { method: 'POST', body: JSON.stringify({ order: {}, items: [line, line] }) })
  expect((await POST(req)).status).toBe(400)
  expect(mock.insert).not.toHaveBeenCalled()
})
