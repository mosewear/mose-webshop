import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'

interface QuickPromoBody {
  code?: string
  description?: string
  discount_type?: 'percentage' | 'fixed'
  discount_value?: number | string
  min_order_value?: number | string
  expires_at?: string | null
}

const CODE_RE = /^[A-Z0-9_-]{3,40}$/

export async function POST(req: NextRequest) {
  const { authorized, user } = await requireAdmin(['admin', 'manager'])
  if (!authorized || !user) {
    return NextResponse.json(
      { success: false, error: 'Niet geautoriseerd' },
      { status: 403 }
    )
  }

  let body: QuickPromoBody
  try {
    body = (await req.json()) as QuickPromoBody
  } catch {
    return NextResponse.json(
      { success: false, error: 'Ongeldige JSON body.' },
      { status: 400 }
    )
  }

  const code = (body.code ?? '').toString().trim().toUpperCase()
  const discount_type = body.discount_type
  const discount_value = Number(body.discount_value)
  const min_order_value = Number(body.min_order_value ?? 0)

  const errors: string[] = []
  if (!CODE_RE.test(code)) {
    errors.push('Code mag alleen hoofdletters, cijfers, _ en - bevatten (3–40 tekens).')
  }
  if (discount_type !== 'percentage' && discount_type !== 'fixed') {
    errors.push('Type moet "percentage" of "fixed" zijn.')
  }
  if (!Number.isFinite(discount_value) || discount_value <= 0) {
    errors.push('Kortingswaarde moet groter zijn dan 0.')
  }
  if (discount_type === 'percentage' && discount_value > 100) {
    errors.push('Percentage mag maximaal 100 zijn.')
  }
  if (errors.length > 0) {
    return NextResponse.json(
      { success: false, error: errors.join(' ') },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()

  const { data: existing } = await supabase
    .from('promo_codes')
    .select('id')
    .eq('code', code)
    .maybeSingle()
  if (existing) {
    return NextResponse.json(
      { success: false, error: 'Deze code bestaat al.' },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('promo_codes')
    .insert({
      code,
      description: body.description?.toString().trim() || `Campagne code ${code}`,
      discount_type,
      discount_value,
      min_order_value: Number.isFinite(min_order_value) && min_order_value > 0 ? min_order_value : 0,
      expires_at: body.expires_at && body.expires_at !== '' ? body.expires_at : null,
      is_active: true,
      created_by: user.id,
    })
    .select('id, code, discount_type, discount_value, is_active, expires_at')
    .single()

  if (error || !data) {
    console.error('[admin/campaigns/quick-promo] insert error:', error)
    return NextResponse.json(
      { success: false, error: error?.message ?? 'Aanmaken mislukt.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data })
}
