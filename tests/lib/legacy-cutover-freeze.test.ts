import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ single: vi.fn(), create: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mock.create }))
import { legacyCutoverFreezeResponse } from '@/lib/legacy-cutover-freeze'

describe('independent legacy maintenance gate', () => {
  beforeEach(() => {
    vi.stubEnv('LEGACY_CUTOVER_GUARD_ENABLED', 'true')
    mock.create.mockReturnValue({ from: () => ({ select: () => ({ eq: () => ({ single: mock.single }) }) }) })
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })
  it('is inert before its migration and guard flag are enabled', async () => {
    vi.stubEnv('LEGACY_CUTOVER_GUARD_ENABLED', 'false')
    expect(await legacyCutoverFreezeResponse()).toBeNull()
    expect(mock.create).not.toHaveBeenCalled()
  })
  it('allows an explicitly unfrozen database state', async () => {
    mock.single.mockResolvedValue({ data: { checkout_frozen: false }, error: null })
    expect(await legacyCutoverFreezeResponse()).toBeNull()
  })
  it.each([
    { data: { checkout_frozen: true }, error: null },
    { data: null, error: { message: 'missing migration' } },
    { data: {}, error: null },
  ])('blocks frozen or unknown state independently of Shopify release', async (result) => {
    vi.stubEnv('SHOPIFY_CHECKOUT_ENABLED', 'false')
    mock.single.mockResolvedValue(result)
    const response = await legacyCutoverFreezeResponse()
    expect(response?.status).toBe(503)
    expect(response?.headers.get('Cache-Control')).toBe('no-store')
    expect(await response?.json()).toMatchObject({ code: 'CHECKOUT_TEMPORARILY_PAUSED' })
  })
  it('fails closed when database access throws', async () => {
    mock.single.mockRejectedValue(new Error('network failure'))
    expect((await legacyCutoverFreezeResponse())?.status).toBe(503)
  })
})
