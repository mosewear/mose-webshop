// @vitest-environment node
import {beforeEach,describe,it,expect,vi} from 'vitest'
import {NextRequest} from 'next/server'
const mocks=vi.hoisted(()=>({worker:vi.fn(),auth:vi.fn(),db:vi.fn(),read:vi.fn()}))
vi.mock('@/lib/tapstitch-cloud',()=>({runTapstitchCloud:mocks.worker}))
vi.mock('@/lib/supabase/admin',()=>({requireAdmin:mocks.auth}))
vi.mock('@/lib/supabase/service',()=>({createServiceClient:mocks.db}))
vi.mock('@/lib/admin-order-overview',()=>({readAllAdminRows:mocks.read}))
import {GET as cron} from '@/app/api/cron/tapstitch/route'
import {GET as health} from '@/app/api/admin/tapstitch/route'
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('CRON_SECRET','c'.repeat(32))})
describe('production cloud trust boundaries',()=>{
 it('cannot start a billed cloud browser through a public cron request',async()=>{
  const r=await cron(new NextRequest('https://www.mosewear.com/api/cron/tapstitch'))
  expect(r.status).toBe(401);expect(mocks.worker).not.toHaveBeenCalled()
 })
 it('runs only behind the existing server cron credential',async()=>{
  mocks.worker.mockResolvedValue({queued:true})
  const r=await cron(new NextRequest('https://www.mosewear.com/api/cron/tapstitch',{headers:{Authorization:'Bearer '+'c'.repeat(32)}}))
  expect(r.status).toBe(200);expect(mocks.worker).toHaveBeenCalledOnce()
 })
 it('never leaks provider credentials on a failed worker',async()=>{
  mocks.worker.mockRejectedValue(Error('private-secret'))
  const r=await cron(new NextRequest('https://www.mosewear.com/api/cron/tapstitch',{headers:{Authorization:'Bearer '+'c'.repeat(32)}}))
  expect(r.status).toBe(503);expect(await r.text()).not.toContain('private-secret')
 })
 it('does not expose supplier status or health to an unprivileged visitor',async()=>{
  mocks.auth.mockResolvedValue({authorized:false})
  const r=await health();expect(r.status).toBe(403);expect(mocks.db).not.toHaveBeenCalled();expect(mocks.read).not.toHaveBeenCalled()
 })
})
