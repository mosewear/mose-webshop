import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@supabase/supabase-js'

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
    // NO-STACKING DISCOUNT LOGIC (same as checkout API)
    // ============================================
    console.log('🔍 [VALIDATE-PROMO] Checking for existing discounts on items...')
    
    // Calculate subtotal of items WITHOUT discount (eligible for promo code)
    let subtotalEligibleForPromo = 0
    let subtotalWithExistingDiscount = 0
    
    if (items && items.length > 0) {
      for (const item of items) {
        // Fetch product to check if it has a sale_price
        const { data: product, error: productError } = await supabaseAdmin
          .from('products')
          .select('base_price, sale_price')
          .eq('id', item.product_id)
          .single()
        
        if (productError || !product) {
          console.error('❌ Product not found:', item.product_id)
          continue
        }
        
        const hasDiscount = product.sale_price && product.sale_price < product.base_price
        const itemTotal = item.quantity * item.unit_price
        
        if (hasDiscount) {
          subtotalWithExistingDiscount += itemTotal
          console.log(`  ❌ [VALIDATE-PROMO] "${item.product_name}" has discount - NOT eligible`)
        } else {
          subtotalEligibleForPromo += itemTotal
          console.log(`  ✅ [VALIDATE-PROMO] "${item.product_name}" no discount - eligible`)
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


