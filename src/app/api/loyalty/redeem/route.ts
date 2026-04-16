import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { LOYALTY_CONFIG, calculateRedemptionValue } from '@/lib/loyalty'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    const body = await req.json()
    const rawPoints = body.points

    const points = typeof rawPoints === 'string' ? Number(rawPoints) : rawPoints

    if (!points || typeof points !== 'number' || !Number.isFinite(points) || points < LOYALTY_CONFIG.redemptionMinPoints) {
      return NextResponse.json(
        { error: `Minimaal ${LOYALTY_CONFIG.redemptionMinPoints} punten vereist` },
        { status: 400 }
      )
    }

    const redeemPoints = Math.floor(points / LOYALTY_CONFIG.redemptionMinPoints) * LOYALTY_CONFIG.redemptionMinPoints

    const serviceClient = createServiceRoleClient()

    const { data: loyaltyRecord } = await serviceClient
      .from('loyalty_points')
      .select('id, points_balance')
      .eq('email', user.email)
      .single()

    if (!loyaltyRecord || loyaltyRecord.points_balance < redeemPoints) {
      return NextResponse.json(
        { error: 'Niet genoeg punten' },
        { status: 400 }
      )
    }

    const discountValue = calculateRedemptionValue(redeemPoints)

    // Step 1: Update balance first with a conditional check (balance must still be sufficient)
    const { error: updateError, data: updatedRecord } = await serviceClient
      .from('loyalty_points')
      .update({
        points_balance: loyaltyRecord.points_balance - redeemPoints,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loyaltyRecord.id)
      .gte('points_balance', redeemPoints)
      .select('points_balance')
      .single()

    if (updateError || !updatedRecord) {
      return NextResponse.json(
        { error: 'Niet genoeg punten of balans is ondertussen gewijzigd' },
        { status: 409 }
      )
    }

    // Step 2: Insert the transaction record
    const { error: insertError } = await serviceClient
      .from('loyalty_transactions')
      .insert({
        email: user.email,
        user_id: user.id,
        type: 'redeemed',
        points: -redeemPoints,
        description: `${redeemPoints} punten ingewisseld voor €${discountValue.toFixed(2)} korting`,
      })

    if (insertError) {
      // Roll back the balance update
      await serviceClient
        .from('loyalty_points')
        .update({
          points_balance: updatedRecord.points_balance + redeemPoints,
          updated_at: new Date().toISOString(),
        })
        .eq('id', loyaltyRecord.id)

      return NextResponse.json(
        { error: 'Er ging iets mis bij het inwisselen' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      points_redeemed: redeemPoints,
      discount_value: discountValue,
      remaining_balance: updatedRecord.points_balance,
    })
  } catch (error: unknown) {
    console.error('Loyalty redeem error:', error)
    return NextResponse.json(
      { error: 'Er ging iets mis bij het inwisselen' },
      { status: 500 }
    )
  }
}
