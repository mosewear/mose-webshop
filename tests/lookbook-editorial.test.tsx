import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import LookbookEditorial from '@/app/[locale]/lookbook/LookbookEditorial'
import { LOOKBOOK_LOOKS, resolveLookbookLooks } from '@/lib/lookbook-looks'
import type { CatalogProduct } from '@/lib/catalog-filters'
vi.mock('@/hooks/useLiveAvailability', () => ({ useLiveAvailability: (p: unknown) => p }))
vi.mock('next/image', () => ({ default: ({ fill, priority, blurDataURL, placeholder, ...props }: Record<string, unknown>) => <img {...props} /> }))
vi.mock('@/i18n/routing', () => ({ Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a> }))
const products: CatalogProduct[] = LOOKBOOK_LOOKS.flatMap(l => l.products.map(p => ({ id: p.slug, slug: p.slug, name: p.slug, name_en: 'EN '+p.slug, base_price: 79, sale_price: null, category_id: null, display_order: 1, created_at: '2026-11-01', images: [{url: '/'+p.slug+'.webp',color:p.color,is_primary:true}], variants: [{color:p.color,size:'L',stock_quantity:0,is_available:true,fulfillment_mode:'made_to_order',supplier_orderable:true}] })))
describe('approved editorial lookbook', () => {
 it('resolves only complete published outfits in their approved colours', () => {
  expect(resolveLookbookLooks(products)).toHaveLength(6)
  expect(resolveLookbookLooks(products.slice(1))).toHaveLength(5)
  expect(resolveLookbookLooks(products.map((p,i)=>i===0?{...p,status:'draft'}:p))).toHaveLength(5)
  expect(resolveLookbookLooks(products.map((p,i)=>i===0?{...p,variants:[{color:'Green'}]}:p))).toHaveLength(5)
 })
 it.each(['nl','en'] as const)('renders six uniform looks and colour-specific links in %s', locale => {
  const html=renderToString(<NextIntlClientProvider locale={locale} messages={{}}><LookbookEditorial products={products} locale={locale} /></NextIntlClientProvider>)
  const doc=new DOMParser().parseFromString(html,'text/html')
  expect(doc.querySelectorAll('h1')).toHaveLength(1)
  expect(doc.querySelectorAll('section')).toHaveLength(6)
  expect(doc.querySelectorAll('section img')).toHaveLength(12)
  expect(doc.querySelectorAll('nav a')).toHaveLength(6)
  expect(doc.querySelector('section a')?.getAttribute('href')).toContain('color=Coffee')
  expect(html).not.toContain('giftcard')
  expect(html).not.toContain('photoshoot-2026')
  expect(html).toContain(locale==='en'?'Contrast that works.':'Contrast dat werkt.')
  if(locale==='en')expect(html).not.toContain('Een boxy hoodie')
 })
})
