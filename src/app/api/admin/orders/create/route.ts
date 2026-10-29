import { createHash, randomUUID } from 'node:crypto'
import { legacyCutoverFreezeResponse } from '@/lib/legacy-cutover-freeze'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { capitalizeName } from '@/lib/utils'
import { calculateQuantityDiscount, type QuantityDiscountTier } from '@/lib/quantity-discount'

export async function POST(request: Request) {
  try {
    const { authorized } = await requireAdmin()
    if (!authorized) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
    }

    const freezeResponse = await legacyCutoverFreezeResponse()
    if (freezeResponse) return freezeResponse

    const body = await request.json()
    const {
      email,
      shipping_address,
      billing_address,
      delivery_method,
      payment_status,
      payment_method,
      shipping_cost,
      internal_notes,
      items,
    } = body

    if (!email?.trim()) {
      return NextResponse.json({ error: 'E-mailadres is verplicht' }, { status: 400 })
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Voeg minimaal 1 product toe' }, { status: 400 })
    }
    if (!shipping_address?.name || !shipping_address?.address || !shipping_address?.city || !shipping_address?.postalCode) {
      return NextResponse.json({ error: 'Verzendadres is incompleet' }, { status: 400 })
    }

    for (const item of items) {
      if (!item.variant_id || !Number.isInteger(item.quantity) || item.quantity < 1 || !Number.isFinite(item.price_at_purchase) || item.price_at_purchase < 0) {
        return NextResponse.json(
          { error: `Ongeldig item: ${item.product_name || 'onbekend'}` },
          { status: 400 }
        )
      }
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    if (process.env.SHOPIFY_CHECKOUT_ENABLED === 'true') {
      return NextResponse.json({ error: 'Maak nieuwe bestellingen in Shopify aan; de voorraad wordt daar beheerd.' }, { status: 409 })
    }
    if (process.env.LEGACY_INVENTORY_ATOMIC_ENABLED === 'true') {
      const ownership = await supabase.from('shopify_stock_ownership').select('variant_id').in('variant_id', items.map((item: { variant_id: string }) => item.variant_id)).limit(1)
      if (ownership.error) return NextResponse.json({ error: 'Voorraadbeheer kan nu niet worden gecontroleerd.' }, { status: 503 })
      if (ownership.data.length) return NextResponse.json({ error: 'Dit artikel wordt in Shopify beheerd. Maak de bestelling daar aan.' }, { status: 409 })
    }

    const atomic = process.env.LEGACY_INVENTORY_ATOMIC_ENABLED === 'true'
    const operationId = body.operationId
    const intent = { ...body }
    delete intent.operationId
    const requestHash = createHash('sha256').update(JSON.stringify(intent)).digest('hex')
    if (atomic && (typeof operationId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId))) {
      return NextResponse.json({ error: 'Vernieuw de pagina voordat je deze bestelling opslaat.' }, { status: 400 })
    }
    if (atomic) {
      const replay = await supabase.from('manual_order_commands').select('request_hash,order_id').eq('id', operationId).maybeSingle()
      if (replay.error) return NextResponse.json({ error: 'Ordercontrole tijdelijk niet beschikbaar. Probeer dezelfde bestelling opnieuw.' }, { status: 503 })
      if (replay.data) {
        if (replay.data.request_hash !== requestHash) return NextResponse.json({ error: 'Deze aanvraag hoort bij een andere bestelling.' }, { status: 409 })
        return NextResponse.json({ success: true, orderId: replay.data.order_id })
      }
    }

    // Validate stock for each item
    for (const item of items) {
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select('stock_quantity, presale_stock_quantity, is_available')
        .eq('id', item.variant_id)
        .single()

      if (variantError || !variant) {
        return NextResponse.json(
          { error: `Product variant niet gevonden: ${item.product_name}` },
          { status: 400 }
        )
      }
      if (!variant.is_available) {
        return NextResponse.json(
          { error: `${item.product_name} (${item.size} - ${item.color}) is niet beschikbaar` },
          { status: 400 }
        )
      }
      const totalAvailable = variant.stock_quantity + variant.presale_stock_quantity
      if (totalAvailable < item.quantity) {
        return NextResponse.json(
          { error: `Onvoldoende voorraad voor ${item.product_name} (${item.size} - ${item.color}): ${totalAvailable} beschikbaar` },
          { status: 400 }
        )
      }
    }

    // Calculate totals
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + item.price_at_purchase * item.quantity,
      0
    )
    const finalShippingCost = delivery_method === 'pickup' ? 0 : (shipping_cost || 0)
    const total = subtotal + finalShippingCost
    const isPaid = payment_status === 'paid'

    const orderPayload = {
        email: email.trim(),
        status: isPaid ? 'processing' : 'pending',
        payment_status: payment_status || 'pending',
        paid_at: isPaid ? new Date().toISOString() : null,
        payment_method: payment_method || null,
        subtotal,
        total,
        shipping_cost: finalShippingCost,
        tax_amount: 0,
        discount_amount: 0,
        shipping_address: { ...shipping_address, name: capitalizeName(shipping_address.name || '') },
        billing_address: billing_address
          ? { ...billing_address, name: capitalizeName(billing_address.name || '') }
          : { ...shipping_address, name: capitalizeName(shipping_address.name || '') },
        delivery_method: delivery_method || 'shipping',
        internal_notes: internal_notes || null,
        checkout_started_at: null,
        locale: 'nl',
    }
    const orderData = { ...orderPayload, id: atomic ? operationId : randomUUID(), created_at: new Date().toISOString() }

    // Apply staffelkorting to manual order items
    const productIds = [...new Set(items.map((i: any) => i.product_id))]
    const { data: allTiers, error: tierError } = await supabase
      .from('product_quantity_discounts')
      .select('*')
      .in('product_id', productIds)
      .eq('is_active', true)

    const { data: productPrices, error: priceError } = await supabase
      .from('products')
      .select('id, base_price, sale_price')
      .in('id', productIds)

    if (atomic && (tierError || priceError)) return NextResponse.json({ error: 'Prijzen kunnen nu niet worden gecontroleerd. Probeer dezelfde bestelling opnieuw.' }, { status: 503 })

    const tiersByProduct: Record<string, QuantityDiscountTier[]> = {}
    allTiers?.forEach((t: any) => {
      if (!tiersByProduct[t.product_id]) tiersByProduct[t.product_id] = []
      tiersByProduct[t.product_id].push(t)
    })

    const salePriceMap: Record<string, boolean> = {}
    productPrices?.forEach((p: any) => {
      salePriceMap[p.id] = !!(p.sale_price && p.sale_price < p.base_price)
    })

    const qtyByProduct: Record<string, number> = {}
    items.forEach((item: any) => {
      qtyByProduct[item.product_id] = (qtyByProduct[item.product_id] || 0) + item.quantity
    })

    const orderItems = items.map((item: any) => {
      const tiers = tiersByProduct[item.product_id]
      const hasSale = salePriceMap[item.product_id]
      const totalQty = qtyByProduct[item.product_id]

      if (!hasSale && tiers && tiers.length > 0) {
        const result = calculateQuantityDiscount(item.price_at_purchase, totalQty, tiers)
        return {
          order_id: orderData.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          product_name: item.product_name,
          size: item.size,
          color: item.color,
          sku: item.sku || `${item.product_id}-${item.size}-${item.color}`,
          quantity: item.quantity,
          original_price: item.price_at_purchase,
          quantity_discount_amount: result.discountPerItem,
          price_at_purchase: result.finalPrice,
          subtotal: result.finalPrice * item.quantity,
          image_url: item.image_url || null,
        }
      }

      return {
        order_id: orderData.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        product_name: item.product_name,
        size: item.size,
        color: item.color,
        sku: item.sku || `${item.product_id}-${item.size}-${item.color}`,
        quantity: item.quantity,
        original_price: item.price_at_purchase,
        quantity_discount_amount: 0,
        price_at_purchase: item.price_at_purchase,
        subtotal: item.price_at_purchase * item.quantity,
        image_url: item.image_url || null,
      }
    })

    // Recalculate order subtotal and total after staffelkorting
    const newSubtotal = orderItems.reduce((sum: number, i: any) => sum + i.subtotal, 0)
    if (Math.abs(newSubtotal - orderData.subtotal) > 0.01) {
      const newTotal = newSubtotal + (orderData.shipping_cost || 0) - (orderData.discount_amount || 0)
      orderData.subtotal = newSubtotal
      orderData.total = newTotal
    }

    if (atomic) {
      const result = await supabase.rpc('create_atomic_manual_order', {
        p_id: operationId, p_hash: requestHash, p_order: orderData, p_items: orderItems,
      })
      if (result.error || result.data?.ok !== true || result.data.orderId !== operationId) {
        return NextResponse.json({ error: 'De bestelling is nog niet bevestigd. Probeer dezelfde bestelling opnieuw; maak geen tweede aan.', code: 'MANUAL_ORDER_RETRY_REQUIRED' }, { status: 503 })
      }
      return NextResponse.json({ success: true, orderId: result.data.orderId })
    }

    const { error: orderError } = await supabase.from('orders').insert(orderData)
    if (orderError) return NextResponse.json({ error: 'Fout bij aanmaken order' }, { status: 500 })

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Manual order items insert error:', itemsError)
      await supabase.from('orders').delete().eq('id', orderData.id)
      return NextResponse.json(
        { error: 'Fout bij toevoegen producten', details: itemsError.message },
        { status: 500 }
      )
    }

    // Stock decrement (only if paid)
    if (isPaid) {
      for (const item of items) {
        const { data: variant } = await supabase
          .from('product_variants')
          .select('stock_quantity, presale_stock_quantity')
          .eq('id', item.variant_id)
          .single()

        if (variant) {
          let remaining = item.quantity
          let newRegular = variant.stock_quantity
          let newPresale = variant.presale_stock_quantity

          const fromRegular = Math.min(remaining, newRegular)
          newRegular -= fromRegular
          remaining -= fromRegular

          if (remaining > 0) {
            const fromPresale = Math.min(remaining, newPresale)
            newPresale -= fromPresale
          }

          await supabase
            .from('product_variants')
            .update({ stock_quantity: newRegular, presale_stock_quantity: newPresale })
            .eq('id', item.variant_id)
        }
      }
    }

    // Customer profile upsert
    const capitalizedName = capitalizeName(shipping_address.name || '')
    const nameParts = capitalizedName.split(' ')
    const firstName = nameParts[0] || null
    const lastName = nameParts.slice(1).join(' ') || null

    const { error: profileError } = await supabase.rpc('upsert_customer_profile', {
      p_email: email.trim(),
      p_first_name: firstName,
      p_last_name: lastName,
      p_phone: shipping_address.phone || null,
    })
    if (profileError) console.error('Customer profile upsert failed:', profileError.message)

    // Customer stats update (only if paid)
    if (isPaid) {
      const { error: statsError } = await supabase.rpc('update_customer_stats', {
        p_email: email.trim(),
        p_order_total: total,
        p_order_date: orderData.created_at,
      })
      if (statsError) console.error('Customer stats update failed:', statsError.message)
    }

    return NextResponse.json({ success: true, orderId: orderData.id })
  } catch (error: any) {
    console.error('Manual order creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Onbekende fout bij aanmaken order' },
      { status: 500 }
    )
  }
}
