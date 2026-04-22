import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@supabase/supabase-js'
import {
  computeActiveStaffelSavingsEuros,
  normalizePromoCartLine,
} from '@/lib/promo-staffel-eligibility'

const STAFFEL_PROMO_ERROR =
  'Deze kortingscode is niet combineerbaar met staffelkorting. Voeg minder stuks toe, of verwijder de staffelkorting door het aantal per product aan te passen.'

export async function POST(req: NextRequest) {
  try {
    const { code, orderTotal, items } = await req.json()

    if (!code || orderTotal === undefined) {
      return NextResponse.json(
        { error: 'Code and order total are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Create service role client for promo validation (bypass RLS)
    const supabaseAdmin = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    // Fetch promo code
    const { data: promoCode, error: promoError } = await supabaseAdmin
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

    // ============================================
    // NO-STACKING: staffel only when it actually reduces the price (qty tiers)
    // + sale price vs promo (same as checkout API)
    // ============================================
    console.log('🔍 [VALIDATE-PROMO] Checking for existing discounts on items...')

    if (Array.isArray(items) && items.length > 0) {
      const staffelSavings = await computeActiveStaffelSavingsEuros(supabaseAdmin, items)
      if (staffelSavings > 0.005) {
        console.log('❌ [VALIDATE-PROMO] Staffel active (€' + staffelSavings.toFixed(2) + ') — promo blocked')
        return NextResponse.json(
          { valid: false, error: STAFFEL_PROMO_ERROR },
          { status: 200 }
        )
      }
    }

    // Calculate subtotal of items WITHOUT sale discount (eligible for promo code)
    let subtotalEligibleForPromo = 0
    let subtotalWithExistingDiscount = 0

    if (items && items.length > 0) {
      for (const item of items) {
        const norm = normalizePromoCartLine(item)
        const productId = norm?.cartLine.productId
        if (!productId) {
          console.error('❌ [VALIDATE-PROMO] Bad line item:', item)
          continue
        }

        const { data: product, error: productError } = await supabaseAdmin
          .from('products')
          .select('base_price, sale_price')
          .eq('id', productId)
          .single()

        if (productError || !product) {
          console.error('❌ Product not found:', productId)
          continue
        }

        const hasDiscount = product.sale_price && product.sale_price < product.base_price
        const itemTotal = norm.cartLine.quantity * norm.cartLine.price

        if (hasDiscount) {
          subtotalWithExistingDiscount += itemTotal
          console.log(`  ❌ [VALIDATE-PROMO] "${norm.cartLine.name}" has sale - NOT eligible`)
        } else {
          subtotalEligibleForPromo += itemTotal
          console.log(`  ✅ [VALIDATE-PROMO] "${norm.cartLine.name}" no sale - eligible`)
        }
      }
      
      console.log('📊 [VALIDATE-PROMO] Eligible:', subtotalEligibleForPromo, 'With discount:', subtotalWithExistingDiscount)
      
      // If ALL items already have discount, promo code cannot be applied
      if (subtotalEligibleForPromo === 0) {
        return NextResponse.json(
          { 
            valid: false, 
            error: 'Korting op korting niet mogelijk. Deze kortingscode werkt alleen op producten zonder bestaande korting.' 
          },
          { status: 200 }
        )
      }
    } else {
      // Fallback if no items provided (backward compatibility)
      subtotalEligibleForPromo = orderTotal
    }

    // Check minimum order value (only count eligible items)
    if (subtotalEligibleForPromo < promoCode.min_order_value) {
      return NextResponse.json(
        {
          valid: false,
          error: `Minimale bestelwaarde: €${promoCode.min_order_value.toFixed(2)} (alleen items zonder korting tellen)`,
        },
        { status: 200 }
      )
    }

    // Calculate discount ONLY on eligible items
    let discountAmount = 0
    if (promoCode.discount_type === 'percentage') {
      discountAmount = (subtotalEligibleForPromo * promoCode.discount_value) / 100
    } else if (promoCode.discount_type === 'fixed') {
      discountAmount = Math.min(promoCode.discount_value, subtotalEligibleForPromo)
    }

    console.log('✅ [VALIDATE-PROMO] Valid! Discount:', discountAmount, '(on eligible items only)')

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


