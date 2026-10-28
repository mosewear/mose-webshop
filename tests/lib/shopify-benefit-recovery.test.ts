import { createHash } from 'node:crypto'
import { beforeEach, expect, it, vi } from 'vitest'
import { recoverRejectedBenefits, recordDefinitiveNoCart } from '@/lib/shopify/benefit-recovery'
import { admin } from '@/lib/shopify/client'
vi.mock('@/lib/shopify/client',()=>({admin:vi.fn()}))
const a='00000000-0000-4000-8000-000000000001',p='gid://shopify/DiscountCodeNode/1',code='PRIVATE-EXAMPLE'
const hash=createHash('sha256').update(code).digest('hex')
const state={attemptId:a,proofToken:a,recoveredAt:null,coupons:[{providerId:p,codeHash:hash}]}
const provider=(status='ACTIVE',uses=0)=>({codeDiscountNode:{id:p,codeDiscount:{__typename:'DiscountCodeBasic',status,asyncUsageCount:uses,codes:{pageInfo:{hasNextPage:false},nodes:[{code}]}}}})
const database=(value:unknown=state)=>({rpc:vi.fn().mockImplementation((name:string)=>Promise.resolve({data:name==='shopify_benefit_recovery_state'?value:name==='complete_shopify_benefit_recovery'?'recovered':true}))})
beforeEach(()=>{delete process.env.SHOPIFY_BENEFIT_RECOVERY_ENABLED;vi.mocked(admin).mockReset()})
it('records a definite rejection only through the original lease RPC',async()=>{
 const db={rpc:vi.fn().mockResolvedValue({data:a})}
 expect(await recordDefinitiveNoCart(db as never,{attemptId:a,checkoutLease:a})).toBe(a)
 expect(db.rpc).toHaveBeenCalledWith('record_shopify_no_cart',{p_attempt:a,p_checkout_lease:a})
 expect(admin).not.toHaveBeenCalled()
})
it('default-off recovery performs no provider or database access',async()=>{
 const db=database();await expect(recoverRejectedBenefits(db as never,a)).rejects.toThrow('BENEFIT_RECOVERY_DISABLED')
 expect(db.rpc).not.toHaveBeenCalled();expect(admin).not.toHaveBeenCalled()
})
it('requires durable no-cart proof before zero provider usage can matter',async()=>{
 process.env.SHOPIFY_BENEFIT_RECOVERY_ENABLED='true'
 const db=database(null);await expect(recoverRejectedBenefits(db as never,a)).rejects.toThrow()
 expect(admin).not.toHaveBeenCalled();expect(db.rpc).toHaveBeenCalledTimes(1)
})
it('revokes, reads back exact expired unused coupon, then completes atomically',async()=>{
 process.env.SHOPIFY_BENEFIT_RECOVERY_ENABLED='true'
 const db=database()
 vi.mocked(admin).mockResolvedValueOnce(provider()).mockResolvedValueOnce({discountCodeDeactivate:{codeDiscountNode:{id:p},userErrors:[]}}).mockResolvedValueOnce(provider('EXPIRED'))
 expect(await recoverRejectedBenefits(db as never,a)).toEqual({recovered:true,revoked:1})
 expect(db.rpc.mock.calls.map(c=>c[0])).toEqual(['shopify_benefit_recovery_state','record_shopify_benefit_revocation','complete_shopify_benefit_recovery'])
 expect(admin).toHaveBeenCalledTimes(3)
})
it('does not release for a missing, used or still-active provider coupon',async()=>{
 process.env.SHOPIFY_BENEFIT_RECOVERY_ENABLED='true'
 for(const result of [{codeDiscountNode:null},provider('ACTIVE',1)]){
  const db=database();vi.mocked(admin).mockReset().mockResolvedValue(result)
  await expect(recoverRejectedBenefits(db as never,a)).rejects.toThrow()
  expect(db.rpc).toHaveBeenCalledTimes(1)
 }
 const db=database();vi.mocked(admin).mockReset().mockResolvedValueOnce(provider()).mockResolvedValueOnce({discountCodeDeactivate:{codeDiscountNode:{id:p},userErrors:[]}}).mockResolvedValueOnce(provider())
 await expect(recoverRejectedBenefits(db as never,a)).rejects.toThrow('RECOVERY_REVOCATION_UNCONFIRMED')
 expect(db.rpc).toHaveBeenCalledTimes(1)
})
it('does not release any financial hold when durable evidence fails',async()=>{
 process.env.SHOPIFY_BENEFIT_RECOVERY_ENABLED='true'
 const db=database();db.rpc.mockImplementation((name:string)=>Promise.resolve({data:name==='shopify_benefit_recovery_state'?state:false}))
 vi.mocked(admin).mockResolvedValue(provider('EXPIRED'))
 await expect(recoverRejectedBenefits(db as never,a)).rejects.toThrow('RECOVERY_EVIDENCE_UNCONFIRMED')
 expect(db.rpc.mock.calls.some(c=>c[0]==='complete_shopify_benefit_recovery')).toBe(false)
})
it('bounded operator run can continue later without issuing a second voucher',async()=>{
 process.env.SHOPIFY_BENEFIT_RECOVERY_ENABLED='true'
 const db=database();await expect(recoverRejectedBenefits(db as never,a,{deadline:Date.now()+1000})).rejects.toThrow('RECOVERY_CONTINUE_REQUIRED')
 expect(admin).not.toHaveBeenCalled()
})
