import { parse } from '@formatjs/icu-messageformat-parser'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import CollectionStory, { collectionStorySlots, showCollectionStories } from '@/components/shop/CollectionStory'
import { emptyCatalogFilters, type CatalogProduct } from '@/lib/catalog-filters'
import { publicError } from '@/lib/public-errors'
import { productImageAlt } from '@/lib/product-image-alt'
import nl from '../messages/nl.json'
import en from '../messages/en.json'
vi.mock('next/image', () => ({ default: ({fill, ...props}: any) => <img {...props} /> }))
vi.mock('@/i18n/routing', () => ({Link: ({children,...props}: any) => <a {...props}>{children}</a>}))
const product: CatalogProduct = {id:'denim',slug:'mose-denim-zip-jacket',name:'MOSE Denim Zip Jacket',name_en:'MOSE Denim Zip Jacket',base_price:119,sale_price:null,category_id:null,display_order:0,created_at:'2026-11-01',images:[{url:'/approved-denim.webp',is_primary:true}]}

describe('collection stories', () => {
  it('does not interrupt explicit shopping intent', () => {
    expect(showCollectionStories(emptyCatalogFilters)).toBe(true)
    for (const change of [{category:'jassen'},{collection:'sport' as const},{q:'denim'},{min:0},{max:100},{sizes:['L']},{colors:['black']},{stock:true},{sort:'newest' as const},{sort:'price-asc' as const}]) {
      expect(showCollectionStories({...emptyCatalogFilters,...change})).toBe(false)
    }
  })
  it('keeps all insertions between full two-, three- and four-column rows', () => {
    for(let position=1;position<24;position++) for(const slot of collectionStorySlots(position)) {
      const columns=slot.className==='lg:hidden'?2:slot.className.includes('xl:hidden')?3:4
      expect(position%columns).toBe(0)
      expect(position/columns).toBe(slot.story==='denim'?2:4)
    }
  })
  it.each([['nl',nl,'Denim. Op jouw manier.','Bekijk de jassen'],['en',en,'Denim. Your way.','Explore jackets']] as const)('renders the approved photography and copy in %s', (locale,messages,title,cta) => {
    const html=renderToStaticMarkup(<NextIntlClientProvider locale={locale} messages={messages}><CollectionStory story="denim" product={product} className="" /></NextIntlClientProvider>)
    expect(html).toContain('/approved-denim.webp')
    expect(html).toContain(title)
    expect(html).toContain(cta)
    expect(html).toContain('/shop?category=jassen')
  })
})
describe('public language boundaries', () => {
  it('never renders unknown provider text', () => {
    for(const locale of ['nl','en']) expect(publicError({message:'Private provider failure',error:'Nederlandse serverfout',code:'unknown'},locale,'Translated fallback')).toBe('Translated fallback')
    expect(publicError(new TypeError('Failed to fetch'),'nl','Probeer opnieuw')).toBe('Probeer opnieuw')
  })
  it('localizes actionable validation, limits and expired sessions', () => {
    expect(publicError({code:'invalid_email'},'en','fallback')).toBe('Enter a valid email address.')
    expect(publicError({status:429},'nl','fallback')).toContain('Te veel aanvragen')
    expect(publicError({code:'otp_expired'},'en','fallback')).toContain('expired')
    expect(publicError({code:'constructor'},'en','fallback')).toBe('fallback')
  })
  it('localizes image views and colours while preserving model names', () => {
    expect(productImageAlt('MOSE Denim Zip Jacket — Black — front view','Jacket','nl')).toBe('MOSE Denim Zip Jacket — Zwart — vooraanzicht')
    expect(productImageAlt('MOSE Tee — Wit — achteraanzicht','Tee','en')).toBe('MOSE Tee — White — back view')
    expect(productImageAlt('MOSE Tee Groen — side','MOSE Tee','en')).toBe('MOSE Tee — Green — side view')
    expect(productImageAlt('MOSE Training Tee — Black — fabric and chest print detail','MOSE Training Tee','nl')).toBe('MOSE Training Tee — Zwart — detail van stof en borstprint')
    expect(productImageAlt('MOSE Essential Hoodie in groen, achteraanzicht met capuchon en schouderpasvorm','MOSE Essential Hoodie','en')).toBe('MOSE Essential Hoodie in Green — back view showing the hood and shoulder fit')
  })
  it('keeps dictionary keys and ICU variables in parity', () => {
    function flatten(value: any, path=''): Record<string,string> {return Object.fromEntries(Object.entries(value).flatMap(([key,v])=> typeof v==='string'?[[path+key,v]]:Object.entries(flatten(v,path+key+'.'))))}
    const a=flatten(nl),b=flatten(en)
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort())
    for(const key of Object.keys(a)) {
      const vars=(s:string)=> {
        const names = new Set<string>()
        function walk(nodes: any[]) { for(const node of nodes) { if(node.type >= 1 && node.type <= 6) names.add(node.value); if(node.options) for(const option of Object.values(node.options) as any[]) walk(option.value); if(node.children) walk(node.children) } }
        walk(parse(s)); return [...names].sort()
      }
      expect(vars(a[key]),key).toEqual(vars(b[key]))
    }
  })
})
