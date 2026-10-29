// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ requireAdmin: mocks.auth }))
vi.mock('@/lib/admin-analytics', () => ({ readAdminAnalytics: mocks.read }))
import { GET } from '@/app/api/admin/analytics/route'
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ authorized: true }); mocks.read.mockResolvedValue({ stats: {} }) })
const request = (days: string) => GET(new NextRequest('https://www.mosewear.com/api/admin/analytics?days=' + days))
describe('private combined analytics endpoint', () => {
  it('checks admin access before loading financial records', async () => {
    mocks.auth.mockResolvedValue({ authorized: false })
    expect((await request('30')).status).toBe(403)
    expect(mocks.read).not.toHaveBeenCalled()
  })
  it('accepts only supported periods', async () => {
    expect((await request('100000')).status).toBe(400)
    expect(mocks.read).not.toHaveBeenCalled()
  })
  it('keeps the response private and uncached', async () => {
    const response = await request('7')
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })
  it('returns an explicit error instead of incomplete financial totals or provider secrets', async () => {
    mocks.read.mockRejectedValue(new Error('private provider credentials'))
    const response = await request('30')
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('credentials')
  })
})
