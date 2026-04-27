import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { ACTIVE_CAMPAIGN_TAG } from '@/lib/marketing-campaign'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_req: NextRequest, context: RouteContext) {
  const { authorized, user } = await requireAdmin(['admin', 'manager'])
  if (!authorized || !user) {
    return NextResponse.json(
      { success: false, error: 'Niet geautoriseerd' },
      { status: 403 }
    )
  }

  const { id } = await context.params
  const supabase = createServiceRoleClient()

  const { data: original, error: fetchError } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (fetchError || !original) {
    return NextResponse.json(
      { success: false, error: 'Origineel niet gevonden.' },
      { status: 404 }
    )
  }

  const baseSlug = `${original.slug}-kopie`
  let candidateSlug = baseSlug
  for (let i = 1; i < 25; i++) {
    const { data: clash } = await supabase
      .from('marketing_campaigns')
      .select('id')
      .eq('slug', candidateSlug)
      .maybeSingle()
    if (!clash) break
    candidateSlug = `${baseSlug}-${i + 1}`
  }

  const {
    id: _omitId,
    created_at: _omitCreated,
    updated_at: _omitUpdated,
    created_by: _omitCreatedBy,
    ...rest
  } = original as Record<string, unknown>
  void _omitId
  void _omitCreated
  void _omitUpdated
  void _omitCreatedBy

  const { data, error } = await supabase
    .from('marketing_campaigns')
    .insert({
      ...rest,
      slug: candidateSlug,
      name: `${(original as { name: string }).name} (kopie)`,
      is_enabled: false,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[admin/campaigns] duplicate error:', error)
    return NextResponse.json(
      { success: false, error: error?.message ?? 'Dupliceren mislukt.' },
      { status: 500 }
    )
  }

  revalidateTag(ACTIVE_CAMPAIGN_TAG, { expire: 0 })
  return NextResponse.json({ success: true, data })
}
