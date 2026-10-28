import{beforeEach,expect,it,vi}from'vitest'
import{bindAuthenticatedShopifyCustomer}from'@/lib/shopify/customer-binding'
import{admin}from'@/lib/shopify/client'
vi.mock('@/lib/shopify/client',()=>({admin:vi.fn()}))
const user={id:'00000000-0000-4000-8000-000000000001',email:'owner@test.invalid',email_confirmed_at:'2026-10-28T10:00:00Z'}
const client=()=>{const maybeSingle=vi.fn().mockResolvedValue({data:null});const eq=vi.fn().mockReturnValue({maybeSingle});const select=vi.fn().mockReturnValue({eq});return{from:vi.fn().mockReturnValue({select}),rpc:vi.fn().mockResolvedValue({data:true}),maybeSingle}}
beforeEach(()=>{delete process.env.SHOPIFY_CUSTOMER_BINDING_ENABLED;vi.mocked(admin).mockReset()})
it('has no provider/database side effects while default off or identity unconfirmed',async()=>{
 const db=client();await expect(bindAuthenticatedShopifyCustomer(db as never,user,'a'.repeat(32))).rejects.toThrow('CUSTOMER_BINDING_DISABLED')
 process.env.SHOPIFY_CUSTOMER_BINDING_ENABLED='true'
 await expect(bindAuthenticatedShopifyCustomer(db as never,{...user,email_confirmed_at:null},'a'.repeat(32))).rejects.toThrow()
 expect(admin).not.toHaveBeenCalled();expect(db.from).not.toHaveBeenCalled()
})
it('upserts only verified email, checks provider identity and saves private binding',async()=>{
 process.env.SHOPIFY_CUSTOMER_BINDING_ENABLED='true'
 const db=client();vi.mocked(admin).mockResolvedValue({customerSet:{customer:{id:'gid://shopify/Customer/1',defaultEmailAddress:{emailAddress:user.email}},userErrors:[]}})
 expect(await bindAuthenticatedShopifyCustomer(db as never,user,'a'.repeat(32))).toEqual({customerId:'gid://shopify/Customer/1',email:user.email})
 expect(vi.mocked(admin).mock.calls[0][1]).toEqual({input:{email:user.email},identifier:{email:user.email}})
 expect(db.rpc.mock.calls[0][1]).not.toHaveProperty('email')
})
it('refuses email changes, provider mismatch and failed durable binding',async()=>{
 process.env.SHOPIFY_CUSTOMER_BINDING_ENABLED='true'
 const db=client();db.maybeSingle.mockResolvedValue({data:{email_hash:'changed'}} as never)
 await expect(bindAuthenticatedShopifyCustomer(db as never,user,'a'.repeat(32))).rejects.toThrow('CUSTOMER_REBIND_REQUIRED')
 expect(admin).not.toHaveBeenCalled()
 db.maybeSingle.mockResolvedValue({data:null});vi.mocked(admin).mockResolvedValue({customerSet:{customer:{id:'gid://shopify/Customer/1',defaultEmailAddress:{emailAddress:'other@test.invalid'}},userErrors:[]}})
 await expect(bindAuthenticatedShopifyCustomer(db as never,user,'a'.repeat(32))).rejects.toThrow('CUSTOMER_PROVIDER_IDENTITY_MISMATCH')
 expect(db.rpc).not.toHaveBeenCalled()
})
