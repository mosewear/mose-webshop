import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../messages/nl.json'
import LookbookCollection, {
  lookbookGroup,
} from '@/app/[locale]/lookbook/LookbookCollection'
import type { CatalogProduct } from '@/lib/catalog-filters'
vi.mock('@/components/shop/CatalogProductCard', () => ({
  default: ({ tile }: { tile: { product: CatalogProduct } }) => (
    <a href={`/product/${tile.product.slug}`}>{tile.product.name}</a>
  ),
}))
vi.mock('@/i18n/routing', () => ({
  Link: ({ children, ...props }: React.ComponentProps<'a'>) => (
    <a {...props}>{children}</a>
  ),
}))
const product = (
  slug: string,
  category: string,
  gift = false,
): CatalogProduct => ({
  id: slug,
  slug,
  name: slug,
  base_price: 79,
  sale_price: null,
  category_id: category,
  display_order: 1,
  created_at: '2026-10-30',
  category: { name: category, slug: category },
  is_gift_card: gift,
})
describe('complete lookbook collection', () => {
  it('includes each published model exactly once, including new denim, the watch, gift cards and future categories', () => {
    const products = [
      product('boxy-fleece-hoodie', 'hoodies'),
      product('raglan-longsleeve', 'longsleeves'),
      ...['barrel', 'camo', 'vintage', 'washed', 'sunfade', 'distressed'].map(
        (slug) => product(slug, 'broeken'),
      ),
      product('hoodie', 'hoodies'),
      product('sweater', 'sweaters'),
      product('tee', 't-shirts'),
      product('watch', 'horloges'),
      product('gift', 'cadeaubonnen', true),
      product('future', 'new-category'),
    ]
    const html = renderToString(
      <NextIntlClientProvider locale="nl" messages={messages}>
        <LookbookCollection products={products} />
      </NextIntlClientProvider>,
    )
    for (const p of products)
      expect(
        html.match(new RegExp(`href="/product/${p.slug}"`, 'g')),
      ).toHaveLength(1)
    expect(lookbookGroup(products[11])).toBe('details')
    expect(lookbookGroup(products[12])).toBe('details')
    expect(html).toContain('Denim en barrel fits.')
  })
  it('does not show an empty collection block', () => {
    expect(
      renderToString(
        <NextIntlClientProvider locale="nl" messages={messages}>
          <LookbookCollection products={[]} />
        </NextIntlClientProvider>,
      ),
    ).toBe('')
  })
})
