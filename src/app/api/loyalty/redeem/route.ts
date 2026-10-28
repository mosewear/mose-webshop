import { atomicLoyaltyEnabled, atomicLegacyLoyalty } from '@/lib/atomic-legacy-loyalty'
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

    if (atomicLoyaltyEnabled()) {
      if (typeof body.operationId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.operationId)) {
        return NextResponse.json({ error: 'Vernieuw de checkout en probeer opnieuw' }, { status: 400 })
      }
      try {
        const result = await atomicLegacyLoyalty(serviceClient, { kind: 'redeem',
          key: `legacy:redeem:${user.id}:${body.operationId}`, email: user.email,
          userId: user.id, points: redeemPoints })
        return NextResponse.json(result)
      } catch (error) {
        const message = error instanceof Error ? error.message : ''
        const insufficient = /INSUFFICIENT|ACCOUNT_NOT_FOUND/.test(message)
        return NextResponse.json({ error: insufficient ? 'Niet genoeg punten' : 'Inwisselen kon niet worden afgerond; probeer dezelfde aanvraag opnieuw' }, { status: insufficient ? 409 : 503 })
      }
    }

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
