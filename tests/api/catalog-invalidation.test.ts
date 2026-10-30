// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ admin: vi.fn(), revalidate: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ requireAdmin: mock.admin }))
vi.mock('next/cache', () => ({ revalidateTag: mock.revalidate }))
import { POST } from '@/app/api/admin/catalog/revalidate/route'
beforeEach(() => { mock.admin.mockReset().mockResolvedValue({ authorized: true }); mock.revalidate.mockReset() })
const request = (origin = 'https://www.mosewear.com') => new Request('https://www.mosewear.com/api/admin/catalog/revalidate', { method: 'POST', headers: { origin } })
it('lets an authenticated admin invalidate only public presentation data', async () => {
  expect((await POST(request())).status).toBe(200)
  expect(mock.revalidate).toHaveBeenCalledExactlyOnceWith('public-catalog', { expire: 0 })
})
it('rejects unauthenticated and cross-origin cache invalidation', async () => {
  mock.admin.mockResolvedValue({ authorized: false })
  expect((await POST(request())).status).toBe(401)
  expect((await POST(request('https://other.example'))).status).toBe(403)
  expect(mock.revalidate).not.toHaveBeenCalled()
})
