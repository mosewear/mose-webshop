// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), service: vi.fn(), update: vi.fn(), result: vi.fn(), invalidate: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ requireAdmin: mocks.auth }))
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: mocks.service }))
vi.mock('next/cache', () => ({ revalidateTag: mocks.invalidate }))
import { PATCH } from '@/app/api/admin/instagram/posts/[id]/route'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue({ authorized: true })
  mocks.result.mockResolvedValue({ data: { id: 'post-id' }, error: null })
  const query = { eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), maybeSingle: mocks.result }
  mocks.update.mockReturnValue(query)
  mocks.service.mockReturnValue({ from: vi.fn().mockReturnValue({ update: mocks.update }) })
})
function request(body: unknown) {
  return PATCH(new NextRequest('https://www.mosewear.com/api/admin/instagram/posts/post-id', { method: 'PATCH', body: JSON.stringify(body) }), { params: Promise.resolve({ id: 'post-id' }) })
}
describe('Instagram editorial visibility', () => {
  it('requires admin authorization before changing curation', async () => {
    mocks.auth.mockResolvedValue({ authorized: false })
    expect((await request({ is_hidden: true })).status).toBe(403)
    expect(mocks.service).not.toHaveBeenCalled()
  })
  it.each([true, false])('persists the editor choice %s so sync cannot override it', async (hidden) => {
    expect((await request({ is_hidden: hidden })).status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith({ is_hidden: hidden, is_manually_hidden: hidden })
    expect(mocks.invalidate).toHaveBeenCalled()
  })
  it('caption edits preserve the existing editorial visibility', async () => {
    expect((await request({ caption: 'Een nieuwe tekst.' })).status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith({ caption: 'Een nieuwe tekst.' })
  })
  it('does not accept the internal visibility flag as a separate public patch field', async () => {
    expect((await request({ is_manually_hidden: false })).status).toBe(400)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
