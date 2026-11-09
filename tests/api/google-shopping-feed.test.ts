import { expect, it, vi } from 'vitest'
import { GET } from '@/app/google-shopping-feed.xml/route'

const { query } = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => ({ from: query }) }))

it('lists supplier sizes as in stock only while the supplier confirms they can be ordered', async () => {
  const variant = {
    color: 'Black',
    is_available: true,
    fulfillment_mode: 'made_to_order',
    stock_quantity: 0,
    supplier_orderable: true,
  }
  const product = {
    id: 'denim',
    slug: 'mose-denim-zip-jacket',
    name: 'Denim Jacket',
    base_price: 119,
    product_variants: [
      { ...variant, size: 'L', supplier_checked_at: new Date().toISOString() },
      { ...variant, size: 'XL', supplier_checked_at: new Date(Date.now() - 60 * 60_000).toISOString() },
    ],
  }
  const order = vi.fn().mockResolvedValue({ data: [product], error: null })
  const eq = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order }) })
  const select = vi.fn().mockReturnValue({ eq })
  query.mockReturnValue({ select })

  const xml = await (await GET()).text()
  expect(select.mock.calls[0][0]).toContain('fulfillment_mode, supplier_orderable, supplier_checked_at')
  expect(xml).toContain('<g:id>denim:black</g:id>')
  expect(xml).toContain('<g:availability>in_stock</g:availability>')
  expect(xml).toContain('<g:size>L</g:size>')
  expect(xml).not.toContain('XL')
})

it('fits long colors into the Google ID limit without changing Meta pixel IDs', async () => {
  const id = '39ff9979-e4ff-84b4-8831-cf0b0cc713af'
  const products = [{ id, slug: 'raglan-longsleeve', name: 'Raglan', base_price: 56,
    product_variants: ['White with Black', 'White with Coffee', 'Black'].map(color => ({ color, is_available: true, stock_quantity: 1 })) }]
  const order = vi.fn().mockResolvedValue({ data: products, error: null })
  query.mockReturnValue({ select: () => ({ eq: () => ({ eq: () => ({ order }) }) }) })
  const ids = (xml: string) => Array.from(xml.matchAll(/<g:id>([^<]+)<\/g:id>/g), m => m[1])
  const google = ids(await (await GET()).text())
  expect(new Set(google).size).toBe(3)
  expect(google.every(x => x.length <= 50)).toBe(true)
  expect(google).toContain(`${id}:black`)
  const meta = ids(await (await GET(new Request('https://www.mosewear.com/google-shopping-feed.xml?channel=meta'))).text())
  expect(meta).toContain(`${id}:white-with-black`)
  expect(meta).toContain(`${id}:white-with-coffee`)
})
