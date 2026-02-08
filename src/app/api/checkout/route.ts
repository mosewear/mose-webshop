import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Server-side checkout route using service_role to bypass RLS
export async function POST(request: Request) {
  try {
    const { order, items } = await request.json()

    console.log('🔥 SERVER CHECKOUT - Order:', order)
    console.log('🔥 SERVER CHECKOUT - Items:', items)

    // Create Supabase client with service_role key (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    // ============================================
    // STEP 1: VALIDATE STOCK AVAILABILITY (DUAL INVENTORY)
    // ============================================
    console.log('📦 Validating stock for', items.length, 'items...')
    
    for (const item of items) {
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select('stock_quantity, presale_stock_quantity, presale_enabled, is_available')
        .eq('id', item.variant_id)
        .single()

      if (variantError || !variant) {
        console.error('❌ Variant not found:', item.variant_id)
        return NextResponse.json(
          { 
            error: 'Product niet gevonden', 
            details: `${item.product_name} is niet beschikbaar`
          },
          { status: 400 }
        )
      }

      // Check if variant is available
      if (!variant.is_available) {
        console.error('❌ Variant not available:', item.product_name)
        return NextResponse.json(
          { 
            error: 'Product niet beschikbaar',
            details: `${item.product_name} (${item.size} - ${item.color}) is niet meer beschikbaar`
          },
          { status: 400 }
        )
      }

      // DUAL INVENTORY CHECK: Check total available stock (regular + presale)
      const totalAvailable = variant.stock_quantity + variant.presale_stock_quantity
      
      if (totalAvailable < item.quantity) {
        console.error('❌ Insufficient total stock:', item.product_name, 'Available:', totalAvailable, 'Requested:', item.quantity)
        return NextResponse.json(
          { 
            error: 'Onvoldoende voorraad',
            details: `Sorry, ${item.product_name} (${item.size} - ${item.color}) heeft nog maar ${totalAvailable} op voorraad`
          },
          { status: 400 }
        )
      }
    }

    console.log('✅ Stock validation passed for all items (including presale)')

    // ============================================
    // STEP 2: VALIDATE PROMO CODE (SERVER-SIDE) + NO STACKING DISCOUNTS
    // ============================================
    let validatedDiscount = 0
    
    if (order.promo_code) {
      console.log('🎟️ Validating promo code:', order.promo_code)
      
      const { data: promoCode, error: promoError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', order.promo_code.toUpperCase())
        .single()
      
      if (promoError || !promoCode) {
        console.error('❌ Promo code not found:', order.promo_code)
        return NextResponse.json(
          { 
            error: 'Ongeldige kortingscode',
            details: `De kortingscode "${order.promo_code}" bestaat niet`
          },
          { status: 400 }
        )
      }
      
      // Check if promo code is active
      if (!promoCode.is_active) {
        console.error('❌ Promo code inactive:', order.promo_code)
        return NextResponse.json(
          { 
            error: 'Kortingscode niet actief',
            details: `De kortingscode "${order.promo_code}" is niet meer geldig`
          },
          { status: 400 }
        )
      }
      
      // Check if promo code is expired
      if (promoCode.expires_at) {
        const expiryDate = new Date(promoCode.expires_at)
        if (expiryDate < new Date()) {
          console.error('❌ Promo code expired:', order.promo_code, 'Expired at:', promoCode.expires_at)
          return NextResponse.json(
            { 
              error: 'Kortingscode verlopen',
              details: `De kortingscode "${order.promo_code}" is verlopen op ${expiryDate.toLocaleDateString('nl-NL')}`
            },
            { status: 400 }
          )
        }
      }
      
      // ============================================
      // NO-STACKING DISCOUNT LOGIC
      // ============================================
      console.log('🔍 Checking for existing discounts on items...')
      
      // Calculate subtotal of items WITHOUT discount (eligible for promo code)
      let subtotalEligibleForPromo = 0
      let subtotalWithExistingDiscount = 0
      
      for (const item of items) {
        // Fetch product to check if it has a sale_price
        const { data: product, error: productError } = await supabase
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
          console.log(`  ❌ Item "${item.product_name}" already has discount (${product.base_price} → ${product.sale_price}) - NOT eligible for promo`)
        } else {
          subtotalEligibleForPromo += itemTotal
          console.log(`  ✅ Item "${item.product_name}" has no discount - eligible for promo`)
        }
      }
      
      console.log('📊 Subtotal eligible for promo:', subtotalEligibleForPromo)
      console.log('📊 Subtotal with existing discount:', subtotalWithExistingDiscount)
      
      // If ALL items already have discount, promo code cannot be applied
      if (subtotalEligibleForPromo === 0) {
        console.error('❌ All items already have discount - promo code cannot be applied')
        return NextResponse.json(
          { 
            error: 'Korting op korting niet mogelijk',
            details: 'Deze kortingscode kan niet worden toegepast omdat alle items in je winkelwagen al korting hebben. Kortingscodes werken alleen op producten zonder bestaande korting.'
          },
          { status: 400 }
        )
      }
      
      // Check if promo code has minimum order value (only count eligible items)
      if (promoCode.min_order_value && subtotalEligibleForPromo < promoCode.min_order_value) {
        console.error('❌ Eligible items total below minimum:', subtotalEligibleForPromo, 'Required:', promoCode.min_order_value)
        return NextResponse.json(
          { 
            error: 'Minimaal bedrag niet bereikt',
            details: `Deze kortingscode vereist een minimaal bestelbedrag van €${promoCode.min_order_value.toFixed(2)} aan producten zonder bestaande korting. Je hebt momenteel €${subtotalEligibleForPromo.toFixed(2)} aan items zonder korting.`
          },
          { status: 400 }
        )
      }
      
      // Check usage limit
      if (promoCode.usage_limit && promoCode.usage_count >= promoCode.usage_limit) {
        console.error('❌ Promo code usage limit reached:', order.promo_code)
        return NextResponse.json(
          { 
            error: 'Kortingscode maximaal gebruikt',
            details: `De kortingscode "${order.promo_code}" is helaas al maximaal gebruikt`
          },
          { status: 400 }
        )
      }
      
      // Calculate discount ONLY on eligible items (SERVER-SIDE - trusted source)
      if (promoCode.discount_type === 'percentage') {
        validatedDiscount = (subtotalEligibleForPromo * promoCode.discount_value) / 100
      } else if (promoCode.discount_type === 'fixed') {
        validatedDiscount = Math.min(promoCode.discount_value, subtotalEligibleForPromo)
      }
      
      // Ensure discount doesn't exceed eligible subtotal
      validatedDiscount = Math.min(validatedDiscount, subtotalEligibleForPromo)
      
      console.log('✅ Promo code validated:', order.promo_code)
      console.log('✅ Discount calculated:', validatedDiscount, '(only on items without existing discount)')
    }
    
    // Override client-provided discount with server-validated discount
    order.discount_amount = validatedDiscount
    // Calculate total: (subtotal - discount) + shipping
    // IMPORTANT: Keep order.subtotal as the original subtotal (before discount)
    const subtotalAfterDiscount = order.subtotal - validatedDiscount
    order.total = subtotalAfterDiscount + order.shipping_cost

    // ============================================
    // STEP 3: CHECK FOR DUPLICATE ORDERS (Idempotency)
    // ============================================
    console.log('🔍 Checking for duplicate orders...')
    
    const { data: recentOrders, error: dupeError } = await supabase
      .from('orders')
      .select('id, created_at')
      .eq('email', order.email)
      .eq('total', order.total)
      .eq('payment_status', 'pending')
      .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last 1 minute
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (!dupeError && recentOrders && recentOrders.length > 0) {
      const existingOrder = recentOrders[0]
      const timeSinceCreation = Date.now() - new Date(existingOrder.created_at).getTime()
      
      console.log('⚠️ Duplicate order detected:', existingOrder.id)
      console.log('   Time since creation:', timeSinceCreation, 'ms')
      
      // Return existing order instead of creating duplicate
      return NextResponse.json({ 
        order: existingOrder,
        duplicate_prevented: true,
        message: 'Order already exists'
      })
    }
    
    console.log('✅ No duplicate orders found')

    // ============================================
    // STEP 4: UPSERT CUSTOMER PROFILE
    // ============================================
    console.log('👤 Upserting customer profile for:', order.email)
    
    // Extract name from shipping address
    const shippingName = order.shipping_address?.name || ''
    const nameParts = shippingName.trim().split(' ')
    const firstName = nameParts[0] || null
    const lastName = nameParts.slice(1).join(' ') || null
    const phone = order.shipping_address?.phone || null
    
    const { data: profileId, error: profileError } = await supabase
      .rpc('upsert_customer_profile', {
        p_email: order.email,
        p_first_name: firstName,
        p_last_name: lastName,
        p_phone: phone
      })
    
    if (profileError) {
      console.error('⚠️ Customer profile upsert failed:', profileError)
      // Don't fail the order, just log the error
    } else {
      console.log('✅ Customer profile upserted:', profileId)
    }

    // Insert order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([order])
      .select()
      .single()

    if (orderError) {
      console.error('❌ SERVER: Order creation error:', orderError)
      return NextResponse.json(
        { error: 'Failed to create order', details: orderError },
        { status: 500 }
      )
    }

    console.log('✅ SERVER: Order created:', orderData)

    // Track promo code usage (if applicable)
    if (order.promo_code && validatedDiscount > 0) {
      console.log('🎟️ Tracking promo code usage:', order.promo_code)
      await supabase.rpc('track_promo_usage', {
        promo_code_value: order.promo_code.toUpperCase(),
        order_id_value: orderData.id,
        discount_amount_value: validatedDiscount,
        order_total_value: order.total,
        user_id_value: null // We don't have authenticated users yet
      })
      console.log('✅ Promo code usage tracked')
    }

    // Insert order items
    const orderItemsWithId = items.map((item: any) => ({
      ...item,
      order_id: orderData.id,
    }))

    console.log('═════════════════════════════════════════')
    console.log('📦 SERVER - ORDER ITEMS TO INSERT:')
    console.log('═════════════════════════════════════════')
    orderItemsWithId.forEach((item: any, index: number) => {
      console.log(`Item ${index + 1}:`, {
        product_name: item.product_name,
        variant_id: item.variant_id,
        quantity: item.quantity,
        is_presale: item.is_presale,
        presale_expected_date: item.presale_expected_date,
      })
    })
    console.log('═════════════════════════════════════════')

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsWithId)

    if (itemsError) {
      console.error('❌ SERVER: Order items error:', itemsError)
      // Rollback: delete the order
      await supabase.from('orders').delete().eq('id', orderData.id)
      return NextResponse.json(
        { error: 'Failed to create order items', details: itemsError },
        { status: 500 }
      )
    }

    console.log('✅ SERVER: Order items created')

    // ============================================
    // STEP 5: UPDATE CUSTOMER STATS (will be updated again after payment)
    // ============================================
    // Note: This will be called again by webhook after successful payment
    // to ensure accurate paid order counts
    if (order.payment_status === 'paid') {
      console.log('💰 Updating customer stats for:', order.email)
      await supabase.rpc('update_customer_stats', {
        p_email: order.email,
        p_order_total: order.total,
        p_order_date: orderData.created_at
      })
      console.log('✅ Customer stats updated')
    }

    return NextResponse.json({ order: orderData })
  } catch (error: any) {
    console.error('💥 SERVER CHECKOUT ERROR:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}



