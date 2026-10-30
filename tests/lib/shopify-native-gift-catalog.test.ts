import { beforeEach, expect, it, vi } from 'vitest'
import { admin, storefront } from '@/lib/shopify/client'
import { APPEND_NATIVE_GIFT_VARIANT,NATIVE_GIFT_CHANNEL_QUERY,NATIVE_GIFT_PRODUCT_QUERY,NATIVE_GIFT_VARIANT_QUERY,resolveNativeGiftVariant } from '@/lib/shopify/native-gift-catalog'
vi.mock('@/lib/shopify/client',()=>({admin:vi.fn(),storefront:vi.fn()}))
const productId='00000000-0000-4000-8000-000000000001',pid='gid://shopify/Product/1',vid='gid://shopify/ProductVariant/2'
const request={productId,amountCents:2025,buyerIp:'192.0.2.1'}
function fixture(){
 const local={id:productId,is_active:true,status:'active',is_gift_card:true,allows_custom_amount:true,gift_card_min_amount:20,gift_card_max_amount:1000}
 const binding={shopify_product_id:pid,enabled:true,variant_limit:2000,review_reference:'manual native product verified'}
 const state:{amount:null|{status:string;shopify_variant_id:string|null}}={amount:null}
 const provider={currentAppInstallation:{accessScopes:[{handle:'write_products'}]},shop:{currencyCode:'EUR',resourceLimits:{maxProductVariants:2048}},product:{id:pid,isGiftCard:true,status:'ACTIVE',giftCardSettings:{issuanceCurrency:null},options:[{id:'gid://shopify/ProductOption/3'}],variantsCount:{count:3,precision:'EXACT'}}}
 const variant={id:vid,price:'20.25',taxable:false,inventoryItem:{tracked:false,requiresShipping:false},product:provider.product}
 const visible={id:vid,availableForSale:true,price:{amount:'20.25',currencyCode:'EUR'},product:{id:pid}}
 const db={from:vi.fn((table:string)=>{
  const query={select:()=>query,eq:()=>query,single:async()=>({data:table==='products'?local:binding,error:null}),maybeSingle:async()=>({data:state.amount,error:null})};return query
 }),rpc:vi.fn(async(name:string,args:Record<string,unknown>)=>{
  if(name==='reserve_native_gift_variant'){if(state.amount)return {data:[{action:state.amount.status==='ready'?'ready':'pending',variant_id:state.amount.shopify_variant_id}]};state.amount={status:'creating',shopify_variant_id:null};return {data:[{action:'create',variant_id:null}]}}
  if(name==='bind_native_gift_variant'){state.amount={status:'ready',shopify_variant_id:String(args.p_variant)};return {data:true}}
  if(name==='mark_native_gift_variant_unknown'){state.amount={status:'unknown',shopify_variant_id:args.p_variant as string|null};return {data:true}}
  throw Error('unexpected RPC')
 })}
 vi.mocked(admin).mockImplementation(async(query)=>query===NATIVE_GIFT_PRODUCT_QUERY?provider:query===NATIVE_GIFT_VARIANT_QUERY?{productVariant:variant}:{productVariantsBulkCreate:{productVariants:[{id:vid}],userErrors:[]}} as never)
 vi.mocked(storefront).mockImplementation(async(query)=>query===NATIVE_GIFT_CHANNEL_QUERY?{product:{id:pid}}:{node:visible} as never)
 return {db,state,local,binding,provider,variant,visible}
}
beforeEach(()=>{vi.resetAllMocks();delete process.env.SHOPIFY_NATIVE_GIFT_CATALOG_WRITES_ENABLED})
it('keeps creation dormant and requires the actual write_products grant',async()=>{
 const f=fixture()
 await expect(resolveNativeGiftVariant(f.db as never,request)).rejects.toThrow('NATIVE_GIFT_CATALOG_WRITES_DISABLED')
 expect(f.db.rpc).not.toHaveBeenCalled()
 f.provider.currentAppInstallation.accessScopes=[]
 process.env.SHOPIFY_NATIVE_GIFT_CATALOG_WRITES_ENABLED='true'
 await expect(resolveNativeGiftVariant(f.db as never,request)).rejects.toThrow('NATIVE_GIFT_WRITE_SCOPE_REQUIRED')
 expect(f.db.rpc).not.toHaveBeenCalled()
})
it('appends one immutable cent denomination, preserving every existing variant and verifying its real channel',async()=>{
 const f=fixture();process.env.SHOPIFY_NATIVE_GIFT_CATALOG_WRITES_ENABLED='true'
 expect(await resolveNativeGiftVariant(f.db as never,request)).toEqual({shopifyVariantId:vid,shopifyProductId:pid,amountCents:2025,nativeGiftCard:true})
 const mutations=vi.mocked(admin).mock.calls.filter(([query])=>query===APPEND_NATIVE_GIFT_VARIANT)
 expect(mutations).toHaveLength(1)
 expect(APPEND_NATIVE_GIFT_VARIANT).toContain('PRESERVE_STANDALONE_VARIANT')
 expect(mutations[0][1]).toMatchObject({product:pid,variants:[{price:'20.25',taxable:false,published:true,inventoryItem:{tracked:false,requiresShipping:false}}]})
 expect(storefront).toHaveBeenCalledWith(expect.any(String),{id:vid},request.buyerIp)
 await resolveNativeGiftVariant(f.db as never,request)
 expect(vi.mocked(admin).mock.calls.filter(([query])=>query===APPEND_NATIVE_GIFT_VARIANT)).toHaveLength(1)
})
it('rejects amount input outside current database rules before provider or registry mutations',async()=>{
 const f=fixture();f.local.gift_card_min_amount=25
 await expect(resolveNativeGiftVariant(f.db as never,request)).rejects.toThrow('NATIVE_GIFT_AMOUNT_UNAVAILABLE')
 expect(admin).not.toHaveBeenCalled();expect(f.db.rpc).not.toHaveBeenCalled()
})
it.each([1999,100001,2000.1,NaN])('rejects invalid cents %s',async(amountCents)=>{
 const f=fixture();await expect(resolveNativeGiftVariant(f.db as never,{...request,amountCents})).rejects.toThrow()
 expect(f.db.from).not.toHaveBeenCalled()
})
it('never reprices a registered denomination that changed in Shopify',async()=>{
 const f=fixture();f.state.amount={status:'ready',shopify_variant_id:vid};f.variant.price='21.00'
 await expect(resolveNativeGiftVariant(f.db as never,request)).rejects.toThrow('NATIVE_GIFT_VARIANT_CHANGED')
 expect(f.db.rpc).not.toHaveBeenCalled()
 expect(vi.mocked(admin).mock.calls.filter(([query])=>query===APPEND_NATIVE_GIFT_VARIANT)).toHaveLength(0)
})
it.each(['taxable','tracked','requiresShipping','gift'])('refuses an invalid native contract: %s',async(kind)=>{
 const f=fixture();f.state.amount={status:'ready',shopify_variant_id:vid}
 if(kind==='taxable')f.variant.taxable=true
 if(kind==='tracked')f.variant.inventoryItem.tracked=true
 if(kind==='requiresShipping')f.variant.inventoryItem.requiresShipping=true
 if(kind==='gift')f.provider.product.isGiftCard=false
 await expect(resolveNativeGiftVariant(f.db as never,request)).rejects.toThrow()
 expect(f.db.rpc).not.toHaveBeenCalled()
})
it('does not infer buyer-channel publication from an active Admin product',async()=>{
 const f=fixture();f.state.amount={status:'ready',shopify_variant_id:vid};f.visible.availableForSale=false
 await expect(resolveNativeGiftVariant(f.db as never,request)).rejects.toThrow()
 expect(f.db.rpc).not.toHaveBeenCalled()
})
it('honours provider and reviewed finite capacity without deleting old denominations',async()=>{
 const f=fixture();process.env.SHOPIFY_NATIVE_GIFT_CATALOG_WRITES_ENABLED='true';f.provider.shop.resourceLimits.maxProductVariants=3
 await expect(resolveNativeGiftVariant(f.db as never,request)).rejects.toThrow('NATIVE_GIFT_VARIANT_CAPACITY')
 expect(f.db.rpc).not.toHaveBeenCalled()
})
it('records an uncertain append once and never retries its provider mutation',async()=>{
 const f=fixture();process.env.SHOPIFY_NATIVE_GIFT_CATALOG_WRITES_ENABLED='true'
 vi.mocked(admin).mockImplementation(async(query)=>{if(query===APPEND_NATIVE_GIFT_VARIANT)throw Error('lost response');return f.provider as never})
 await expect(resolveNativeGiftVariant(f.db as never,request)).rejects.toThrow('NATIVE_GIFT_VARIANT_PENDING_REVIEW')
 await expect(resolveNativeGiftVariant(f.db as never,request)).rejects.toThrow('NATIVE_GIFT_VARIANT_PENDING_REVIEW')
 expect(f.state.amount?.status).toBe('unknown')
 expect(vi.mocked(admin).mock.calls.filter(([query])=>query===APPEND_NATIVE_GIFT_VARIANT)).toHaveLength(1)
})

it('lets readiness verify only pre-provisioned amounts without creating anything',async()=>{
 const f=fixture();process.env.SHOPIFY_NATIVE_GIFT_CATALOG_WRITES_ENABLED='true'
 await expect(resolveNativeGiftVariant(f.db as never,{...request,allowCreate:false})).rejects.toThrow('NATIVE_GIFT_AMOUNT_UNPROVISIONED')
 expect(f.db.rpc).not.toHaveBeenCalled()
 f.state.amount={status:'ready',shopify_variant_id:vid}
 expect((await resolveNativeGiftVariant(f.db as never,{...request,allowCreate:false})).nativeGiftCard).toBe(true)
 expect(f.db.rpc).not.toHaveBeenCalled()
})
it('surfaces the measured creation budget without attempting a provider write',async()=>{
 const f=fixture();process.env.SHOPIFY_NATIVE_GIFT_CATALOG_WRITES_ENABLED='true'
 f.db.rpc.mockResolvedValue({error:{message:'NATIVE_GIFT_CREATION_RATE_LIMIT'}} as never)
 await expect(resolveNativeGiftVariant(f.db as never,request)).rejects.toThrow('NATIVE_GIFT_CREATION_RATE_LIMIT')
 expect(vi.mocked(admin).mock.calls.filter(([query])=>query===APPEND_NATIVE_GIFT_VARIANT)).toHaveLength(0)
})

it('checks the existing product is on the buyer channel before appending any new amount',async()=>{
 const f=fixture();process.env.SHOPIFY_NATIVE_GIFT_CATALOG_WRITES_ENABLED='true'
 vi.mocked(storefront).mockResolvedValue({product:null} as never)
 await expect(resolveNativeGiftVariant(f.db as never,request)).rejects.toThrow()
 expect(f.db.rpc).not.toHaveBeenCalled()
 expect(vi.mocked(admin).mock.calls.filter(([query])=>query===APPEND_NATIVE_GIFT_VARIANT)).toHaveLength(0)
})
