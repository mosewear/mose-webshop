import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { validateCampaignPayload } from '@/lib/marketing-campaign-validation'
import { ACTIVE_CAMPAIGN_TAG } from '@/lib/marketing-campaign'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json(
      { success: false, error: 'Niet geautoriseerd' },
      { status: 403 }
    )
  }

  const { id } = await context.params
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('marketing_campaigns')
    .select(
      `
        *,
        promo_code:promo_codes (id, code, discount_type, discount_value, is_active, expires_at)
      `
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[admin/campaigns] get error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
  if (!data) {
    return NextResponse.json(
      { success: false, error: 'Campagne niet gevonden.' },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true, data })
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json(
      { success: false, error: 'Niet geautoriseerd' },
      { status: 403 }
    )
  }

  const { id } = await context.params

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
    .neq('id', id)
    .maybeSingle()
  if (existing) {
    return NextResponse.json(
      { success: false, error: 'Een andere campagne gebruikt deze slug al.' },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('marketing_campaigns')
    .update(result.payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    console.error('[admin/campaigns] update error:', error)
    return NextResponse.json(
      { success: false, error: error?.message ?? 'Opslaan mislukt.' },
      { status: 500 }
    )
  }

  revalidateTag(ACTIVE_CAMPAIGN_TAG, { expire: 0 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { authorized } = await requireAdmin(['admin'])
  if (!authorized) {
    return NextResponse.json(
      { success: false, error: 'Niet geautoriseerd' },
      { status: 403 }
    )
  }

  const { id } = await context.params
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('marketing_campaigns')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[admin/campaigns] delete error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  revalidateTag(ACTIVE_CAMPAIGN_TAG, { expire: 0 })
  return NextResponse.json({ success: true })
}
