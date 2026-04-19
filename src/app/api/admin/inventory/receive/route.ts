import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/supabase/admin'

type InvType = 'regular' | 'presale'

function parseLines(raw: unknown): Array<{
  variant_id: string
  quantity_added: number
  inventory_type: InvType
}> | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out: Array<{
    variant_id: string
    quantity_added: number
    inventory_type: InvType
  }> = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') return null
    const o = row as Record<string, unknown>
    const variantId =
      typeof o.variantId === 'string'
        ? o.variantId
        : typeof o.variant_id === 'string'
          ? o.variant_id
          : null
    const qtyRaw = o.quantityAdded ?? o.quantity_added
    const qty = typeof qtyRaw === 'number' ? qtyRaw : Number(qtyRaw)
    const it = o.inventoryType ?? o.inventory_type
    const inventory_type: InvType =
      it === 'presale' ? 'presale' : 'regular'
    if (!variantId || !Number.isFinite(qty) || qty <= 0) return null
    out.push({
      variant_id: variantId,
      quantity_added: Math.trunc(qty),
      inventory_type: inventory_type,
    })
  }
  return out
}

function parseBody(body: unknown): {
  title: string
  notes: string | null
  expectedTotal: number | null
  lines: Array<{
    variant_id: string
    quantity_added: number
    inventory_type: InvType
  }>
} | null {
  if (!body || typeof body !== 'object') return null
  const o = body as Record<string, unknown>
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  const notes =
    typeof o.notes === 'string' && o.notes.trim() ? o.notes.trim() : null
  let expectedTotal: number | null = null
  if (o.expectedTotal !== undefined && o.expectedTotal !== null) {
    const e =
      typeof o.expectedTotal === 'number'
        ? o.expectedTotal
        : Number(o.expectedTotal)
    if (Number.isFinite(e) && e >= 0) expectedTotal = Math.trunc(e)
  }
  const lines = parseLines(o.lines)
  if (!title || !lines) return null
  return { title, notes, expectedTotal, lines }
}

/**
 * Commit an inbound stock receipt (single DB transaction via RPC).
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
      {
        error:
          'Invalid body: title (non-empty), lines[{ variantId, quantityAdded, inventoryType? }] required',
      },
      { status: 400 }
    )
  }

  const client = supabase as SupabaseClient
  const { data, error } = await client.rpc('inventory_commit_receipt', {
    p_title: parsed.title,
    p_lines: parsed.lines,
    p_notes: parsed.notes,
    p_expected_total: parsed.expectedTotal,
  })

  if (error) {
    console.error('[inventory receive]', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, result: data })
}
