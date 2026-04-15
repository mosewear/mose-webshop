import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { authorized } = await requireAdmin()
    if (!authorized) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
    }

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
      if (!item.variant_id || !item.quantity || item.quantity < 1) {
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

    // Insert order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{
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
        shipping_address,
        billing_address: billing_address || shipping_address,
        delivery_method: delivery_method || 'shipping',
        internal_notes: internal_notes || null,
        checkout_started_at: null,
        locale: 'nl',
      }])
      .select()
      .single()

    if (orderError || !orderData) {
      console.error('Manual order insert error:', orderError)
      return NextResponse.json(
        { error: 'Fout bij aanmaken order', details: orderError?.message },
        { status: 500 }
      )
    }

    // Insert order items
    const orderItems = items.map((item: any) => ({
      order_id: orderData.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      product_name: item.product_name,
      size: item.size,
      color: item.color,
      sku: item.sku || `${item.product_id}-${item.size}-${item.color}`,
      quantity: item.quantity,
      price_at_purchase: item.price_at_purchase,
      subtotal: item.price_at_purchase * item.quantity,
      image_url: item.image_url || null,
    }))

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
    const nameParts = (shipping_address.name || '').trim().split(' ')
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
