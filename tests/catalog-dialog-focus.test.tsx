import {beforeEach,expect,it,vi} from 'vitest'
import {fireEvent,render,screen,within} from '@testing-library/react'
import {NextIntlClientProvider} from 'next-intl'
import messages from '../messages/nl.json'
import ShopPageClient from '@/app/[locale]/shop/ShopPageClient'
vi.mock('@/i18n/routing',()=>({Link:({children,...props}:React.ComponentProps<'a'>)=><a {...props}>{children}</a>}))
vi.mock('@/lib/settings',()=>({getSiteSettings:async()=>({})}))
vi.mock('@/store/wishlist',()=>({useWishlist:()=>({loadWishlist:vi.fn()})}))
vi.mock('@/components/shop/useCatalogTracking',()=>({useCatalogTracking:()=>({trackSelect:vi.fn()})}))
vi.mock('@/components/RecentlyViewed',()=>({default:()=>null}))
vi.mock('@/components/shop/DetailBlok',()=>({default:()=>null}))
vi.mock('@/lib/supabase/client',()=>({createClient:vi.fn()}))
beforeEach(()=>{
  // jsdom does not lay out controls or implement native modal focus behavior.
  vi.spyOn(HTMLElement.prototype,'getClientRects').mockReturnValue([{width:44,height:44}] as never)
  Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute('open','')}})
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
