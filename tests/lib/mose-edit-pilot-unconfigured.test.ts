// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
const db = vi.hoisted(() => vi.fn())
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: db }))
vi.mock('@/lib/toestemming', () => ({}))
vi.mock('@/lib/brevo', () => ({}))
vi.mock('@/lib/postmark', () => ({}))
vi.mock('@/lib/mose-edit-pilot-config-server', () => ({ MOSE_EDIT_PILOT_CONFIG_READY: false, MOSE_EDIT_PILOT_CONFIG: { roster: [] } }))
import { eligiblePilotRecipients, runMoseEditPilot } from '@/lib/mose-edit-pilot'

describe('unconfigured pilot remains dormant', () => {
  it('does not contact providers or databases for eligibility or sending', async () => {
    await expect(eligiblePilotRecipients()).rejects.toThrow('Privéconfiguratie')
    const result = await runMoseEditPilot({ id: 'synthetic-campaign', slug: 'synthetic', onderwerp: 'test', html: '', status: 'actief' }, { id: 'synthetic-moment', label: 'Test', start_op: '2026-10-27T10:00:00Z' })
    expect(result.verzonden).toBe(0)
    expect(result.reden).toContain('niets verstuurd')
    expect(db).not.toHaveBeenCalled()
  })
})
