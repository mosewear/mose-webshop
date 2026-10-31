import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
import { selectMenuProducts } from '@/lib/menu-products'
import type { CatalogProduct } from '@/lib/catalog-filters'
const model = (slug: string, category = 'hoodies', color = 'Black'): CatalogProduct => ({
  id: slug, slug, name: slug, name_en: `English ${slug}`, base_price: 79, sale_price: null,
  category_id: category, category: {slug: category, name: category}, display_order: 1, created_at: '2026-10-31',
  images: [{url: `/${slug}.webp`, color, is_primary: true}],
  variants: [{color, size: 'L', stock_quantity: 2, is_available: true}],
})
const featured = [model('boxy-fleece-hoodie'), model('mose-tee','t-shirts','Beige'), model('raglan-longsleeve','longsleeves'), model('vintage-barrel-jeans','broeken')]
describe('menu clothing highlights', () => {
  it('shows four curated models rather than the cheapest products or a gift card', () => {
    const gift = {...model('giftcard', 'cadeaubonnen'), base_price: 20, is_gift_card: true}
    const result = selectMenuProducts([gift, model('cheap-tee','t-shirts'), ...featured.slice().reverse()], 'nl')
    expect(result.map(p => p.slug)).toEqual(featured.map(p => p.slug))
    expect(new Set(result.map(p => p.id)).size).toBe(4)
  })
  it('replaces inactive, draft or unavailable highlights with available clothing, never accessories', () => {
    const result = selectMenuProducts([
      {...featured[0], is_active: false}, {...featured[1], status: 'draft'},
      {...featured[2], variants: [{color:'Black',size:'L',stock_quantity:0,is_available:true}]},
      featured[3], model('replacement'), model('watch','horloges'),
    ], 'nl')
    expect(result.map(p => p.slug)).toEqual(['vintage-barrel-jeans','replacement'])
  })
  it('uses the same available colour for photograph, destination and adjusted sale price', () => {
    const product = {...featured[0], sale_price: 60,
      images: [{url:'/coffee.webp',color:'Coffee',is_primary:true},{url:'/black.webp',color:'Black'}],
      variants: [{color:'Coffee',size:'L',stock_quantity:0,is_available:true},{color:'Black',size:'L',price_adjustment:5,stock_quantity:2,is_available:true}],
    }
    expect(selectMenuProducts([product],'en')[0]).toMatchObject({beeld:'/black.webp',href:'/product/boxy-fleece-hoodie?color=Black',prijs:65,vanafPrijs:84,naam:'English boxy-fleece-hoodie'})
  })
  it('includes freshly verified made-to-order stock without inventing physical units', () => {
    const product = {...featured[0], variants:[{color:'Coffee',size:'L',stock_quantity:0,is_available:true,fulfillment_mode:'made_to_order' as const,supplier_orderable:true,supplier_checked_at:new Date().toISOString()}]}
    expect(selectMenuProducts([product], 'nl')).toHaveLength(1)
  })
})
