// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ authorize: vi.fn(), database: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ requireAdmin: mocks.authorize }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: mocks.database }))
import { GET } from '@/app/api/admin/shopify/readiness/route'

describe('private Shopify readiness endpoint', () => {
  beforeEach(() => { vi.resetAllMocks() })
  it('does not create a privileged database client for unauthorized callers', async () => {
    mocks.authorize.mockResolvedValue({ authorized: false })
    const response = await GET()
    expect(response.status).toBe(403)
    expect(mocks.database).not.toHaveBeenCalled()
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
  it('reports unknown evidence on database failure without exposing internals', async () => {
    mocks.authorize.mockResolvedValue({ authorized: true })
    mocks.database.mockImplementation(() => { throw new Error('private-database-secret') })
    const response = await GET()
    const text = await response.text()
    expect(response.status).toBe(200)
    expect(text).not.toContain('private-database-secret')
    const data = JSON.parse(text)
    expect(data.counts).toEqual({ mappings: null, released: null, pendingEvents: null, failedEvents: null })
    expect(data.status).not.toBe('technical_checks_passed')
    expect(data.checks.find((c: { key: string }) => c.key === 'stock').status).toBe('unknown')
  })
})
