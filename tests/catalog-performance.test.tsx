import { expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../messages/nl.json'
import ShopPageClient from '@/app/[locale]/shop/ShopPageClient'

const { query } = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from: query }) }))
vi.mock('@/lib/settings', () => ({ getSiteSettings: async () => ({ show_category_labels: false }) }))
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

it('renders one card per model with consistent category model counts despite colour expansion flags', () => {
  const product = {
    id: 'hoodie', name: 'MOSE Hoodie', slug: 'hoodie', base_price: 79, sale_price: null,
    category_id: 'c', category: {name:'Hoodies', slug:'hoodies'}, display_order: 1, created_at: '2026-10-27',
    show_color_variants_on_shop: true,
    images: [{url:'/hoodie.webp',is_primary:true}],
    variants: [
      {color:'Black',size:'M',stock_quantity:2,is_available:true},
      {color:'White',size:'M',stock_quantity:2,is_available:true},
    ],
  }
  const html = renderToString(<NextIntlClientProvider locale="nl" messages={messages}><ShopPageClient initialCategories={[{id:'c',name:'Hoodies',slug:'hoodies'}]} initialProducts={[product]} /></NextIntlClientProvider>)
  const document = new DOMParser().parseFromString(html, 'text/html')
  expect(document.querySelectorAll('article[data-catalog-index]')).toHaveLength(1)
  expect(document.querySelector('[role="status"]')?.textContent).toBe('1 model')
  const categoryNav = document.querySelector('nav[aria-label]')!
  expect(categoryNav.textContent).toContain('Hoodies')
  expect(document.querySelector('aside fieldset legend')?.textContent).not.toBe('Categorie')
})


it('replaces stale server products and categories on an RSC refresh without remounting', () => {
  const products = Array.from({length: 13}, (_, index) => ({
    id: `p-${index}`, name: index === 12 ? 'MOSE Watch Draft' : `MOSE Model ${index + 1}`,
    slug: `model-${index}`, base_price: 79, sale_price: null, category_id: index === 12 ? 'watch' : 'clothes',
    category: index === 12 ? {name:'Horloges',slug:'horloges'} : {name:'Kleding',slug:'kleding'},
    display_order: index, created_at:'2026-10-30', images:[{url:'/hoodie.webp',is_primary:true}],
    variants:[{size:'M',color:'Black',is_available:true,stock_quantity:2}],
  }))
  const clothes = {id:'clothes',name:'Kleding',slug:'kleding'}
  const watch = {id:'watch',name:'Horloges',slug:'horloges'}
  const view = (items: typeof products, categories: Array<typeof clothes>) => <NextIntlClientProvider locale="nl" messages={messages}><ShopPageClient initialProducts={items} initialCategories={categories} /></NextIntlClientProvider>
  const {container,rerender} = render(view(products,[clothes,watch]))
  expect(container.querySelectorAll('article[data-catalog-index]')).toHaveLength(13)
  expect(screen.getByRole('heading',{name:'Watch Draft'})).toBeInTheDocument()
  rerender(view(products.slice(0,12),[{...clothes,name:'Nieuwe kleding'}]))
  expect(container.querySelectorAll('article[data-catalog-index]')).toHaveLength(12)
  expect(screen.queryByRole('heading',{name:'Watch Draft'})).not.toBeInTheDocument()
  expect(screen.queryByRole('button',{name:'Horloges'})).not.toBeInTheDocument()
  expect(screen.getByRole('button',{name:'Nieuwe kleding'})).toBeInTheDocument()
  expect(container.querySelector('[role="status"]')?.textContent).toBe('12 modellen')
})

it('renders a fresh made-to-order PDP with enabled size/CTA and truthful stock copy, but blocks stale or disabled variants', () => {
  const value = { slug: 'boxy-fleece-hoodie', locale: 'nl' }
  const params = Object.assign(Promise.resolve(value), { status: 'fulfilled', value })
  const variant = { id:'pod-v', size:'M', color:'Black', color_hex:'#000', sku:'pod', stock_quantity:0, presale_stock_quantity:0, presale_enabled:false, presale_expected_date:null, presale_expected_date_en:null, price_adjustment:0, is_available:true, display_order:0, fulfillment_mode:'made_to_order' as const, supplier_orderable:true, supplier_checked_at:new Date().toISOString() }
  const view = (override = {}) => renderToString(<NextIntlClientProvider locale="nl" messages={messages}><ProductPageClient params={params}
    initialSettings={{free_shipping_threshold:150,shipping_cost:6.95,return_days:30,return_label_cost_incl_btw:6.95,show_preview_images_notice:false,pdp_sticky_picker_enabled:false}}
    initialProduct={{id:'2307a99e-781a-8f4a-9da0-2374d3cb464f',name:'Boxy Fleece Hoodie',slug:'boxy-fleece-hoodie',description:'Heavy fleece',base_price:79,sale_price:null,category_id:null,categories:null,meta_title:'',meta_description:'',product_images:[{id:'image',url:'/pod.webp',alt_text:'Hoodie',position:0,is_primary:true,color:null,media_type:'image'}],product_variants:[{...variant,...override}]}}
  /></NextIntlClientProvider>)
  const document = new DOMParser().parseFromString(view(), 'text/html')
  expect(document.body.textContent).toContain('Op bestelling gemaakt')
  expect(document.querySelector('[data-pdp-main-atc]')?.hasAttribute('disabled')).toBe(false)
  expect(document.body.textContent).not.toMatch(/Nog \d+ op voorraad|Op voorraad/)
  for (const override of [{supplier_checked_at:'2026-01-01T00:00:00Z'},{is_available:false},{supplier_orderable:false}]) {
    const unavailable = new DOMParser().parseFromString(view(override), 'text/html')
    expect(unavailable.querySelector('[data-pdp-main-atc]')?.hasAttribute('disabled')).toBe(true)
    expect(unavailable.body.textContent).not.toContain('Op bestelling gemaakt')
  }
})
