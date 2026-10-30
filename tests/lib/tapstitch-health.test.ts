import { expect, it } from 'vitest'
import { productionSyncOverdue } from '@/lib/tapstitch-production'
const now = Date.parse('2026-10-30T08:00:00Z')
it('detects an overdue scheduler without requiring any observed orders', () => {
  expect(
    productionSyncOverdue(
      {
        state: 'completed',
        next_run_at: '2026-10-30T07:44:59Z',
        started_at: null,
      },
      true,
      now,
    ),
  ).toBe(true)
  expect(
    productionSyncOverdue(
      {
        state: 'completed',
        next_run_at: '2026-10-30T07:45:00Z',
        started_at: null,
      },
      true,
      now,
    ),
  ).toBe(false)
  expect(
    productionSyncOverdue(
      {
        state: 'completed',
        next_run_at: '2026-10-30T14:00:00Z',
        started_at: null,
      },
      true,
      now,
    ),
  ).toBe(false)
})
it('gives an active browser run a bounded grace period and fails visibly on missing timestamps', () => {
  for (const state of ['starting', 'running']) {
    expect(
      productionSyncOverdue(
        {
          state,
          next_run_at: '2026-10-30T07:00:00Z',
          started_at: '2026-10-30T07:31:00Z',
        },
        true,
        now,
      ),
    ).toBe(false)
    expect(
      productionSyncOverdue(
        {
          state,
          next_run_at: '2026-10-30T14:00:00Z',
          started_at: '2026-10-30T07:29:00Z',
        },
        true,
        now,
      ),
    ).toBe(true)
    expect(
      productionSyncOverdue(
        { state, next_run_at: '2026-10-30T14:00:00Z', started_at: null },
        true,
        now,
      ),
    ).toBe(true)
  }
  expect(
    productionSyncOverdue(
      { state: 'idle', next_run_at: null, started_at: null },
      true,
      now,
    ),
  ).toBe(true)
  expect(
    productionSyncOverdue(
      { state: 'idle', next_run_at: null, started_at: null },
      false,
      now,
    ),
  ).toBe(false)
})
