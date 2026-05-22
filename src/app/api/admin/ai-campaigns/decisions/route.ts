import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'

const PAGE_SIZE = 25

export async function GET(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin', 'manager', 'viewer'])
  if (!authorized) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })
  }

  const url = new URL(req.url)
  const page = Math.max(1, Number(url.searchParams.get('page') || 1))
  const status = url.searchParams.get('status')
  const id = url.searchParams.get('id')

  const supabase = createServiceRoleClient()

  // Single-row detail mode
  if (id) {
    const [decisionRes, actionsRes] = await Promise.all([
      supabase.from('ad_autopilot_decisions').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('ad_autopilot_actions')
        .select('*')
        .eq('decision_id', id)
        .order('created_at', { ascending: true }),
    ])
    if (decisionRes.error) {
      return NextResponse.json({ error: decisionRes.error.message }, { status: 500 })
    }
    if (!decisionRes.data) {
      return NextResponse.json({ error: 'Beslissing niet gevonden.' }, { status: 404 })
    }
    return NextResponse.json({
      decision: decisionRes.data,
      actions: actionsRes.data ?? [],
    })
  }

  // List mode
  let query = supabase
    .from('ad_autopilot_decisions')
    .select(
      'id, run_started_at, run_completed_at, trigger, provider, model, prompt_version, snapshot_date, proposal_count, status, error_message, cost_usd, cost_input_tokens, cost_output_tokens',
      { count: 'exact' },
    )
    .order('run_started_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    totalCount: count ?? 0,
    rows: data ?? [],
  })
}
