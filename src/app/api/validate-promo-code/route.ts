import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@supabase/supabase-js'
import {
  computeActiveStaffelSavingsEuros,
  normalizePromoCartLine,
} from '@/lib/promo-staffel-eligibility'
import {
  computePromoEligibility,
  type PromoEligibilityLine,
} from '@/lib/promo-code-eligibility'

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

    // Build promo-eligibility line items by joining cart lines with the
    // products table (need base_price + sale_price to detect "on sale").
    const eligibilityLines: PromoEligibilityLine[] = []

    if (Array.isArray(items) && items.length > 0) {
      // Fetch all referenced products in one round-trip rather than
      // hitting Supabase per line (used to be N queries; small perf
      // win but more importantly makes the rate-limiter happy).
      const productIds = Array.from(
        new Set(
          items
            .map((it) => normalizePromoCartLine(it)?.cartLine.productId)
            .filter((id): id is string => !!id),
        ),
      )

      const { data: productRows } = productIds.length
        ? await supabaseAdmin
            .from('products')
            .select('id, base_price, sale_price')
            .in('id', productIds)
        : { data: [] as Array<{ id: string; base_price: number | null; sale_price: number | null }> }

      const productMap = new Map<string, { base_price: number | null; sale_price: number | null }>()
      for (const p of productRows ?? []) {
        productMap.set(p.id, { base_price: p.base_price, sale_price: p.sale_price })
      }

      for (const item of items) {
        const norm = normalizePromoCartLine(item)
        if (!norm) {
          // Gift cards / malformed lines: skip — the helper will treat
          // missing lines as zero contribution to eligibleSubtotal.
          continue
        }
        const productInfo = productMap.get(norm.cartLine.productId)
        if (!productInfo) {
          console.error('❌ [VALIDATE-PROMO] Product not found:', norm.cartLine.productId)
          continue
        }
        eligibilityLines.push({
          productId: norm.cartLine.productId,
          productName: norm.cartLine.name,
          unitPrice: norm.cartLine.price,
          quantity: norm.cartLine.quantity,
          basePrice: productInfo.base_price,
          salePrice: productInfo.sale_price,
        })
      }
    }

    if (eligibilityLines.length === 0) {
      // Backward-compatible fallback: no item list (older client) →
      // treat orderTotal as a single eligible "bucket" not on sale.
      // This keeps existing flows working at the cost of skipping the
      // sale-vs-promo check; mitigated server-side at /api/checkout.
      eligibilityLines.push({
        productId: '__legacy__',
        unitPrice: Number(orderTotal) || 0,
        quantity: 1,
        basePrice: Number(orderTotal) || 0,
        salePrice: null,
      })
    }

    const eligibility = computePromoEligibility(
      {
        code: promoCode.code,
        discount_type: promoCode.discount_type,
        discount_value: Number(promoCode.discount_value),
        min_order_value: promoCode.min_order_value != null ? Number(promoCode.min_order_value) : null,
        applies_to_sale_items: !!promoCode.applies_to_sale_items,
      },
      eligibilityLines,
    )

    if (!eligibility.eligible) {
      return NextResponse.json(
        { valid: false, error: eligibility.errorMessage ?? 'Kortingscode niet bruikbaar' },
        { status: 200 },
      )
    }

    console.log(
      '✅ [VALIDATE-PROMO] Valid! Discount:',
      eligibility.discountAmount,
      'sale-stacking:',
      promoCode.applies_to_sale_items ? 'on' : 'off',
    )

    return NextResponse.json({
      valid: true,
      code: promoCode.code,
      discountAmount: eligibility.discountAmount,
      discountType: promoCode.discount_type,
      discountValue: promoCode.discount_value,
      description: promoCode.description,
      applies_to_sale_items: !!promoCode.applies_to_sale_items,
    })
  } catch (error: any) {
    console.error('Error validating promo code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


