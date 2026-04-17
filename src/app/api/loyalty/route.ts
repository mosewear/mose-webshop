import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { calculateTier, getProgressToNextTier, getTierDiscountPercent, type LoyaltyTier } from '@/lib/loyalty'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    const serviceClient = createServiceRoleClient()

    const { data: loyaltyRecord } = await serviceClient
      .from('loyalty_points')
      .select('*')
      .eq('email', user.email)
      .single()

    if (!loyaltyRecord) {
      const progress = getProgressToNextTier(0)
      return NextResponse.json({
        points_balance: 0,
        lifetime_points: 0,
        tier: 'bronze' as LoyaltyTier,
        discount_percent: getTierDiscountPercent('bronze'),
        progress,
      })
    }

    const lifetimePoints = loyaltyRecord.lifetime_points || 0
    // Trust stored tier but fall back to deterministic recompute so we never
    // return a stale tier if the thresholds ever change.
    const tier: LoyaltyTier = (loyaltyRecord.tier as LoyaltyTier | null) || calculateTier(lifetimePoints)
    const progress = getProgressToNextTier(lifetimePoints)

    return NextResponse.json({
      points_balance: loyaltyRecord.points_balance || 0,
      lifetime_points: lifetimePoints,
      tier,
      discount_percent: getTierDiscountPercent(tier),
      progress,
    })
  } catch (error: any) {
    console.error('Loyalty GET error:', error)
    return NextResponse.json(
      { error: 'Er ging iets mis' },
      { status: 500 }
    )
  }
}
