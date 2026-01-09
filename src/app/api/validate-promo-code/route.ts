import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { code, orderTotal } = await req.json()

    if (!code || orderTotal === undefined) {
      return NextResponse.json(
        { error: 'Code and order total are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch promo code
    const { data: promoCode, error: promoError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (promoError || !promoCode) {
      return NextResponse.json(
        { valid: false, error: 'Code ongeldig' },
        { status: 200 }
      )
    }

    // Check if active
    if (!promoCode.is_active) {
      return NextResponse.json(
        { valid: false, error: 'Code is niet meer actief' },
        { status: 200 }
      )
    }

    // Check if expired
    if (promoCode.expires_at) {
      const expiryDate = new Date(promoCode.expires_at)
      if (expiryDate < new Date()) {
        return NextResponse.json(
          { valid: false, error: 'Code is verlopen' },
          { status: 200 }
        )
      }
    }

    // Check usage limit
    if (promoCode.usage_limit !== null && promoCode.usage_count >= promoCode.usage_limit) {
      return NextResponse.json(
        { valid: false, error: 'Code limiet bereikt' },
        { status: 200 }
      )
    }

    // Check minimum order value
    if (orderTotal < promoCode.min_order_value) {
      return NextResponse.json(
        {
          valid: false,
          error: `Minimale bestelwaarde: €${promoCode.min_order_value.toFixed(2)}`,
        },
        { status: 200 }
      )
    }

    // Calculate discount
    let discountAmount = 0
    if (promoCode.discount_type === 'percentage') {
      discountAmount = (orderTotal * promoCode.discount_value) / 100
    } else if (promoCode.discount_type === 'fixed') {
      discountAmount = Math.min(promoCode.discount_value, orderTotal)
    }

    // Return valid response
    return NextResponse.json({
      valid: true,
      code: promoCode.code,
      discountAmount: Number(discountAmount.toFixed(2)),
      discountType: promoCode.discount_type,
      discountValue: promoCode.discount_value,
      description: promoCode.description,
    })
  } catch (error: any) {
    console.error('Error validating promo code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


