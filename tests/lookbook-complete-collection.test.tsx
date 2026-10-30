import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { render, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../messages/nl.json'
import english from '../messages/en.json'
import LookbookCollection from '@/app/[locale]/lookbook/LookbookCollection'
import LookbookClient from '@/app/[locale]/lookbook/LookbookClient'
import type { CatalogProduct } from '@/lib/catalog-filters'
vi.mock('@/lib/analytics', () => ({trackEvent: vi.fn()}))
vi.mock('next/image', () => ({ default: ({fill,priority,blurDataURL,placeholder,...props}: Record<string,unknown>) => <img {...props} /> }))
vi.mock('@/i18n/routing', () => ({Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>}))
const product = (slug: string, category: string, gift = false): CatalogProduct => ({
  id: slug, slug, name: slug, name_en: `English ${slug}`, base_price:79, sale_price:null,
  category_id:category,display_order:1,created_at:'2026-10-30', category:{name:category,slug:category},is_gift_card:gift,
  images:[{url:`/${slug}-black.webp`,color:'Black',is_primary:true}],
  variants: gift ? [] : [{color:'Black',size:'M',stock_quantity:2,is_available:true}],
})
describe('image-first complete lookbook collection', () => {
  it('includes every published model and future category once, and excludes draft rows', () => {
    const products = [
      product('hoodie','hoodies'), product('jeans','broeken'), product('future','new-category'), product('gift','cadeaubonnen',true),
      {...product('draft-watch','horloges'),is_active:false,status:'draft'},
    ]
    const html=renderToString(<NextIntlClientProvider locale="nl" messages={messages}><LookbookCollection products={products} /></NextIntlClientProvider>)
    const doc=new DOMParser().parseFromString(html,'text/html')
    expect(doc.querySelectorAll('figure')).toHaveLength(4)
    for(const p of products.slice(0,4)) expect(doc.querySelector(`figure a[href^="/product/${p.slug}"]`)).not.toBeNull()
    expect(html).not.toContain('draft-watch')
    expect(doc.querySelector('a[href="/product/hoodie?color=Black"] img')?.getAttribute('src')).toBe('/hoodie-black.webp')
    expect(doc.querySelector('figure a')?.getAttribute('href')).not.toContain('/product/gift')
  })
  it('labels unavailable clothing truthfully and keeps selected-colour photography and links aligned', () => {
    const unavailable={...product('jeans','broeken'),variants:[{color:'Black',size:'M',stock_quantity:0,is_available:false}]}
    const html=renderToString(<NextIntlClientProvider locale="en" messages={english}><LookbookCollection products={[unavailable]} /></NextIntlClientProvider>)
    expect(html).toContain('Unavailable')
    expect(html).toContain('English jeans')
    expect(html).toContain('/jeans-black.webp')
    expect(html).toContain('/product/jeans?color=Black')
  })
  it('has one concise introduction before photography, without a duplicate collection introduction or empty-state notice', () => {
    const html=renderToString(<NextIntlClientProvider locale="en" messages={english}><LookbookClient settings={null} chapters={[]} locale="en" collection={<LookbookCollection products={[product('hoodie','hoodies')]} />} /></NextIntlClientProvider>)
    const doc=new DOMParser().parseFromString(html,'text/html')
    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(doc.querySelector('h1')?.textContent).toBe('Lookbook')
    expect(html).not.toContain('HOW TO WEAR MOSE')
    expect(html).not.toContain('Relaxed fits')
    expect(html).not.toContain('More coming soon')
    expect(doc.querySelector('figure img')).not.toBeNull()
  })
  it('recovers from a broken photograph when fresh catalogue data supplies a new image URL', () => {
    const original = product('hoodie','hoodies')
    const view = (item: CatalogProduct) => <NextIntlClientProvider locale="nl" messages={messages}><LookbookCollection products={[item]} /></NextIntlClientProvider>
    const {container,rerender} = render(view(original))
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/placeholder-product.svg')
    rerender(view({...original,images:[{url:'/hoodie-updated.webp',color:'Black',is_primary:true}]}))
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/hoodie-updated.webp')
  })
  it('does not show an empty collection block', () => {
    expect(renderToString(<NextIntlClientProvider locale="nl" messages={messages}><LookbookCollection products={[]} /></NextIntlClientProvider>)).toBe('')
  })
})
