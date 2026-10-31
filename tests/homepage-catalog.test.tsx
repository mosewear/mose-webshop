import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../messages/en.json'
import { homepageCategories, selectHomepageProducts } from '@/lib/homepage-catalog'
import { availableVariant, type CatalogProduct } from '@/lib/catalog-filters'
import HomePageClient from '@/components/HomePageClient'
import type { HomepageSettings } from '@/lib/homepage'
vi.mock('next/image', () => ({getImageProps:(props:Record<string,unknown>)=>({props}),default:({fill,priority,blurDataURL,placeholder,...props}:Record<string,unknown>)=><img {...props}/>}))
vi.mock('@/i18n/routing', () => ({Link:({children,...props}:React.ComponentProps<'a'>)=><a {...props}>{children}</a>}))
vi.mock('@/components/FAQAccordion',()=>({default:()=>null}))
vi.mock('@/store/wishlist',()=>({useWishlist:()=>({loadWishlist:vi.fn(),isInWishlist:()=>false,addToWishlist:vi.fn(),removeFromWishlist:vi.fn()})}))
const model=(slug:string,category:string,stock=0):CatalogProduct=>({
  id:slug,slug,name:slug,base_price:79,sale_price:null,category_id:category,display_order:1,created_at:'2026-10-30',
  category:{slug:category,name:category}, images:[{url:`/${slug}.webp`,color:'Black',is_primary:true}],
  variants:[{color:'Black',size:'M',stock_quantity:stock,is_available:stock>0}],
})
const products=[model('own-hoodie','hoodies',3),model('own-sweater','sweaters',2),model('own-tee','t-shirts',4),model('boxy-hoodie','hoodies'),model('raglan-longsleeve','longsleeves'),...['camo-trousers','barrel-trousers','washed-jeans','sunfade-jeans','distressed-jeans'].map(slug=>model(slug,'broeken')),{...model('watch','horloges'),is_active:false,status:'draft'},{...model('gift','cadeaubonnen'),is_gift_card:true}]
const categories=['hoodies','sweaters','t-shirts','broeken','horloges'].map(slug=>({id:slug,slug,name:slug,name_en:slug}))
describe('homepage live collection',()=>{
  it('recognizes verified supplier clothing before unavailable local styles', () => {
    const supplier: CatalogProduct = {...model('supplier-trousers', 'broeken'), variants: [{
      size: 'L', color: 'Black', is_available: true, stock_quantity: 0,
      fulfillment_mode: 'made_to_order', supplier_orderable: true, supplier_checked_at: new Date().toISOString(),
    }]}
    expect(selectHomepageProducts([model('unavailable-hoodie', 'hoodies'), supplier], 'en')[0].id).toBe(supplier.id)
  })
  it('selects eight distinct active clothes with buyable models first and a balanced new collection',()=>{
    const chosen=selectHomepageProducts(products,'en')
    expect(chosen).toHaveLength(8)
    expect(new Set(chosen.map(p=>p.id)).size).toBe(8)
    expect(chosen.slice(0,3).every(p=>p.variants?.some(variant => availableVariant(variant)))).toBe(true)
    expect(chosen.map(p=>p.slug)).toEqual(expect.arrayContaining(['boxy-hoodie','raglan-longsleeve','camo-trousers']))
    expect(chosen.filter(p=>p.category?.slug==='broeken')).toHaveLength(3)
    expect(chosen.some(p=>/jeans/.test(p.slug))).toBe(true)
    expect(chosen.map(p=>p.slug)).not.toContain('watch')
    expect(chosen.map(p=>p.slug)).not.toContain('gift')
  })
  it('retains the configured three own models first after POD products become orderable',()=>{
    const released = products.map(p => ({...p, display_order: p.slug.startsWith('own-') ? 100 : 0, variants: p.variants?.map(v=>({...v,is_available:true,stock_quantity:2}))}))
    const featured = ['own-hoodie','own-sweater','own-tee']
    const chosen = selectHomepageProducts(released,'en',featured)
    expect(chosen.slice(0,3).map(p=>p.id)).toEqual(featured)
    expect(chosen).toHaveLength(8)
    expect(chosen.filter(p=>p.category?.slug==='broeken')).toHaveLength(3)
  })
  it('uses current product photography for category covers and replaces Watches with localized trousers',()=>{
    const tiles=homepageCategories(products,categories,'en')
    expect(tiles.map(c=>c.slug)).toEqual(['hoodies','sweaters','t-shirts','broeken'])
    expect(tiles.at(-1)?.name).toBe('Trousers')
    expect(homepageCategories(products,categories,'nl').at(-1)?.name).toBe('Broeken')
    tiles.forEach(tile=>expect(products.some(p=>p.category?.slug===tile.slug && p.images?.some(image=>image.url===tile.image_url))).toBe(true))
  })
  it('renders all eight model cards and trousers navigation in English without an unverified bestseller label',()=>{
    const html=renderToString(<NextIntlClientProvider locale="en" messages={messages}><HomePageClient siteSettings={{free_shipping_threshold:150,return_days:30}} homepageSettings={{featured_label:'Bestsellers'} as HomepageSettings} featuredProducts={selectHomepageProducts(products,'en')} categories={homepageCategories(products,categories,'en')}/></NextIntlClientProvider>)
    const doc=new DOMParser().parseFromString(html,'text/html')
    expect(doc.querySelectorAll('article')).toHaveLength(8)
    expect(doc.querySelector('a[href="/shop?category=broeken"]')).not.toBeNull()
    expect(doc.querySelector('a[href="/shop?category=horloges"]')).toBeNull()
    expect(html).not.toContain('Bestsellers')
    expect(html).toContain('/mose-about-collection.webp')
  })
})
