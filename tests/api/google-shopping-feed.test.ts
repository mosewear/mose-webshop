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
