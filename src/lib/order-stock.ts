import type { SupabaseClient } from '@supabase/supabase-js'

type OrderItemLine = {
  variant_id: string
  quantity: number
  product_name: string
  size: string
  color: string
  is_presale?: boolean | null
}

/**
 * Decrement variant inventory for a paid order (idempotent via orders.stock_decremented_at).
 * Non-presale lines: regular stock first, then presale (matches checkout reservation).
 * Presale lines: presale pool only.
 */
export async function applyInventoryDecrementForPaidOrder(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ ok: boolean; skipped?: boolean; reason?: string }> {
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, payment_status, stock_decremented_at')
    .eq('id', orderId)
    .maybeSingle()

  if (orderErr || !order) {
    return { ok: false, reason: 'order_not_found' }
  }
  if (order.payment_status !== 'paid') {
    return { ok: true, skipped: true, reason: 'not_paid' }
  }
  if (order.stock_decremented_at) {
    return { ok: true, skipped: true, reason: 'already_decremented' }
  }

  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('variant_id, quantity, product_name, size, color, is_presale')
    .eq('order_id', orderId)

  if (itemsErr) {
    return { ok: false, reason: itemsErr.message }
  }
  if (!items?.length) {
    return { ok: false, reason: 'no_order_items' }
  }

  let anyLineFailed = false
  for (const item of items as OrderItemLine[]) {
    const lineResult = await decrementOneLine(supabase, item)
    if (!lineResult.ok) {
      anyLineFailed = true
      console.error(
        `[order-stock] Line failed order=${orderId} variant=${item.variant_id}:`,
        lineResult.reason
      )
    }
  }

  if (anyLineFailed) {
    return { ok: false, reason: 'one_or_more_lines_failed' }
  }

  const { error: stampErr } = await supabase
    .from('orders')
    .update({ stock_decremented_at: new Date().toISOString() })
    .eq('id', orderId)
    .is('stock_decremented_at', null)

  if (stampErr) {
    console.error('[order-stock] Failed to stamp stock_decremented_at:', stampErr)
    return { ok: false, reason: stampErr.message }
  }

  return { ok: true }
}

async function decrementOneLine(
  supabase: SupabaseClient,
  item: OrderItemLine
): Promise<{ ok: boolean; reason?: string }> {
  const { data: variant, error: fetchError } = await supabase
    .from('product_variants')
    .select('id, stock_quantity, presale_enabled, presale_stock_quantity')
    .eq('id', item.variant_id)
    .single()

  if (fetchError || !variant) {
    return { ok: false, reason: fetchError?.message || 'variant_not_found' }
  }

  if (item.is_presale === true) {
    const newPresale = Math.max(0, (variant.presale_stock_quantity || 0) - item.quantity)
    const { error: upErr } = await supabase
      .from('product_variants')
      .update({ presale_stock_quantity: newPresale })
      .eq('id', item.variant_id)
    if (upErr) return { ok: false, reason: upErr.message }
    return { ok: true }
  }

  const regQty = variant.stock_quantity ?? 0
  const preQty = variant.presale_stock_quantity ?? 0
  const totalAvailable = regQty + preQty

  if (totalAvailable < item.quantity) {
    return { ok: false, reason: `insufficient_stock:${item.product_name}` }
  }

  let remaining = item.quantity
  let newRegular = regQty
  let newPresale = preQty

  if (regQty > 0) {
    const fromRegular = Math.min(remaining, regQty)
    newRegular -= fromRegular
    remaining -= fromRegular
  }
  if (remaining > 0 && preQty > 0) {
    const fromPresale = Math.min(remaining, preQty)
    newPresale -= fromPresale
    remaining -= fromPresale
  }

  const { error: upErr } = await supabase
    .from('product_variants')
    .update({
      stock_quantity: newRegular,
      presale_stock_quantity: newPresale,
    })
    .eq('id', item.variant_id)

  if (upErr) return { ok: false, reason: upErr.message }
  return { ok: true }
}
