import{createHash}from'node:crypto'
import{beforeEach,expect,it,vi}from'vitest'
import{fetchPromoSettlement}from'@/lib/shopify/promo-settlement'
import{runBenefitWorker}from'@/lib/shopify/benefit-worker'
import{admin}from'@/lib/shopify/client'
vi.mock('@/lib/shopify/client',()=>({admin:vi.fn(),ShopifyUnavailable:class extends Error{code:string;constructor(code:string){super(code);this.code=code}}}))
const id='00000000-0000-4000-8000-000000000001',version='2026-10-28T10:00:00Z'
const code='PRIVATE-EXAMPLE',hash=createHash('sha256').update(code).digest('hex')
const input={orderId:'gid://shopify/Order/1',sourceUpdatedAt:version,attemptId:id,codeHash:hash,discountCents:590}
const allocation={allocatedAmountSet:{shopMoney:{amount:'5.90',currencyCode:'EUR'}},discountApplication:{index:0}}
const order=()=>({id:input.orderId,updatedAt:version,test:false,displayFinancialStatus:'PAID',currencyCode:'EUR',customAttributes:[{key:'mose_source',value:'unified-checkout'},{key:'mose_attempt',value:id}],discountApplications:{pageInfo:{hasNextPage:false},nodes:[{__typename:'DiscountCodeApplication',index:0,code}]},lineItems:{pageInfo:{hasNextPage:false},nodes:[{discountAllocations:[allocation]}]},shippingLines:{pageInfo:{hasNextPage:false},nodes:[]}})
beforeEach(()=>{vi.mocked(admin).mockReset();delete process.env.SHOPIFY_BENEFIT_SYNC_ENABLED;delete process.env.ATOMIC_PROMO_ENABLED})
it('settles actual paid promo without any guest account or loyalty assumption',async()=>{
 vi.mocked(admin).mockResolvedValue({order:order()})
 expect(await fetchPromoSettlement(input)).toEqual({sourceUpdatedAt:version,codeHash:hash,discountCents:590})
})
it('retains single use on partial/full refund; never returns cap to availability',async()=>{
 for(const status of ['PARTIALLY_REFUNDED','REFUNDED']){vi.mocked(admin).mockResolvedValue({order:{...order(),displayFinancialStatus:status}});expect((await fetchPromoSettlement(input)).discountCents).toBe(590)}
})
it('rejects mismatched proof/version/code/amount, pending payment, tests and truncated allocations',async()=>{
 const variants=[{...order(),updatedAt:'2026-10-28T10:01:00Z'},{...order(),customAttributes:[]},{...order(),displayFinancialStatus:'PENDING'},{...order(),test:true},{...order(),currencyCode:'USD'},
 {...order(),discountApplications:{pageInfo:{hasNextPage:true},nodes:order().discountApplications.nodes}},
 {...order(),lineItems:{pageInfo:{hasNextPage:false},nodes:[]}}]
 for(const o of variants){vi.mocked(admin).mockResolvedValue({order:o});await expect(fetchPromoSettlement(input)).rejects.toThrow()}
 vi.mocked(admin).mockResolvedValue({order:order()});await expect(fetchPromoSettlement({...input,codeHash:'b'.repeat(64)})).rejects.toThrow('PROMO_DISCOUNT_IDENTITY_MISMATCH')
})
it('default-off worker performs zero DB/provider access',async()=>{
 const rpc=vi.fn();await expect(runBenefitWorker({rpc}as never)).rejects.toThrow('BENEFIT_WORKER_DISABLED');expect(rpc).not.toHaveBeenCalled();expect(admin).not.toHaveBeenCalled()
})
it('worker acknowledges only fenced verified settlement and refreshes health after success',async()=>{
 process.env.SHOPIFY_BENEFIT_SYNC_ENABLED='true';process.env.ATOMIC_PROMO_ENABLED='true'
 const rpc=vi.fn().mockImplementation((name:string)=>Promise.resolve({data:name==='shopify_benefits_health'?[{cutover_at:'2026-10-27T00:00:00Z',review_reference:'review-private'}]:name==='claim_shopify_benefits'?(rpc.mock.calls.filter(c=>c[0]===name).length===1?[{order_id:input.orderId,attempt_id:id,source_updated_at:version,lease_token:id}]:[]):true}))
 const single=vi.fn().mockResolvedValue({data:{status:'reserved',code_hash:hash,discount_cents:590}})
 const db={rpc,from:vi.fn().mockReturnValue({select:()=>({eq:()=>({single})})})}
 const fetch=vi.fn().mockResolvedValue({sourceUpdatedAt:version,codeHash:hash,discountCents:590})
 expect(await runBenefitWorker(db as never,fetch)).toEqual({processed:1,failed:0,leaseLost:0})
 expect(fetch).toHaveBeenCalledWith(input)
 expect(rpc.mock.calls.some(c=>c[0]==='complete_shopify_benefits')).toBe(true)
 expect(rpc.mock.calls.at(-1)?.[0]).toBe('heartbeat_shopify_benefits')
})
