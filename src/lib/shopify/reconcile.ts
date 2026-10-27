import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { admin } from './client'
import { ORDERS_UPDATED_QUERY } from './admin-queries'
import { boundedSyncQuery, assertSyncBudget } from './sync-deadline'
import { safeWorkerError } from './worker'
import type { AdminExecutor } from './orders'

const pageSchema = z.object({ orders: z.object({
  nodes: z.array(z.object({ id: z.string().regex(/^gid:\/\/shopify\/Order\/\d+$/), updatedAt: z.string().datetime({ offset: true }) })),
  pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() }),
}) })

/** One durable page per invocation. Cursor and queued events commit atomically, including overlap. */
export async function reconcileOrders(db = createServiceClient(), execute: AdminExecutor = admin, options: { signal?: AbortSignal; deadline?: number } = {}) {
  assertSyncBudget(options.signal, options.deadline)
  const claimed = await boundedSyncQuery(db.rpc('claim_shopify_reconciliation'), options.signal)
  if (claimed.error) throw new Error('RECONCILIATION_UNAVAILABLE')
  const state = claimed.data?.[0]
  if (!state) return { queued: 0, busy: true, complete: false }
  try {
    const from = new Date(Date.parse(state.reconcile_watermark) - 10 * 60_000).toISOString()
    const until = new Date(state.reconcile_window_end).toISOString()
    const query = `updated_at:>='${from}' updated_at:<='${until}'`
    assertSyncBudget(options.signal, (options.deadline ?? Infinity) - 16_000)
    const parsed = pageSchema.safeParse(await execute(ORDERS_UPDATED_QUERY, { query, after: state.reconcile_cursor }))
    if (!parsed.success) throw new Error('INVALID_RECONCILIATION_RESPONSE')
    const { nodes, pageInfo } = parsed.data.orders
    if (pageInfo.hasNextPage && (!pageInfo.endCursor || pageInfo.endCursor === state.reconcile_cursor)) throw new Error('RECONCILIATION_CURSOR_INVALID')
    const cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null
    assertSyncBudget(options.signal, options.deadline)
    const saved = await boundedSyncQuery(db.rpc('checkpoint_shopify_reconciliation', { p_lease: state.reconcile_lease_token, p_cursor: cursor, p_events: nodes }), options.signal)
    if (saved.error || saved.data !== true) throw new Error('RECONCILIATION_CHECKPOINT_FAILED')
    return { queued: nodes.length, busy: false, complete: !pageInfo.hasNextPage }
  } catch (error) {
    assertSyncBudget(options.signal, options.deadline)
    const saved = await boundedSyncQuery(db.rpc('checkpoint_shopify_reconciliation', { p_lease: state.reconcile_lease_token,
      p_cursor: state.reconcile_cursor, p_events: [], p_error: safeWorkerError(error) }), options.signal)
    if (saved.error) throw new Error('RECONCILIATION_FAILURE_WRITE_FAILED')
    throw error
  }
}
