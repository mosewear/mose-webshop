import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getProgressToNextTier } from '@/lib/loyalty'

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
        tier: 'bronze',
        progress,
      })
    }

    const progress = getProgressToNextTier(loyaltyRecord.lifetime_points || 0)

    return NextResponse.json({
      points_balance: loyaltyRecord.points_balance || 0,
      lifetime_points: loyaltyRecord.lifetime_points || 0,
      tier: loyaltyRecord.tier || 'bronze',
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
