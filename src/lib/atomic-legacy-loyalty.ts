import type { SupabaseClient } from '@supabase/supabase-js'

/** Activate only after additive migration and all legacy writers are deployed. */
export const atomicLoyaltyEnabled = () => process.env.LOYALTY_ATOMIC_ENABLED === 'true'

export interface AtomicLoyaltyResult {
  success: boolean
  duplicate?: boolean
  pending?: boolean
  points_awarded?: number
  points_deducted?: number
  new_balance?: number
  lifetime_points?: number
  old_tier?: 'bronze' | 'silver' | 'gold'
  new_tier?: 'bronze' | 'silver' | 'gold'
  points_redeemed?: number
  discount_value?: number
  remaining_balance?: number
}

export async function atomicLegacyLoyalty(client: SupabaseClient, args: {
  kind: 'earn' | 'refund' | 'redeem' | 'admin'; key: string; email: string; userId: string | null
  points?: number; orderId?: string; returnId?: string; amount?: number; reason?: string; accountId?: string
}): Promise<AtomicLoyaltyResult> {
  const { data, error } = await client.rpc('atomic_legacy_loyalty', {
    p_kind: args.kind, p_key: args.key, p_email: args.email, p_user: args.userId,
    p_points: args.points ?? null, p_order: args.orderId ?? null, p_return: args.returnId ?? null,
    p_amount: args.amount ?? null, p_reason: args.reason ?? null, p_account: args.accountId ?? null,
  })
  if (error) throw new Error(error.message)
  if (!data || typeof data !== 'object' || typeof data.success !== 'boolean') throw new Error('LOYALTY_INVALID_RPC_RESULT')
  return data as AtomicLoyaltyResult
}
