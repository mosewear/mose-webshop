import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn(), eq: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ from: mocks.from }) }))
import { addSuppression } from '@/lib/email-suppression'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.insert.mockResolvedValue({ error: null })
  mocks.eq.mockResolvedValue({ error: null })
  mocks.update.mockReturnValue({ eq: mocks.eq })
  mocks.from.mockImplementation((table: string) => table === 'email_suppressions'
    ? { insert: mocks.insert }
    : { update: mocks.update })
})
afterEach(() => vi.restoreAllMocks())

describe('suppression writes against the lower(email) unique index', () => {
  it('inserts once with a normalized address and flags the subscriber', async () => {
    await addSuppression({ email: ' TEST@example.com ', reason: 'hard_bounce' })
    expect(mocks.insert).toHaveBeenCalledOnce()
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com', reason: 'hard_bounce' }))
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ suppression_reason: 'hard_bounce', bounced_at: expect.any(String) }))
    expect(mocks.eq).toHaveBeenCalledWith('email', 'test@example.com')
  })
  it('accepts duplicate delivery and still records a spam complaint on the subscriber', async () => {
    mocks.insert.mockResolvedValue({ error: { code: '23505', message: 'localized unique violation' } })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await addSuppression({ email: 'test@example.com', reason: 'spam_complaint' })
    expect(mocks.insert).toHaveBeenCalledOnce()
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'unsubscribed', suppression_reason: 'spam_complaint' }))
    expect(log).not.toHaveBeenCalled()
  })
  it('reports genuine database errors without recipient data and attempts the subscriber mirror', async () => {
    mocks.insert.mockResolvedValue({ error: { code: '57014', message: 'query failed for test@example.com' } })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await addSuppression({ email: 'test@example.com', reason: 'manual' })
    expect(log).toHaveBeenCalledWith('[email-suppression] insert failed', { reason: 'manual', code: '57014' })
    expect(mocks.update).toHaveBeenCalledOnce()
    expect(mocks.insert).toHaveBeenCalledOnce()
  })
})
