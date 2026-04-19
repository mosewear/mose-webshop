import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/supabase/admin'

type InventoryLogRowDb = {
  id: string
  variant_id: string
  change_amount: number
  previous_stock: number
  new_stock: number
  inventory_type: string
  reason: string
  notes: string | null
  receipt_id: string | null
  created_at: string | null
}

/**
 * Paginated inventory audit log with variant + product names.
 */
export async function GET(request: NextRequest) {
  const { authorized, supabase } = await requireAdmin(['admin', 'manager'])
  if (!authorized || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const variantId = sp.get('variantId')
  const receiptId = sp.get('receiptId')
  const limitRaw = sp.get('limit')
  const offsetRaw = sp.get('offset')

  const limit = Math.min(
    200,
    Math.max(1, parseInt(limitRaw || '50', 10) || 50)
  )
  const offset = Math.max(0, parseInt(offsetRaw || '0', 10) || 0)

  const db = supabase as SupabaseClient
  let query = db
    .from('inventory_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (variantId) {
    query = query.eq('variant_id', variantId)
  }
  if (receiptId) {
    query = query.eq('receipt_id', receiptId)
  }

  const { data: logs, error, count } = await query.range(
    offset,
    offset + limit - 1
  )

  if (error) {
    console.error('[inventory logs]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (logs ?? []) as InventoryLogRowDb[]
  const variantIds = [...new Set(rows.map((r) => r.variant_id).filter(Boolean))]

  let variantMap = new Map<
    string,
    { sku: string; size: string; color: string; product_name: string | null }
  >()

  if (variantIds.length > 0) {
    const { data: variants, error: vErr } = await db
      .from('product_variants')
      .select('id, sku, size, color, products(name)')
      .in('id', variantIds)

    if (vErr) {
      console.error('[inventory logs] variants', vErr)
      return NextResponse.json({ error: vErr.message }, { status: 500 })
    }

    variantMap = new Map(
      (variants ?? []).map((v) => {
        const p = v.products as { name: string } | { name: string }[] | null
        const productName = Array.isArray(p)
          ? p[0]?.name ?? null
          : p?.name ?? null
        return [
          v.id,
          {
            sku: v.sku,
            size: v.size,
            color: v.color,
            product_name: productName,
          },
        ]
      })
    )
  }

  const enriched = rows.map((row) => {
    const v = variantMap.get(row.variant_id)
    return {
      id: row.id,
      created_at: row.created_at,
      variant_id: row.variant_id,
      change_amount: row.change_amount,
      previous_stock: row.previous_stock,
      new_stock: row.new_stock,
      inventory_type: row.inventory_type,
      reason: row.reason,
      notes: row.notes,
      receipt_id: row.receipt_id,
      sku: v?.sku ?? null,
      size: v?.size ?? null,
      color: v?.color ?? null,
      product_name: v?.product_name ?? null,
    }
  })

  return NextResponse.json({
    logs: enriched,
    total: count ?? enriched.length,
    limit,
    offset,
  })
}
