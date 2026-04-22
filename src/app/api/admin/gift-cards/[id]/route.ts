import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// GET /api/admin/gift-cards/:id
// Return the card plus its redemptions.
// ---------------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized } = await requireAdmin(['admin', 'manager'])
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd' },
        { status: 403 }
      )
    }

    const { id } = await params
    const supabase = createServiceRoleClient()

    const { data: card, error: cardErr } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (cardErr || !card) {
      return NextResponse.json(
        { success: false, error: 'Cadeaubon niet gevonden' },
        { status: 404 }
      )
    }

    const { data: redemptions } = await supabase
      .from('gift_card_redemptions')
      .select('id, order_id, amount, status, created_at, committed_at, reversed_at')
      .eq('gift_card_id', id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      success: true,
      data: { card, redemptions: redemptions || [] },
    })
  } catch (error: any) {
    console.error('[admin/gift-cards/:id] GET error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/gift-cards/:id
// Update expiry / notes / status (cancel).
// ---------------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized } = await requireAdmin(['admin'])
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const allowed: Record<string, unknown> = {}

    if (body.expires_at !== undefined) {
      allowed.expires_at = body.expires_at
        ? new Date(body.expires_at).toISOString()
        : null
    }
    if (typeof body.admin_notes === 'string' || body.admin_notes === null) {
      allowed.admin_notes = body.admin_notes
    }
    if (
      typeof body.status === 'string' &&
      ['active', 'cancelled'].includes(body.status)
    ) {
      allowed.status = body.status
    }
    if (typeof body.recipient_email === 'string') {
      allowed.recipient_email = body.recipient_email || null
    }
    if (typeof body.recipient_name === 'string') {
      allowed.recipient_name = body.recipient_name || null
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Geen geldige velden om bij te werken' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('gift_cards')
      .update(allowed)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[admin/gift-cards/:id] PATCH error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('[admin/gift-cards/:id] PATCH unexpected error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
