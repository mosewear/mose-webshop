/**
 * PATCH — review a variant (approve / reject / archive).
 * Body: { id: string, status: 'approved' | 'rejected' | 'archived', qa_notes?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'

const ALLOWED_STATUSES = new Set(['approved', 'rejected', 'archived'])

interface PatchBody {
  id?: string
  status?: string
  qa_notes?: string | null
}

export async function PATCH(req: NextRequest) {
  const { authorized, adminUser } = await requireAdmin(['admin', 'manager'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
  }
  if (!body.id || !body.status) return NextResponse.json({ error: 'id + status verplicht' }, { status: 400 })
  if (!ALLOWED_STATUSES.has(body.status)) {
    return NextResponse.json({ error: `status moet approved | rejected | archived zijn` }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const patch: Record<string, unknown> = {
    status: body.status,
    reviewed_by: adminUser?.id ?? null,
    reviewed_at: new Date().toISOString(),
  }
  if (typeof body.qa_notes === 'string') patch.qa_notes = body.qa_notes

  const { data, error } = await supabase
    .from('ai_creative_variants')
    .update(patch)
    .eq('id', body.id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, variant: data })
}
