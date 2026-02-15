import { NextRequest, NextResponse } from 'next/server'
import { evaluatePickupEligibility } from '@/lib/pickup-eligibility'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const country = (body.country || '').toUpperCase()
    const postalCode = body.postalCode || ''
    const houseNumber = body.houseNumber || ''
    const addition = body.addition || ''

    if (!country || !postalCode || !houseNumber) {
      return NextResponse.json(
        { error: 'country, postalCode and houseNumber are required' },
        { status: 400 }
      )
    }

    const result = await evaluatePickupEligibility({
      country,
      postalCode,
      houseNumber,
      addition,
    })

    return NextResponse.json({
      eligible: result.eligible,
      distanceKm: result.distanceKm,
      reason: result.reason,
      pickupConfig: {
        enabled: result.config.enabled,
        maxDistanceKm: result.config.maxDistanceKm,
        locationName: result.config.locationName,
        locationAddress: result.config.locationAddress,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to evaluate pickup eligibility' },
      { status: 500 }
    )
  }
}

