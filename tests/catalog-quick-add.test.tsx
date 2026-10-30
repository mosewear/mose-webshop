import {beforeEach,expect,it,vi} from 'vitest'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {NextIntlClientProvider} from 'next-intl'
import messages from '../messages/nl.json'
import CatalogQuickAdd from '@/components/shop/CatalogQuickAdd'
import {type CatalogProduct} from '@/lib/catalog-filters'
import {useCart} from '@/store/cart'
const mocks=vi.hoisted(()=>{const storage=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)});return {read:vi.fn(),eq:vi.fn(),open:vi.fn(),track:vi.fn()}})
vi.mock('@/i18n/routing',()=>({Link:({children,...props}:React.ComponentProps<'a'>)=><a {...props}>{children}</a>}))
vi.mock('next/image',()=>({default:({fill,sizes,...props}:Record<string,unknown>)=>{void fill;void sizes;return <img {...props}/>}}))
vi.mock('@/lib/analytics',()=>({trackAddToCart:mocks.track}))
vi.mock('@/store/cartDrawer',()=>({useCartDrawer:{getState:()=>({openDrawer:mocks.open})}}))
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({from:()=>({select:()=>{const q={eq:(...args:unknown[])=>{mocks.eq(...args);return q},single:mocks.read};return q}})})}))
const product:CatalogProduct={id:'p1',name:'MOSE Tee',slug:'mose-tee',base_price:50,sale_price:null,display_order:1,created_at:'2026-10-30',category_id:'shirts',images:[{url:'/tee.webp',color:'Zwart',is_primary:true}],variants:[
  {id:'black-m',sku:'TEE-B-M',color:'Zwart',size:'M',stock_quantity:2,is_available:true},
  {id:'black-l',sku:'TEE-B-L',color:'Zwart',size:'L',stock_quantity:0,is_available:true},
  {id:'white-m',sku:'TEE-W-M',color:'Wit',size:'M',stock_quantity:4,is_available:true},
]}
const renderPicker=()=>render(<NextIntlClientProvider locale="nl" messages={messages}><CatalogQuickAdd product={product} initialColor="Zwart" onClose={vi.fn()}/></NextIntlClientProvider>)
beforeEach(()=>{vi.clearAllMocks();useCart.setState({items:[]});mocks.read.mockResolvedValue({data:product,error:null});Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute('open','')}})})
it('requires an explicit size, rechecks active public variants and adds the chosen SKU once',async()=>{
 renderPicker();expect(screen.getByRole('button',{name:'Kies eerst je maat'})).toBeDisabled()
 const m=await screen.findByRole('button',{name:'M'});expect(screen.getByRole('button',{name:'L — Niet beschikbaar'})).toBeDisabled()
 fireEvent.click(m);fireEvent.click(screen.getByRole('button',{name:'In winkelmand'}))
 await waitFor(()=>expect(useCart.getState().items).toHaveLength(1))
 expect(useCart.getState().items[0]).toMatchObject({variantId:'black-m',sku:'TEE-B-M',color:'Zwart',size:'M',price:50,quantity:1})
 expect(mocks.read).toHaveBeenCalledTimes(2);expect(mocks.eq).toHaveBeenCalledWith('status','active');expect(mocks.open).toHaveBeenCalledOnce()
})
it('clears the size when colour changes so an unchosen variant is never added',async()=>{
 renderPicker();fireEvent.click(await screen.findByRole('button',{name:'M'}));fireEvent.click(screen.getByRole('button',{name:'WIT'}));expect(screen.getByRole('button',{name:'Kies eerst je maat'})).toBeDisabled();expect(useCart.getState().items).toHaveLength(0)
})
it('does not add a variant which sells out between selection and adding',async()=>{
 renderPicker();fireEvent.click(await screen.findByRole('button',{name:'M'}));mocks.read.mockResolvedValueOnce({data:{...product,variants:product.variants!.map(v=>({...v,stock_quantity:0}))},error:null});fireEvent.click(screen.getByRole('button',{name:'In winkelmand'}));expect(await screen.findByRole('alert')).toHaveTextContent('Niet beschikbaar');expect(useCart.getState().items).toHaveLength(0)
})
it('asks the visitor to review a changed price and respects existing quantity limits',async()=>{
 renderPicker();fireEvent.click(await screen.findByRole('button',{name:'M'}));mocks.read.mockResolvedValue({data:{...product,base_price:55},error:null});fireEvent.click(screen.getByRole('button',{name:'In winkelmand'}));expect(await screen.findByRole('alert')).toHaveTextContent('De prijs is bijgewerkt');expect(useCart.getState().items).toHaveLength(0)
 useCart.setState({items:[{productId:'p1',variantId:'black-m',slug:'mose-tee',name:'Tee',size:'M',color:'Zwart',colorHex:'#000',quantity:2,price:55,image:'/tee.webp',stock:2,sku:'TEE-B-M'}]})
 fireEvent.click(screen.getByRole('button',{name:'In winkelmand'}));await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('al in je winkelmand'));expect(useCart.getState().items[0].quantity).toBe(2)
})
it('fails closed on a network error and allows a retry',async()=>{
 mocks.read.mockResolvedValueOnce({data:null,error:{message:'offline'}});renderPicker();fireEvent.click(await screen.findByRole('button',{name:'Probeer opnieuw'}));expect(await screen.findByRole('button',{name:'M'})).toBeEnabled();expect(useCart.getState().items).toHaveLength(0)
})
it('does not sell made-to-order variants with stale supplier evidence',async()=>{
 mocks.read.mockResolvedValue({data:{...product,variants:[{...product.variants![0],fulfillment_mode:'made_to_order',supplier_orderable:true,supplier_checked_at:new Date(Date.now()-960_000).toISOString(),stock_quantity:100}]},error:null});renderPicker();expect(await screen.findByRole('button',{name:'M — Niet beschikbaar'})).toBeDisabled();expect(useCart.getState().items).toHaveLength(0)
})
