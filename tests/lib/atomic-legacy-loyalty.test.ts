import { describe, expect, it, vi, afterEach } from 'vitest'
import { atomicLegacyLoyalty, atomicLoyaltyEnabled } from '@/lib/atomic-legacy-loyalty'

afterEach(() => { vi.unstubAllEnvs() })
describe('atomic legacy loyalty bridge', () => {
  it('defaults off and never infers activation from new checkout cutover', () => {
    vi.stubEnv('LOYALTY_ATOMIC_ENABLED', '')
    vi.stubEnv('SHOPIFY_CHECKOUT_ENABLED', 'true')
    expect(atomicLoyaltyEnabled()).toBe(false)
    vi.stubEnv('LOYALTY_ATOMIC_ENABLED', 'true')
    expect(atomicLoyaltyEnabled()).toBe(true)
  })
  it('keeps one canonical order UUID key for a late legacy provider replay', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { success: true, duplicate: true }, error: null })
    const result = await atomicLegacyLoyalty({ rpc } as any, { kind: 'earn',
      key: 'legacy:order:order-uuid:earn', email: 'synthetic@example.test', userId: null,
      orderId: 'order-uuid', amount: 79 })
    expect(result.duplicate).toBe(true)
    expect(rpc).toHaveBeenCalledWith('atomic_legacy_loyalty', expect.objectContaining({
      p_kind: 'earn', p_key: 'legacy:order:order-uuid:earn', p_order: 'order-uuid', p_amount: 79,
    }))
  })
  it('fails without unsafe compensating balance or history writes', async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'LOYALTY_INSUFFICIENT_POINTS' } }), from: vi.fn() }
    await expect(atomicLegacyLoyalty(client as any, { kind: 'redeem', key: 'retry-key',
      email: 'synthetic@example.test', userId: 'user', points: 100 })).rejects.toThrow('INSUFFICIENT')
    expect(client.from).not.toHaveBeenCalled()
  })
})
