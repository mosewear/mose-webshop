import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { validateCampaignPayload } from '@/lib/marketing-campaign-validation'
import { ACTIVE_CAMPAIGN_TAG } from '@/lib/marketing-campaign'

export async function GET() {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json(
      { success: false, error: 'Niet geautoriseerd' },
      { status: 403 }
    )
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .select(
      `
        *,
        promo_code:promo_codes (id, code, discount_type, discount_value, is_active, expires_at)
      `
    )
    .order('priority', { ascending: false })
    .order('starts_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[admin/campaigns] list error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data })
}

export async function POST(req: NextRequest) {
  const { authorized, user } = await requireAdmin(['admin', 'manager'])
  if (!authorized || !user) {
    return NextResponse.json(
      { success: false, error: 'Niet geautoriseerd' },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Ongeldige JSON body.' },
      { status: 400 }
    )
  }

  const result = validateCampaignPayload(body)
  if (!result.ok || !result.payload) {
    return NextResponse.json(
      { success: false, error: result.errors.join(' ') },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()

  const { data: existing } = await supabase
    .from('marketing_campaigns')
    .select('id')
    .eq('slug', result.payload.slug)
    .maybeSingle()
  if (existing) {
    return NextResponse.json(
      { success: false, error: 'Een campagne met deze slug bestaat al.' },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('marketing_campaigns')
    .insert({ ...result.payload, created_by: user.id })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[admin/campaigns] insert error:', error)
    return NextResponse.json(
      { success: false, error: error?.message ?? 'Aanmaken mislukt.' },
      { status: 500 }
    )
  }

  revalidateTag(ACTIVE_CAMPAIGN_TAG, { expire: 0 })
  return NextResponse.json({ success: true, data })
}
