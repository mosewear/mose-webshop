// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import publicConfig from '@/lib/mose-edit-pilot-config.json'
import { parseMoseEditPilotConfig } from '@/lib/mose-edit-pilot-config-parser'

vi.mock('server-only', () => ({}))
const row = { id: '00000000-0000-4000-8000-000000000001', emailHash: createHash('sha256').update('synthetic-only@example.test').digest('hex'), proofKind: 'site-signup', source: 'homepage' }
const config = () => ({ ...publicConfig, roster: [{ ...row }] })
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

describe('private pilot environment configuration', () => {
  it('keeps only nonpersonal metadata in the public configuration', () => {
    expect(publicConfig.roster).toEqual([])
    expect(JSON.stringify(publicConfig)).not.toContain('emailHash')
  })
  it('preserves the full approved campaign configuration when a private roster is valid', () => {
    const input = config()
    const result = parseMoseEditPilotConfig(JSON.stringify(input))
    expect(result.ready).toBe(true)
    expect(result.reason).toBe('ready')
    expect(result.config).toEqual(input)
  })
  it('fails closed without leaking input for missing, invalid, huge and unknown fields', () => {
    for (const input of [undefined, '', 'not-json', ' '.repeat(128001) + '{}', JSON.stringify({ ...config(), unwanted: 'private-value' }), JSON.stringify({ ...config(), roster: [] })]) {
      const result = parseMoseEditPilotConfig(input)
      expect(result.ready).toBe(false)
      expect(result.config.roster).toEqual([])
      expect(JSON.stringify(result)).not.toContain(row.emailHash)
      expect(JSON.stringify(result)).not.toContain('private-value')
    }
  })
  it('rejects invalid or duplicate identities, hashes, proof kinds and oversized rosters', () => {
    for (const roster of [
      [{ ...row, id: 'not-a-uuid' }], [{ ...row, emailHash: 'not-a-hash' }], [{ ...row, proofKind: 'silent-import' }],
      [row, { ...row }], [row, { ...row, id: '00000000-0000-4000-8000-000000000002' }],
      Array.from({ length: 101 }, () => row),
    ]) {
      const result = parseMoseEditPilotConfig(JSON.stringify({ ...config(), roster }))
      expect(result.ready).toBe(false)
      expect(result.config.roster).toHaveLength(0)
    }
  })
  it('does not let environment values change reviewed timing, campaign content or send limits', () => {
    for (const patch of [
      { subject: 'Different subject' }, { htmlSha256: 'a'.repeat(64) },
      { startAt: '2026-10-25T12:00:00Z' }, { batchSize: 1 }, { maximumCommercialEmails30d: 2 },
    ]) {
      expect(parseMoseEditPilotConfig(JSON.stringify({ ...config(), ...patch })).ready).toBe(false)
    }
    expect(parseMoseEditPilotConfig(JSON.stringify({ ...config(), immediateSendAuthorizedAt: undefined })).ready).toBe(false)
    expect(parseMoseEditPilotConfig(JSON.stringify({ ...config(), threeIn30DaysAuthorizedAt: undefined })).ready).toBe(false)
  })
  it('uses only the server environment variable, never the empty public roster as approval', async () => {
    vi.stubEnv('MOSE_EDIT_PILOT_CONFIG_JSON', JSON.stringify(config()))
    const loaded = await import('@/lib/mose-edit-pilot-config-server')
    expect(loaded.MOSE_EDIT_PILOT_CONFIG_READY).toBe(true)
    expect(loaded.MOSE_EDIT_PILOT_CONFIG.roster).toEqual([row])
    vi.resetModules()
    vi.stubEnv('MOSE_EDIT_PILOT_CONFIG_JSON', '')
    const closed = await import('@/lib/mose-edit-pilot-config-server')
    expect(closed.MOSE_EDIT_PILOT_CONFIG_READY).toBe(false)
    expect(closed.MOSE_EDIT_PILOT_CONFIG.roster).toEqual([])
  })
})
