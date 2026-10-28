// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mock=vi.hoisted(()=>({authorized:false,db:{},recover:vi.fn(),liabilities:vi.fn(),list:vi.fn(),service:vi.fn()}))
vi.mock('@/lib/supabase/admin',()=>({requireAdmin:vi.fn(async()=>({authorized:mock.authorized}))}))
vi.mock('@/lib/supabase/service',()=>({createServiceClient:mock.service}))
vi.mock('@/lib/shopify/benefit-recovery',()=>({recoverRejectedBenefits:mock.recover,readBenefitLiabilities:mock.liabilities,listBenefitRecoveries:mock.list}))
import { GET, POST } from '@/app/api/admin/shopify/benefits/route'
const id='00000000-0000-4000-8000-000000000001'
const request=(origin='https://www.mosewear.com')=>new NextRequest('https://www.mosewear.com/api/admin/shopify/benefits',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({attemptId:id})})
beforeEach(()=>{vi.clearAllMocks();mock.authorized=false;mock.service.mockReturnValue(mock.db);mock.liabilities.mockResolvedValue({heldPoints:100});mock.list.mockResolvedValue([]);mock.recover.mockResolvedValue({recovered:true,revoked:1});delete process.env.SHOPIFY_BENEFIT_RECOVERY_ENABLED;process.env.NEXT_PUBLIC_SITE_URL='https://www.mosewear.com'})
it('denies non-admin read/write before any service access',async()=>{
 expect((await GET()).status).toBe(403);expect((await POST(request())).status).toBe(403);expect(mock.service).not.toHaveBeenCalled()
})
it('offers private read-only liability overview while recovery stays off',async()=>{
 mock.authorized=true;const response=await GET();expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toContain('no-store')
 expect(await response.json()).toEqual({enabled:false,liabilities:{heldPoints:100},attempts:[]});expect(mock.recover).not.toHaveBeenCalled()
})
it('requires same-origin and explicit server recovery enablement',async()=>{
 mock.authorized=true;expect((await POST(request('https://other.test'))).status).toBe(403);expect((await POST(request())).status).toBe(503)
 expect(mock.recover).not.toHaveBeenCalled();expect(mock.service).not.toHaveBeenCalled()
})
it('runs bounded recovery without exposing proof tokens or raw provider errors',async()=>{
 mock.authorized=true;process.env.SHOPIFY_BENEFIT_RECOVERY_ENABLED='true'
 expect((await POST(request())).status).toBe(200);expect(mock.recover).toHaveBeenCalledWith(mock.db,id,{deadline:expect.any(Number)})
 mock.recover.mockRejectedValue(new Error('private provider token customer data'))
 const failed=await POST(request());expect(failed.status).toBe(409);expect(await failed.text()).not.toContain('private provider')
})
