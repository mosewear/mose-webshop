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
    // STEP 2: VALIDATE PROMO CODE (SERVER-SIDE)
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
      if (promoCode.valid_until) {
        const expiryDate = new Date(promoCode.valid_until)
        if (expiryDate < new Date()) {
          console.error('❌ Promo code expired:', order.promo_code, 'Expired at:', promoCode.valid_until)
          return NextResponse.json(
            { 
              error: 'Kortingscode verlopen',
              details: `De kortingscode "${order.promo_code}" is verlopen op ${expiryDate.toLocaleDateString('nl-NL')}`
            },
            { status: 400 }
          )
        }
      }
      
      // Check if promo code has minimum order value
      if (promoCode.minimum_order_value && order.subtotal < promoCode.minimum_order_value) {
        console.error('❌ Order total below minimum:', order.subtotal, 'Required:', promoCode.minimum_order_value)
        return NextResponse.json(
          { 
            error: 'Minimaal bedrag niet bereikt',
            details: `Deze kortingscode vereist een minimaal bestelbedrag van €${promoCode.minimum_order_value.toFixed(2)}`
          },
          { status: 400 }
        )
      }
      
      // Check usage limit
      if (promoCode.max_uses && promoCode.times_used >= promoCode.max_uses) {
        console.error('❌ Promo code usage limit reached:', order.promo_code)
        return NextResponse.json(
          { 
            error: 'Kortingscode maximaal gebruikt',
            details: `De kortingscode "${order.promo_code}" is helaas al maximaal gebruikt`
          },
          { status: 400 }
        )
      }
      
      // Calculate discount (SERVER-SIDE - trusted source)
      if (promoCode.discount_type === 'percentage') {
        validatedDiscount = (order.subtotal * promoCode.discount_value) / 100
        // Cap at max_discount_amount if set
        if (promoCode.max_discount_amount) {
          validatedDiscount = Math.min(validatedDiscount, promoCode.max_discount_amount)
        }
      } else if (promoCode.discount_type === 'fixed') {
        validatedDiscount = promoCode.discount_value
      }
      
      // Ensure discount doesn't exceed subtotal
      validatedDiscount = Math.min(validatedDiscount, order.subtotal)
      
      console.log('✅ Promo code validated:', order.promo_code, 'Discount:', validatedDiscount)
      
      // Increment usage count (using RPC for atomic increment)
      await supabase.rpc('increment_promo_usage', { 
        promo_code_value: order.promo_code.toUpperCase() 
      })
    }
    
    // Override client-provided discount with server-validated discount
    order.discount_amount = validatedDiscount
    order.subtotal = order.subtotal - validatedDiscount
    order.total = order.subtotal + order.shipping_cost

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

    // Insert order items
    const orderItemsWithId = items.map((item: any) => ({
      ...item,
      order_id: orderData.id,
    }))

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

    return NextResponse.json({ order: orderData })
  } catch (error: any) {
    console.error('💥 SERVER CHECKOUT ERROR:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}



