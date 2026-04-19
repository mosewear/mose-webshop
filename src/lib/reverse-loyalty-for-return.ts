import type { SupabaseClient } from '@supabase/supabase-js'
import { calculatePointsForOrder, calculateTier } from '@/lib/loyalty'

export type ReverseLoyaltyResult =
  | { ok: true; pointsDeducted: number }
  | { ok: true; skipped: string }
  | { ok: false; error: string }

/**
 * When a return is refunded, claw back loyalty points in proportion to the
 * refund amount (1 pt per whole euro, same as earning). Capped so we never
 * reverse more than was earned on the order minus prior return adjustments.
 *
 * Idempotent: one `adjusted` row per `return_id` (unique index in DB).
 */
export async function reverseLoyaltyForReturn(
  supabase: SupabaseClient,
  params: {
    returnId: string
    orderId: string
    refundAmount: number
    customerEmail: string
    userId: string | null
  }
): Promise<ReverseLoyaltyResult> {
  const { returnId, orderId, refundAmount, customerEmail, userId } = params

  const { data: existing } = await supabase
    .from('loyalty_transactions')
    .select('id, points')
    .eq('return_id', returnId)
    .maybeSingle()

  if (existing) {
    return { ok: true, skipped: 'already_reversed_for_return' }
  }

  const pointsFromRefund = calculatePointsForOrder(refundAmount)
  if (pointsFromRefund <= 0) {
    return { ok: true, skipped: 'zero_points_from_refund' }
  }

  const { data: earnedTx } = await supabase
    .from('loyalty_transactions')
    .select('points')
    .eq('order_id', orderId)
    .eq('type', 'earned')
    .maybeSingle()

  const earnedOnOrder = earnedTx?.points ?? 0
  if (earnedOnOrder <= 0) {
    return { ok: true, skipped: 'no_loyalty_earned_on_order' }
  }

  const { data: priorAdjustments } = await supabase
    .from('loyalty_transactions')
    .select('points')
    .eq('order_id', orderId)
    .eq('type', 'adjusted')
    .lt('points', 0)

  const alreadyReversed =
    priorAdjustments?.reduce((sum, row) => sum + Math.abs(row.points || 0), 0) ?? 0

  const remainingEarned = Math.max(0, earnedOnOrder - alreadyReversed)
  const actualDeduct = Math.min(pointsFromRefund, remainingEarned)

  if (actualDeduct <= 0) {
    return { ok: true, skipped: 'nothing_left_to_reverse_on_order' }
  }

  const { data: loyaltyRow, error: loyaltyFetchErr } = await supabase
    .from('loyalty_points')
    .select('id, points_balance, lifetime_points, tier, user_id')
    .eq('email', customerEmail)
    .maybeSingle()

  if (loyaltyFetchErr) {
    console.error('[reverseLoyaltyForReturn] loyalty fetch:', loyaltyFetchErr)
    return { ok: false, error: loyaltyFetchErr.message }
  }
  if (!loyaltyRow) {
    return { ok: true, skipped: 'no_loyalty_account' }
  }

  const newBalance = Math.max(0, (loyaltyRow.points_balance || 0) - actualDeduct)
  const newLifetime = Math.max(0, (loyaltyRow.lifetime_points || 0) - actualDeduct)
  const newTier = calculateTier(newLifetime) as 'bronze' | 'silver' | 'gold'

  const { data: insertedRows, error: txErr } = await supabase
    .from('loyalty_transactions')
    .insert({
      email: customerEmail,
      user_id: userId ?? loyaltyRow.user_id ?? null,
      type: 'adjusted',
      points: -actualDeduct,
      description: `Retour: ${actualDeduct} punten ingetrokken (terugbetaling €${refundAmount.toFixed(2)})`,
      order_id: orderId,
      return_id: returnId,
    })
    .select('id')

  if (txErr) {
    if (txErr.code === '23505') {
      return { ok: true, skipped: 'already_reversed_for_return' }
    }
    console.error('[reverseLoyaltyForReturn] insert tx:', txErr)
    return { ok: false, error: txErr.message }
  }

  const insertedId = insertedRows?.[0]?.id

  const { error: updateErr } = await supabase
    .from('loyalty_points')
    .update({
      points_balance: newBalance,
      lifetime_points: newLifetime,
      tier: newTier,
      user_id: userId ?? loyaltyRow.user_id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', loyaltyRow.id)

  if (updateErr) {
    console.error('[reverseLoyaltyForReturn] update balance:', updateErr)
    if (insertedId) {
      await supabase.from('loyalty_transactions').delete().eq('id', insertedId)
    }
    return { ok: false, error: updateErr.message }
  }

  return { ok: true, pointsDeducted: actualDeduct }
}
