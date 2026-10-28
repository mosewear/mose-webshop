// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { runtimeReadiness } from '@/lib/shopify/runtime-readiness'
const now = Date.parse('2026-10-28T12:00:00Z')
const healthy = { cutover_at: '2026-10-28T10:00:00Z', review_reference: 'review', last_worker_at: '2026-10-28T11:59:00Z', pending_count: 0, dead_letter_count: 0 }
let responses: Record<string, { data?: unknown; error?: unknown }>
const rpc = vi.fn((name: string) => ({ abortSignal: () => Promise.resolve(responses[name]) }))
const db = { rpc } as unknown as SupabaseClient
beforeEach(() => {
  for (const key of ['SHOPIFY_LOYALTY_SYNC_ENABLED','LOYALTY_ATOMIC_ENABLED','SHOPIFY_SYNC_ENABLED','SHOPIFY_LEGACY_STOCK_SYNC_ENABLED','LEGACY_INVENTORY_ATOMIC_ENABLED','SHOPIFY_BENEFIT_SYNC_ENABLED','ATOMIC_PROMO_ENABLED','SHOPIFY_BENEFIT_WRITES_ENABLED','SHOPIFY_CUSTOMER_BINDING_ENABLED']) vi.stubEnv(key,'true')
  responses = { legacy_loyalty_writer_health: { data: [{ generation: 1 }] }, shopify_loyalty_health: { data: [healthy] }, shopify_benefits_health: { data: [healthy] }, legacy_stock_bridge_health: { data: { pending: 0, deadLetters: 0, shortfalls: 0, expectedOwnershipCount: 27, verifiedOwnershipCount: 27, returnStockCutoverReady: true, lastWorkerAt: '2026-10-28T11:59:00Z' } } }
  rpc.mockClear()
})
afterEach(() => vi.unstubAllEnvs())
it('checks the installed writer contract, live loyalty queue and unconfirmed stock deltas', async () => {
  expect((await runtimeReadiness(db,now)).map(check=>check.status)).toEqual(['verified','verified','verified'])
  expect(rpc.mock.calls.map(call=>call[0]).sort()).toEqual(['legacy_loyalty_writer_health','legacy_stock_bridge_health','shopify_benefits_health','shopify_loyalty_health'])
})
it('does not call missing services when the relevant runtime is disabled', async () => {
  vi.stubEnv('SHOPIFY_BENEFIT_SYNC_ENABLED','false'); vi.stubEnv('SHOPIFY_LOYALTY_SYNC_ENABLED','false'); vi.stubEnv('LEGACY_INVENTORY_ATOMIC_ENABLED','false')
  expect((await runtimeReadiness(db,now)).map(check=>check.status)).toEqual(['missing','missing','missing'])
  expect(rpc).not.toHaveBeenCalled()
})
it.each(['pending','deadLetters','shortfalls'])('blocks every unresolved stock %s', async key => {
  responses.legacy_stock_bridge_health.data = { pending: 0, deadLetters: 0, shortfalls: 0, [key]: 1 }
  expect((await runtimeReadiness(db,now))[1].status).toBe('missing')
})
it('does not coerce missing queue evidence or an old writer into readiness', async () => {
  responses.legacy_stock_bridge_health.data = { pending: null, deadLetters: 0, shortfalls: 0 }
  responses.legacy_loyalty_writer_health.data = [{ generation: 0 }]
  expect((await runtimeReadiness(db,now)).map(check=>check.status)).toEqual(['missing','missing','verified'])
})
it('keeps provider/database errors unknown and blocks stale financial processing', async () => {
  responses.legacy_stock_bridge_health = { error: { message: 'unavailable' } }
  responses.shopify_loyalty_health.data = [{ ...healthy, last_worker_at: '2020-01-01T00:00:00Z' }]
  expect((await runtimeReadiness(db,now)).map(check=>check.status)).toEqual(['missing','unknown','verified'])
})

it.each([{expectedOwnershipCount:28},{verifiedOwnershipCount:null},{lastWorkerAt:'2020-01-01T00:00:00Z'},{lastWorkerAt:'2026-10-28T13:00:00Z'},{returnStockCutoverReady:false},{pending:false}])('blocks incomplete or stale stock runtime evidence %j', async patch => {
 responses.legacy_stock_bridge_health.data = {...responses.legacy_stock_bridge_health.data as object,...patch}
 expect((await runtimeReadiness(db,now))[1].status).toBe('missing')
})
it('blocks stale discount settlement even with healthy inventory and loyalty', async () => {
 responses.shopify_benefits_health.data=[{...healthy,last_worker_at:'2020-01-01T00:00:00Z'}]
 expect((await runtimeReadiness(db,now))[2].status).toBe('missing')
})
