import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/supabase/admin'

type Field = 'regular' | 'presale'

function parseBody(body: unknown): {
  variantId: string
  delta: number
  field: Field
  reason: string
  notes: string | null
} | null {
  if (!body || typeof body !== 'object') return null
  const o = body as Record<string, unknown>
  const variantId = typeof o.variantId === 'string' ? o.variantId : null
  const delta = typeof o.delta === 'number' ? o.delta : Number(o.delta)
  const field = o.field === 'presale' ? 'presale' : o.field === 'regular' ? 'regular' : null
  const reason =
    typeof o.reason === 'string' && o.reason.trim() ? o.reason.trim() : 'manual'
  const notes =
    typeof o.notes === 'string' && o.notes.trim() ? o.notes.trim() : null
  if (!variantId || !Number.isFinite(delta) || delta === 0 || !field) return null
  return { variantId, delta, field, reason, notes }
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

  const client = supabase as SupabaseClient
  const res =
    parsed.field === 'regular'
      ? await client.rpc('inventory_apply_regular_delta', args)
      : await client.rpc('inventory_apply_presale_delta', args)

  const { data, error } = res

  if (error) {
    console.error('[inventory adjust]', parsed.field, error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, result: data })
}
