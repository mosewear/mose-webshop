import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/supabase/admin'
import { revalidateTag } from 'next/cache'

type Field = 'regular' | 'presale'

function parseBody(body: unknown): {
  variantId: string
  delta: number
  field: Field
  reason: string
  notes: string | null
  expectedStock?: number
} | null {
  if (!body || typeof body !== 'object') return null
  const o = body as Record<string, unknown>
  const variantId = typeof o.variantId === 'string' ? o.variantId : null
  const delta = o.delta
  const field = o.field === 'presale' ? 'presale' : o.field === 'regular' ? 'regular' : null
  const reason =
    typeof o.reason === 'string' && o.reason.trim() ? o.reason.trim() : 'manual'
  const notes =
    typeof o.notes === 'string' && o.notes.trim() ? o.notes.trim() : null
  if (!variantId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(variantId) ||
    typeof delta !== 'number' || !Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 2147483647 || !field) return null
  if (o.expectedStock !== undefined && (!Number.isSafeInteger(o.expectedStock) || Number(o.expectedStock) < 0)) return null
  if (o.expectedStock !== undefined && (Number(o.expectedStock) + delta < 0 || Number(o.expectedStock) + delta > 2147483647)) return null
  return { variantId, delta, field, reason, notes, ...(o.expectedStock === undefined ? {} : { expectedStock: Number(o.expectedStock) }) }
}

/**
 * Apply a stock delta (regular or presale) via DB RPC (audit + triggers).
 */
export async function POST(request: NextRequest) {
  const { authorized, supabase } = await requireAdmin(['admin', 'manager'])
  if (!authorized || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = parseBody(json)
  if (!parsed) {
    return NextResponse.json(
      { error: 'Invalid body: variantId, non-zero delta, field regular|presale required' },
      { status: 400 }
    )
  }

  const args = {
    p_variant_id: parsed.variantId,
    p_delta: Math.trunc(parsed.delta),
    p_reason: parsed.reason,
    p_notes: parsed.notes,
    p_receipt_id: null as string | null,
  }

  const respondError = async (message: string) => {
    if (message.includes('STOCK_CHANGED_RELOAD_REQUIRED')) {
      const { data } = await supabase.from('product_variants').select('stock_quantity').eq('id', parsed.variantId).single<{ stock_quantity: number }>()
      return NextResponse.json({ error: 'De voorraad is intussen gewijzigd. Laad het actuele aantal en controleer je wijziging.',
        ...(data ? { currentStock: data.stock_quantity } : {}) }, { status: 409 })
    }
    if (message.includes('OWNED_PRESALE_WRITE_FORBIDDEN')) return NextResponse.json({
      error: 'Voor dit artikel wordt de voorraad via Shopify beheerd. Pas de gewone voorraad aan; pre-salevoorraad is niet beschikbaar.',
    }, { status: 409 })
    return NextResponse.json({ error: 'Voorraadbewerking nog niet bevestigd. Probeer dezelfde bewerking opnieuw.' }, { status: 503 })
  }
  const confirmed = (result: unknown) => {
    try { revalidateTag('public-catalog', { expire: 0 }) } catch { console.error('[inventory adjust] catalogue refresh pending') }
    return NextResponse.json({ ok: true, result })
  }

  if (process.env.LEGACY_INVENTORY_ATOMIC_ENABLED === 'true') {
    const operation = request.headers.get('idempotency-key')
    if (!operation || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operation)) {
      return NextResponse.json({ error: 'Een vaste voorraadbewerking-ID is vereist. Vernieuw de beheerpagina.' }, { status: 400 })
    }
    const response = await (supabase as SupabaseClient).rpc('apply_inventory_command', { p_operation: operation, p_kind: 'adjust', p_payload: parsed })
    if (response.error) return respondError(response.error.message)
    return confirmed(response.data)
  }

  const client = supabase as SupabaseClient
  const res =
    parsed.field === 'regular'
      ? await client.rpc('inventory_apply_regular_delta', args)
      : await client.rpc('inventory_apply_presale_delta', args)

  const { data, error } = res

  if (error) {
    console.error('[inventory adjust]', parsed.field, error)
    return respondError(error.message)
  }

  return confirmed(data)
}
