// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hashGiftCardCode, issueGiftCardsForOrder } from '@/lib/gift-cards'
function mockDb(options: { paid?: boolean; issued?: boolean; itemsError?: boolean; rpcError?: boolean } = {}) {
  const rpc = vi.fn().mockResolvedValue({ data: [], error: options.rpcError ? { message: 'timeout' } : null })
  const from = vi.fn((table: string) => {
    const chain: Record<string, unknown> = {}
    chain.select = () => chain
    chain.eq = () => chain
    chain.maybeSingle = async () => ({ data: { id: 'order', payment_status: options.paid === false ? 'pending' : 'paid', gift_cards_issued_at: options.issued ? '2026-10-30' : null }, error: null })
    if (table === 'order_items') chain.then = (resolve: (value: unknown) => void) => resolve({ data: [{ id: 'item', quantity: 2 }], error: options.itemsError ? {} : null })
    return chain
  })
  return { client: { from, rpc } as unknown as SupabaseClient, rpc, from }
}
describe('atomic native purchased gift-card issuer', () => {
  it('prepares one capability per unit and delegates the transaction to the database', async () => {
    const db = mockDb()
    await issueGiftCardsForOrder(db.client, 'order')
    expect(db.rpc).toHaveBeenCalledOnce()
    const [name, input] = db.rpc.mock.calls[0]
    expect(name).toBe('issue_paid_order_gift_cards')
    expect(input.p_units).toHaveLength(2)
    expect(new Set(input.p_units.map((unit: { code: string }) => unit.code)).size).toBe(2)
    for (const [unitIndex, unit] of input.p_units.entries()) expect(unit).toEqual({ orderItemId: 'item', unitIndex, code: unit.code, codeHash: hashGiftCardCode(unit.code) })
  })
  it('retries an issued order through the same ledger to recover pending deliveries', async () => {
    const db = mockDb({ issued: true })
    const payload = { code: 'existing-pending-code' }
    db.rpc.mockResolvedValue({ data: [payload], error: null })
    expect(await issueGiftCardsForOrder(db.client, 'order')).toEqual({ issued: [payload], skipped: false })
    expect(db.rpc).toHaveBeenCalledWith('issue_paid_order_gift_cards', { p_order_id: 'order', p_units: [] })
    expect(db.from).toHaveBeenCalledTimes(1)
  })
  it('never issues unpaid orders and fails closed on missing item reads or uncertain issuance', async () => {
    const unpaid = mockDb({ paid: false })
    expect(await issueGiftCardsForOrder(unpaid.client, 'order')).toEqual({ issued: [], skipped: true })
    expect(unpaid.rpc).not.toHaveBeenCalled()
    const missing = mockDb({ itemsError: true })
    await expect(issueGiftCardsForOrder(missing.client, 'order')).rejects.toThrow('GIFT_ORDER_ITEMS_UNAVAILABLE')
    expect(missing.rpc).not.toHaveBeenCalled()
    const unknown = mockDb({ rpcError: true })
    await expect(issueGiftCardsForOrder(unknown.client, 'order')).rejects.toThrow('GIFT_ATOMIC_ISSUANCE_UNCONFIRMED')
  })
})
