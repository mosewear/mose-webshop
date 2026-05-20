import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'

interface EconomicsPayload {
  product_id: string
  variant_id?: string | null
  cost_price: number
  shipping_cost_avg?: number
  transaction_fee_pct?: number
  vat_rate?: number
  notes?: string | null
}

function isFiniteNonNegative(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0
}

function validatePayload(input: unknown): EconomicsPayload | { error: string } {
  if (!input || typeof input !== 'object') return { error: 'Body moet een object zijn' }
  const obj = input as Record<string, unknown>

  if (typeof obj.product_id !== 'string' || obj.product_id.length === 0) {
    return { error: 'product_id is verplicht' }
  }
  if (!isFiniteNonNegative(obj.cost_price)) {
    return { error: 'cost_price moet een positief getal zijn' }
  }
  if (obj.shipping_cost_avg !== undefined && !isFiniteNonNegative(obj.shipping_cost_avg)) {
    return { error: 'shipping_cost_avg moet een positief getal zijn' }
  }
  if (obj.transaction_fee_pct !== undefined) {
    if (typeof obj.transaction_fee_pct !== 'number' || obj.transaction_fee_pct < 0 || obj.transaction_fee_pct >= 1) {
      return { error: 'transaction_fee_pct moet tussen 0 en 1 liggen (0.029 = 2.9 %)' }
    }
  }
  if (obj.vat_rate !== undefined) {
    if (typeof obj.vat_rate !== 'number' || obj.vat_rate < 0 || obj.vat_rate >= 1) {
      return { error: 'vat_rate moet tussen 0 en 1 liggen (0.21 = 21 %)' }
    }
  }
  if (obj.variant_id !== undefined && obj.variant_id !== null && typeof obj.variant_id !== 'string') {
    return { error: 'variant_id moet een string of null zijn' }
  }
  if (obj.notes !== undefined && obj.notes !== null && typeof obj.notes !== 'string') {
    return { error: 'notes moet een string of null zijn' }
  }

  return {
    product_id: obj.product_id,
    variant_id: (obj.variant_id as string | null | undefined) ?? null,
    cost_price: obj.cost_price as number,
    shipping_cost_avg: (obj.shipping_cost_avg as number | undefined) ?? 0,
    transaction_fee_pct: (obj.transaction_fee_pct as number | undefined) ?? 0.029,
    vat_rate: (obj.vat_rate as number | undefined) ?? 0.21,
    notes: (obj.notes as string | null | undefined) ?? null,
  }
}

/**
 * GET — list all SKU economics rows joined with product/variant info
 * so the admin UI can render a usable table without doing the join
 * client-side.
 */
export async function GET() {
  const { authorized } = await requireAdmin(['admin', 'manager', 'viewer'])
  if (!authorized) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })
  }

  const supabase = createServiceRoleClient()

  const [productsRes, economicsRes] = await Promise.all([
    supabase
      .from('products')
      .select(
        'id, name, slug, base_price, sale_price, is_active, status, product_variants(id, sku, size, color, stock_quantity, price_adjustment, is_available)'
      )
      .eq('is_active', true)
      .eq('status', 'active')
      .order('name', { ascending: true }),
    supabase.from('ad_sku_economics').select('*'),
  ])

  if (productsRes.error) {
    return NextResponse.json({ error: productsRes.error.message }, { status: 500 })
  }
  if (economicsRes.error) {
    return NextResponse.json({ error: economicsRes.error.message }, { status: 500 })
  }

  return NextResponse.json({
    products: productsRes.data ?? [],
    economics: economicsRes.data ?? [],
  })
}

/**
 * POST — upsert one SKU economics row. Uses the (product_id, variant_id)
 * partial unique indexes from migration 20260520110100. Pass variant_id
 * = null for product-level fallback.
 */
export async function POST(request: NextRequest) {
  const { authorized, adminUser } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
  }

  const validation = validatePayload(body)
  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // We cannot rely on ON CONFLICT because the unique index is partial
  // (variant_id IS NOT NULL vs. variant_id IS NULL are two indices).
  // Manual upsert: delete existing matching row, then insert.
  const matchVariant = validation.variant_id
    ? supabase.from('ad_sku_economics').select('id').eq('product_id', validation.product_id).eq('variant_id', validation.variant_id).maybeSingle()
    : supabase
        .from('ad_sku_economics')
        .select('id')
        .eq('product_id', validation.product_id)
        .is('variant_id', null)
        .maybeSingle()

  const existing = await matchVariant
  if (existing.error) {
    return NextResponse.json({ error: existing.error.message }, { status: 500 })
  }

  if (existing.data) {
    const { error } = await supabase
      .from('ad_sku_economics')
      .update({
        cost_price: validation.cost_price,
        shipping_cost_avg: validation.shipping_cost_avg,
        transaction_fee_pct: validation.transaction_fee_pct,
        vat_rate: validation.vat_rate,
        notes: validation.notes,
      })
      .eq('id', existing.data.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, action: 'updated', id: existing.data.id, by: adminUser?.id })
  }

  const { data, error } = await supabase
    .from('ad_sku_economics')
    .insert({
      product_id: validation.product_id,
      variant_id: validation.variant_id,
      cost_price: validation.cost_price,
      shipping_cost_avg: validation.shipping_cost_avg,
      transaction_fee_pct: validation.transaction_fee_pct,
      vat_rate: validation.vat_rate,
      notes: validation.notes,
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, action: 'inserted', id: data.id, by: adminUser?.id })
}

/**
 * DELETE — remove one row by id. variant_id IS NULL rows (product-level
 * fallbacks) are kept until explicitly removed.
 */
export async function DELETE(request: NextRequest) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id query param ontbreekt' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('ad_sku_economics').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
