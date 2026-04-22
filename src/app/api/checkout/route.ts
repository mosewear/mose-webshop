import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { evaluatePickupEligibility } from '@/lib/pickup-eligibility'
import { capitalizeName } from '@/lib/utils'
import { calculateQuantityDiscount, type QuantityDiscountTier } from '@/lib/quantity-discount'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { calculateTier, calculateTierDiscount, type LoyaltyTier } from '@/lib/loyalty'
import {
  findActiveGiftCardByCode,
  reserveGiftCardBalance,
  clampRedeemAmount,
  maskFromLast4,
} from '@/lib/gift-cards'

// Server-side checkout route using service_role to bypass RLS
export async function POST(request: Request) {
  try {
    const parseNumber = (value: unknown, fallback: number) => {
      if (typeof value === 'number' && Number.isFinite(value)) return value
      if (typeof value === 'string') {
        const parsed = parseFloat(value)
        if (!Number.isNaN(parsed)) return parsed
      }
      return fallback
    }

    const parseBoolean = (value: unknown, fallback: boolean) => {
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') {
        if (value === 'true') return true
        if (value === 'false') return false
      }
      return fallback
    }

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
      // Gift cards are digital: no stock to check, no variant required.
      if (item.is_gift_card) continue

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
      const regular = variant.stock_quantity ?? 0
      const presale = variant.presale_stock_quantity ?? 0
      const totalAvailable = regular + presale

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
    // STEP 1B: APPLY QUANTITY DISCOUNTS (STAFFELKORTING)
    // ============================================
    console.log('📊 Calculating quantity discounts...')

    // Group items by product_id and count total quantity per product.
    // Gift card lines are excluded: staffelkorting never applies to gift cards.
    const productQuantities: Record<string, { totalQty: number; itemIndices: number[] }> = {}
    for (let i = 0; i < items.length; i++) {
      if (items[i].is_gift_card) continue
      const pid = items[i].product_id
      if (!productQuantities[pid]) productQuantities[pid] = { totalQty: 0, itemIndices: [] }
      productQuantities[pid].totalQty += items[i].quantity
      productQuantities[pid].itemIndices.push(i)
    }

    const productIds = Object.keys(productQuantities)

    // Fetch quantity discount tiers for all products
    const { data: allTiers } = await supabase
      .from('product_quantity_discounts')
      .select('*')
      .in('product_id', productIds)
      .eq('is_active', true)

    // Fetch product sale_price info to check if staffelkorting is blocked
    const { data: productPrices } = await supabase
      .from('products')
      .select('id, base_price, sale_price')
      .in('id', productIds)

    const tiersByProduct: Record<string, QuantityDiscountTier[]> = {}
    if (allTiers) {
      for (const tier of allTiers) {
        if (!tiersByProduct[tier.product_id]) tiersByProduct[tier.product_id] = []
        tiersByProduct[tier.product_id].push(tier)
      }
    }

    const salePriceByProduct: Record<string, number | null> = {}
    if (productPrices) {
      for (const p of productPrices) {
        salePriceByProduct[p.id] = (p.sale_price && p.sale_price < p.base_price) ? p.sale_price : null
      }
    }

    let totalQuantityDiscount = 0

    for (const [productId, group] of Object.entries(productQuantities)) {
      const hasSalePrice = salePriceByProduct[productId] !== null && salePriceByProduct[productId] !== undefined
      const tiers = tiersByProduct[productId]

      if (hasSalePrice || !tiers || tiers.length === 0) {
        // No staffelkorting: set original_price = unit_price, discount = 0
        for (const idx of group.itemIndices) {
          items[idx].original_price = items[idx].unit_price
          items[idx].quantity_discount_amount = 0
        }
        continue
      }

      // Apply staffelkorting
      for (const idx of group.itemIndices) {
        const originalPrice = items[idx].unit_price
        const result = calculateQuantityDiscount(originalPrice, group.totalQty, tiers)

        items[idx].original_price = originalPrice
        items[idx].quantity_discount_amount = result.discountPerItem
        items[idx].unit_price = result.finalPrice
        items[idx].price_at_purchase = result.finalPrice
        items[idx].subtotal = result.finalPrice * items[idx].quantity

        totalQuantityDiscount += result.discountPerItem * items[idx].quantity

        if (result.discountPerItem > 0) {
          console.log(`  ✅ Staffelkorting: ${items[idx].product_name} - €${result.discountPerItem.toFixed(2)} per stuk (tier: ${result.tier?.min_quantity}+)`)
        }
      }
    }

    // Recalculate order subtotal after staffelkorting
    const recalcSubtotal = items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0)
    order.subtotal = Math.round(recalcSubtotal * 100) / 100

    if (totalQuantityDiscount > 0) {
      console.log(`✅ Total staffelkorting: -€${totalQuantityDiscount.toFixed(2)} | New subtotal: €${order.subtotal.toFixed(2)}`)
    } else {
      console.log('ℹ️ No quantity discounts applicable')
    }

    // ============================================
    // STEP 2: VALIDATE PROMO CODE (SERVER-SIDE) + NO STACKING DISCOUNTS
    // ============================================
    let validatedDiscount = 0
    
    if (order.promo_code) {
      console.log('🎟️ Validating promo code:', order.promo_code)

      if (totalQuantityDiscount > 0.005) {
        console.error('❌ Promo blocked: staffelkorting is actief op deze bestelling')
        return NextResponse.json(
          {
            error: 'Kortingscode niet combineerbaar',
            details:
              'Deze kortingscode is niet combineerbaar met staffelkorting. Pas het aantal stuks per product aan of verwijder de kortingscode.',
          },
          { status: 400 }
        )
      }

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
        // Gift cards are excluded from promo-code eligibility and not
        // counted as "has existing discount" either — the code simply
        // doesn't apply to them.
        if (item.is_gift_card) {
          continue
        }

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

    // Read shipping + pickup settings
    const { data: settingsRows } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'shipping_cost',
        'free_shipping_threshold',
        'pickup_enabled',
        'pickup_max_distance_km',
        'pickup_location_name',
        'pickup_location_address',
      ])

    const settings: Record<string, unknown> = {}
    for (const row of settingsRows || []) settings[row.key] = row.value

    const baseShippingCost = parseNumber(settings.shipping_cost, 0)
    const freeShippingThreshold = parseNumber(settings.free_shipping_threshold, 100)
    const pickupEnabled = parseBoolean(settings.pickup_enabled, true)
    const pickupMaxDistance = parseNumber(settings.pickup_max_distance_km, 50)
    const pickupLocationName =
      typeof settings.pickup_location_name === 'string' && settings.pickup_location_name.trim()
        ? settings.pickup_location_name
        : 'MOSE Groningen'
    const pickupLocationAddress =
      typeof settings.pickup_location_address === 'string' && settings.pickup_location_address.trim()
        ? settings.pickup_location_address
        : 'Stavangerweg 13, 9723 JC Groningen'

    // ============================================
    // STEP 2B: LOYALTY TIER DISCOUNT (auth-verified)
    // ============================================
    // Only apply tier discount when the authenticated user's email matches
    // the order email. Prevents guests from using another customer's tier.
    let loyaltyTierDiscount = 0
    let loyaltyTierApplied: LoyaltyTier = 'bronze'
    try {
      const authClient = await createServerSupabaseClient()
      const { data: { user: authUser } } = await authClient.auth.getUser()
      if (authUser?.email && authUser.email.toLowerCase() === String(order.email || '').toLowerCase()) {
        const { data: loyaltyRecord } = await supabase
          .from('loyalty_points')
          .select('tier, lifetime_points')
          .eq('email', authUser.email)
          .maybeSingle()
        if (loyaltyRecord) {
          const tier: LoyaltyTier = (loyaltyRecord.tier as LoyaltyTier | null)
            || calculateTier(loyaltyRecord.lifetime_points || 0)
          const eligible = Math.max(0, order.subtotal)
          loyaltyTierDiscount = calculateTierDiscount(tier, eligible)
          loyaltyTierApplied = tier
        }
      }
    } catch (err) {
      console.error('⚠️ Loyalty tier discount lookup failed (non-fatal):', err)
    }
    order.loyalty_tier_discount = loyaltyTierDiscount
    if (loyaltyTierDiscount > 0) {
      console.log(`✅ Loyalty tier discount applied: ${loyaltyTierApplied} -€${loyaltyTierDiscount.toFixed(2)}`)
    }

    const subtotalAfterDiscount = order.subtotal - validatedDiscount - loyaltyTierDiscount
    let finalDeliveryMethod: 'shipping' | 'pickup' = order.delivery_method === 'pickup' ? 'pickup' : 'shipping'
    let pickupEligible = false
    let pickupDistanceKm: number | null = null

    if (finalDeliveryMethod === 'pickup') {
      if (!pickupEnabled) {
        finalDeliveryMethod = 'shipping'
      } else {
        const shippingAddress = order.shipping_address || {}
        const pickupResult = await evaluatePickupEligibility({
          country: shippingAddress.country || 'NL',
          postalCode: shippingAddress.postalCode || '',
          houseNumber: shippingAddress.houseNumber || '',
          addition: shippingAddress.addition || '',
        })

        pickupEligible = pickupResult.eligible
        pickupDistanceKm = pickupResult.distanceKm

        if (pickupResult.distanceKm !== null && pickupResult.distanceKm > pickupMaxDistance) {
          finalDeliveryMethod = 'shipping'
          pickupEligible = false
        } else if (!pickupResult.eligible) {
          finalDeliveryMethod = 'shipping'
        }
      }
    }

    // Digital-only order (all gift cards) → no shipping needed.
    const isDigitalOnly =
      items.length > 0 && items.every((it: any) => !!it.is_gift_card)
    if (isDigitalOnly) {
      finalDeliveryMethod = 'shipping' // keep type consistent but skip cost
      pickupEligible = false
      pickupDistanceKm = null
    }

    order.delivery_method = finalDeliveryMethod
    order.pickup_eligible = pickupEligible
    order.pickup_distance_km = pickupDistanceKm
    order.pickup_location_name = finalDeliveryMethod === 'pickup' ? pickupLocationName : null
    order.pickup_location_address = finalDeliveryMethod === 'pickup' ? pickupLocationAddress : null
    order.is_digital_only = isDigitalOnly
    order.shipping_cost = isDigitalOnly
      ? 0
      : finalDeliveryMethod === 'pickup'
        ? 0
        : subtotalAfterDiscount >= freeShippingThreshold
          ? 0
          : baseShippingCost
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
    
    const shippingName = order.shipping_address?.name || ''
    const capitalizedName = capitalizeName(shippingName)
    const nameParts = capitalizedName.split(' ')
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
    // IMPORTANT: Whitelist columns that actually exist in `order_items` so that
    // extra frontend-only fields (unit_price, is_presale, presale_expected_date, …)
    // don't break the insert under PostgREST's strict schema cache (PGRST204).
    const orderItemsWithId = items.map((item: any) => {
      const priceAtPurchase =
        typeof item.price_at_purchase === 'number'
          ? item.price_at_purchase
          : typeof item.unit_price === 'number'
          ? item.unit_price
          : 0
      const quantity = typeof item.quantity === 'number' ? item.quantity : 0
      const subtotal =
        typeof item.subtotal === 'number'
          ? item.subtotal
          : Math.round(priceAtPurchase * quantity * 100) / 100

      return {
        order_id: orderData.id,
        product_id: item.product_id ?? null,
        // Gift card lines don't reference a real variant row.
        variant_id: item.is_gift_card ? null : item.variant_id ?? null,
        product_name: item.product_name,
        size: item.size,
        color: item.color,
        sku: item.sku,
        quantity,
        price_at_purchase: priceAtPurchase,
        subtotal,
        image_url: item.image_url ?? null,
        original_price:
          typeof item.original_price === 'number'
            ? item.original_price
            : priceAtPurchase,
        quantity_discount_amount:
          typeof item.quantity_discount_amount === 'number'
            ? item.quantity_discount_amount
            : 0,
        is_gift_card: !!item.is_gift_card,
        gift_card_metadata: item.is_gift_card
          ? item.gift_card_metadata ?? { amount: priceAtPurchase }
          : null,
      }
    })

    console.log('═════════════════════════════════════════')
    console.log('📦 SERVER - ORDER ITEMS TO INSERT:')
    console.log('═════════════════════════════════════════')
    orderItemsWithId.forEach((item: any, index: number) => {
      console.log(`Item ${index + 1}:`, {
        product_name: item.product_name,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase,
        subtotal: item.subtotal,
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
    // STEP 5: APPLY GIFT CARD REDEMPTIONS (atomic reservation)
    // ============================================
    // Gift cards reduce the final payable amount AFTER all other
    // discounts/shipping. Each code is reserved on its row via the
    // `reserve_gift_card_balance` RPC, so concurrent checkouts can't
    // double-spend. On successful payment the webhook calls
    // `commit_gift_card_redemptions_for_order`; on failure/refund we
    // call `reverse_gift_card_redemptions_for_order`.
    const requestedCodes: string[] = Array.isArray(order.gift_card_codes)
      ? order.gift_card_codes.map((c: unknown) => String(c || '').trim()).filter(Boolean)
      : []

    let giftCardDiscount = 0
    const appliedMasks: string[] = []

    if (requestedCodes.length > 0) {
      const orderTotalBeforeGiftCards = Number(order.total) || 0
      let remaining = orderTotalBeforeGiftCards

      for (const code of requestedCodes) {
        if (remaining <= 0) break

        const lookup = await findActiveGiftCardByCode(supabase as any, code)
        if (!lookup.ok) {
          console.warn('[checkout] gift card lookup failed', {
            code_last4: code.slice(-4),
            reason: lookup.reason,
          })
          continue
        }

        const card = lookup.card
        const redeem = clampRedeemAmount(Number(card.balance), remaining)
        if (redeem <= 0) continue

        const reservation = await reserveGiftCardBalance(supabase as any, {
          cardId: card.id,
          orderId: orderData.id,
          amount: redeem,
        })

        if (!reservation.ok) {
          console.warn('[checkout] gift card reserve failed', reservation.error)
          continue
        }

        giftCardDiscount = Math.round((giftCardDiscount + redeem) * 100) / 100
        remaining = Math.round((remaining - redeem) * 100) / 100
        appliedMasks.push(maskFromLast4(card.code_last4))
      }

      const newTotal = Math.max(
        0,
        Math.round(((Number(order.total) || 0) - giftCardDiscount) * 100) / 100
      )

      const { data: patched } = await supabase
        .from('orders')
        .update({
          gift_card_discount: giftCardDiscount,
          gift_card_codes: appliedMasks,
          total: newTotal,
          // Zero-payment path: when gift cards cover the whole order
          // there is nothing left for Stripe. Mark it paid immediately so
          // the webhook idempotency path takes over issuing + stock.
          payment_status: newTotal === 0 ? 'paid' : order.payment_status,
          paid_at: newTotal === 0 ? new Date().toISOString() : null,
        })
        .eq('id', orderData.id)
        .select()
        .single()

      if (patched) {
        Object.assign(orderData, patched)
      }

      // If this order is now fully covered, kick off stock + gift-card
      // issuance synchronously so the confirmation page has everything it
      // needs without relying on a Stripe webhook.
      if (newTotal === 0) {
        try {
          const { applyInventoryDecrementForPaidOrder } = await import('@/lib/order-stock')
          await applyInventoryDecrementForPaidOrder(supabase as any, orderData.id)
        } catch (e) {
          console.error('[checkout] zero-payment inventory error:', e)
        }
        try {
          const { processGiftCardsForPaidOrder } = await import('@/lib/gift-card-processing')
          await processGiftCardsForPaidOrder(
            supabase as any,
            orderData.id,
            (order as any).locale || 'nl'
          )
        } catch (e) {
          console.error('[checkout] zero-payment gift card issuance error:', e)
        }
      }
    }

    // ============================================
    // STEP 6: UPDATE CUSTOMER STATS (will be updated again after payment)
    // ============================================
    // Note: This will be called again by webhook after successful payment
    // to ensure accurate paid order counts
    if (orderData.payment_status === 'paid') {
      console.log('💰 Updating customer stats for:', order.email)
      await supabase.rpc('update_customer_stats', {
        p_email: order.email,
        p_order_total: orderData.total,
        p_order_date: orderData.created_at
      })
      console.log('✅ Customer stats updated')
    }

    return NextResponse.json({ order: orderData })
  } catch (error: any) {
    console.error('💥 SERVER CHECKOUT ERROR:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}



