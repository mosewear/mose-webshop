import { expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../messages/nl.json'
import ShopPageClient from '@/app/[locale]/shop/ShopPageClient'

const { query } = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from: query }) }))
vi.mock('@/i18n/routing', () => ({ Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a> }))
vi.mock('next/image', () => ({ default: ({ fill, priority, blurDataURL, ...props }: Record<string, unknown>) => <img {...props} /> }))
vi.mock('@/store/wishlist', () => ({ useWishlist: () => ({ addToWishlist: vi.fn(), removeFromWishlist: vi.fn(), isInWishlist: () => false, loadWishlist: vi.fn() }) }))

it('renders product names, prices and sharp image sources in server HTML before any browser fetch', () => {
  const html = renderToString(<NextIntlClientProvider locale="nl" messages={messages}><ShopPageClient initialCategories={[]} initialProducts={[{
    id: 'hoodie', name: 'MOSE Essential Hoodie', slug: 'essential-hoodie', base_price: 79, sale_price: null,
    category_id: null, display_order: 1, created_at: '2026-10-27',
    images: [{ url: '/hoodie-sharp.webp', alt_text: 'Bruine hoodie', is_primary: true }],
    variants: [{ stock_quantity: 4, presale_stock_quantity: 0, presale_enabled: false, is_available: true }],
  }]} /></NextIntlClientProvider>)
  expect(html).toContain('Essential Hoodie')
  expect(html).toContain('/hoodie-sharp.webp')
  expect(html).toContain('quality="90"')
  expect(html).not.toContain('animate-pulse')
  expect(query).not.toHaveBeenCalled()
})

vi.mock('@/lib/analytics', () => ({ trackProductView: vi.fn(), trackAddToCart: vi.fn() }))

vi.mock('next/navigation', () => ({
  // Simulate the static-prerender query-string bailout. It must affect only
  // the tiny colour-selection boundary, never the product hero or price.
  useSearchParams: () => { throw new Promise(() => {}) },
}))
import ProductPageClient from '@/app/[locale]/product/[slug]/ProductPageClient'
it('keeps the PDP hero and price in server HTML even when query-string hooks suspend', () => {
  const value = { slug: 'hoodie', locale: 'nl' }
  const params = Object.assign(Promise.resolve(value), { status: 'fulfilled', value })
  const html = renderToString(<NextIntlClientProvider locale="nl" messages={messages}><ProductPageClient
    params={params}
    initialSettings={{ free_shipping_threshold: 150, shipping_cost: 6.95, return_days: 30, return_label_cost_incl_btw: 6.95, show_preview_images_notice: false, pdp_sticky_picker_enabled: false }}
    initialProduct={{ id: 'p', name: 'MOSE Server Hoodie', slug: 'hoodie', description: 'Zware fleece', base_price: 79, sale_price: null, category_id: null, categories: null, meta_title: '', meta_description: '', product_images: [{ id: 'image', url: '/sharp-pdp.webp', alt_text: 'Hoodie', position: 0, is_primary: true, color: null, media_type: 'image' }], product_variants: [] }}
  /></NextIntlClientProvider>)
  expect(html).toContain('MOSE Server Hoodie')
  expect(html).toContain('/sharp-pdp.webp')
  expect(html).toContain('quality="95"')
  expect(html).not.toContain('animate-spin')
  expect(query).not.toHaveBeenCalled()
})
