import {beforeEach,expect,it,vi} from 'vitest'
import {fireEvent,render,screen,within} from '@testing-library/react'
import {NextIntlClientProvider} from 'next-intl'
import messages from '../messages/nl.json'
import ShopPageClient from '@/app/[locale]/shop/ShopPageClient'
import {emptyCatalogFilters,type CatalogProduct} from '@/lib/catalog-filters'
vi.mock('@/i18n/routing',()=>({Link:({children,...props}:React.ComponentProps<'a'>)=><a {...props}>{children}</a>}))
vi.mock('@/lib/settings',()=>({getSiteSettings:async()=>({})}))
vi.mock('@/store/wishlist',()=>({useWishlist:()=>({loadWishlist:vi.fn()})}))
vi.mock('@/components/shop/useCatalogTracking',()=>({useCatalogTracking:()=>({trackSelect:vi.fn()})}))
vi.mock('@/components/RecentlyViewed',()=>({default:()=>null}))
vi.mock('@/components/shop/DetailBlok',()=>({default:()=>null}))
vi.mock('@/components/shop/CatalogProductCard',()=>({default:()=>null}))
vi.mock('@/lib/supabase/client',()=>({createClient:vi.fn()}))
beforeEach(()=>{
  window.history.replaceState(null,'','/nl/shop')
  // jsdom does not lay out controls or implement native modal focus behavior.
  vi.spyOn(HTMLElement.prototype,'getClientRects').mockReturnValue([{width:44,height:44}] as never)
  Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute('open','')}})
})
it('keeps the category when clearing refinements and exposes selections in collapsed groups',()=>{
  const product:CatalogProduct={id:'pants',name:'Broek',slug:'broek',base_price:79,sale_price:null,category_id:'trousers',category:{slug:'broeken',name:'Broeken'},display_order:1,created_at:'2026-10-30',variants:[{color:'Black',size:'L',is_available:true,stock_quantity:2}]}
  render(<NextIntlClientProvider locale="nl" messages={messages}><ShopPageClient initialProducts={[product]} initialCategories={[{id:'trousers',slug:'broeken',name:'Broeken'}]} initialFilters={{...emptyCatalogFilters,category:'broeken',sizes:['L'],colors:['black'],sort:'price-asc'}}/></NextIntlClientProvider>)
  fireEvent.click(screen.getByRole('button',{name:/Filters & Sorteren/}))
  const drawer=within(screen.getByRole('dialog'))
  const colors=drawer.getByRole('button',{name:'Kleur: ZWART'})
  expect(colors).toHaveAttribute('aria-expanded','false')
  fireEvent.click(colors)
  expect(drawer.getByRole('checkbox',{name:/ZWART.*1/})).toBeChecked()
  fireEvent.click(colors)
  expect(colors).toHaveAttribute('aria-expanded','false')
  expect(drawer.getAllByRole('button',{name:'Wis filters'})).toHaveLength(1)
  fireEvent.click(drawer.getByRole('button',{name:'Wis filters'}))
  expect(window.location.search).toBe('?category=broeken')
  expect(drawer.getByRole('button',{name:'Wis filters'})).toBeDisabled()
  expect(drawer.getByRole('button',{name:'Bekijk 1 model'})).toBeEnabled()
  expect(drawer.getByRole('button',{name:'Kleur'})).toHaveAttribute('aria-expanded','false')
})
it('keeps Shift+Tab and Tab inside the filter dialog at both boundaries',()=>{
  render(<NextIntlClientProvider locale="nl" messages={messages}><ShopPageClient initialProducts={[]} initialCategories={[]}/></NextIntlClientProvider>)
  fireEvent.click(screen.getByRole('button',{name:'Filters & Sorteren'}))
  const dialog=screen.getByRole('dialog'),close=within(dialog).getByRole('button',{name:'Sluit filters'}),results=within(dialog).getByRole('button',{name:'Bekijk 0 modellen'})
  close.focus()
  fireEvent.keyDown(close,{key:'Tab',shiftKey:true})
  expect(results).toHaveFocus()
  fireEvent.keyDown(results,{key:'Tab'})
  expect(close).toHaveFocus()
})
it('puts search and sort in the drawer while category navigation has a single public control',()=>{
  render(<NextIntlClientProvider locale="nl" messages={messages}><ShopPageClient initialProducts={[]} initialCategories={[]}/></NextIntlClientProvider>)
  expect(screen.getByRole('navigation',{name:'Categorie'})).toBeInTheDocument()
  expect(screen.queryByRole('combobox',{name:'Categorie'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'Filters & Sorteren'}))
  const drawer=within(screen.getByRole('dialog'))
  fireEvent.change(drawer.getByRole('searchbox'),{target:{value:'hoodie'}})
  expect(drawer.getByRole('searchbox')).toHaveValue('hoodie')
  fireEvent.change(drawer.getByRole('combobox',{name:'Sorteren'}),{target:{value:'price-asc'}})
  expect(window.location.search).toContain('q=hoodie')
  expect(window.location.search).toContain('sort=price-asc')
  expect(drawer.queryByRole('combobox',{name:'Categorie'})).not.toBeInTheDocument()
})

it('keeps sport selected when clearing refinements, and switches cleanly to a garment category',()=>{
  const sport:CatalogProduct={id:'sport',name:'Training Tee',slug:'mose-training-tee',base_price:49,sale_price:null,category_id:'tees',category:{slug:'t-shirts',name:'T-shirts'},display_order:1,created_at:'2026-11-01',variants:[{color:'Black',size:'L',is_available:true,stock_quantity:2}]}
  render(<NextIntlClientProvider locale="nl" messages={messages}><ShopPageClient initialProducts={[sport]} initialCategories={[{id:'tees',slug:'t-shirts',name:'T-shirts'}]} initialFilters={{...emptyCatalogFilters,collection:'sport',sizes:['L']}}/></NextIntlClientProvider>)
  expect(screen.getByRole('navigation').querySelector('[aria-pressed="true"]')).toHaveTextContent('Sport')
  fireEvent.click(screen.getByRole('button',{name:'Filters & Sorteren'}))
  const drawer=within(screen.getByRole('dialog'))
  fireEvent.click(drawer.getByRole('button',{name:'Wis filters'}))
  expect(window.location.search).toBe('?collection=sport')
  fireEvent.click(within(screen.getByRole('navigation')).getByRole('button',{name:'T-shirts'}))
  expect(window.location.search).toBe('?category=t-shirts')
})
