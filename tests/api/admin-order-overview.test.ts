// @vitest-environment node
import {beforeEach,describe,it,expect,vi} from 'vitest'
const mocks=vi.hoisted(()=>({auth:vi.fn(),read:vi.fn()}))
vi.mock('@/lib/supabase/admin',()=>({requireAdmin:mocks.auth}))
vi.mock('@/lib/admin-order-overview',()=>({readAdminOrderOverview:mocks.read}))
import {GET} from '@/app/api/admin/order-overview/route'
beforeEach(()=>vi.clearAllMocks())
describe('unified order overview access',()=>{
 it('blocks access before reading customer or financial data',async()=>{
  mocks.auth.mockResolvedValue({authorized:false})
  const r=await GET()
  expect(r.status).toBe(403);expect(mocks.read).not.toHaveBeenCalled()
 })
 it('never caches private order data',async()=>{
  mocks.auth.mockResolvedValue({authorized:true});mocks.read.mockResolvedValue([])
  const r=await GET();expect(r.status).toBe(200);expect(r.headers.get('Cache-Control')).toBe('private, no-store')
 })
 it('fails visibly instead of returning incomplete financial totals',async()=>{
  mocks.auth.mockResolvedValue({authorized:true});mocks.read.mockRejectedValue(new Error('secret provider response'))
  const r=await GET();expect(r.status).toBe(503);expect(await r.text()).not.toContain('secret')
 })
})
