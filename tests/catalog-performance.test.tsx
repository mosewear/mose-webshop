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
