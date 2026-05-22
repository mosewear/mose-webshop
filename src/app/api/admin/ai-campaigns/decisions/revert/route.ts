/**
 * Revert a previously-executed autopilot action by restoring its
 * captured prior_state via the Meta API. Honoured for actions whose
 * `executed_at` is within the configured revert window (default 30
 * days). The action row is updated to status='reverted'.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { revertExecutedAction } from '@/lib/ai/executor'

export async function POST(req: NextRequest) {
  const { authorized, adminUser } = await requireAdmin(['admin', 'manager'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  const url = new URL(req.url)
  const actionId = url.searchParams.get('actionId')
  if (!actionId) return NextResponse.json({ error: 'actionId vereist' }, { status: 400 })

  // Enforce the configured revert window so admins can't unwind ancient
  // actions whose context is no longer valid.
  const supabase = createServiceRoleClient()
  const [windowRow, actionRow] = await Promise.all([
    supabase.from('site_settings').select('value').eq('key', 'ai_autopilot_revert_window_days').maybeSingle(),
    supabase.from('ad_autopilot_actions').select('executed_at, status, reverted_at').eq('id', actionId).maybeSingle(),
  ])

  if (!actionRow.data) return NextResponse.json({ error: 'Actie niet gevonden' }, { status: 404 })
  const action = actionRow.data as { executed_at: string | null; status: string; reverted_at: string | null }
  if (action.status !== 'executed' || action.reverted_at || !action.executed_at) {
    return NextResponse.json({ error: 'Actie is niet revertbaar (status of timestamp ontbreekt).' }, { status: 400 })
  }

  // Parse with NaN-guard — a malformed jsonb value would otherwise let
  // `ageMs > NaN` evaluate to false and silently disable the window.
  const rawWindow = (windowRow.data as { value?: number | string } | null)?.value
  const parsedWindow = typeof rawWindow === 'number' ? rawWindow : Number(rawWindow)
  const windowDays = Number.isFinite(parsedWindow) && parsedWindow > 0 ? parsedWindow : 30
  const ageMs = Date.now() - new Date(action.executed_at).getTime()
  const windowMs = windowDays * 86_400_000
  if (ageMs > windowMs) {
    return NextResponse.json(
      { error: `Revert-window van ${windowDays} dagen verstreken.` },
      { status: 400 },
    )
  }

  const result = await revertExecutedAction(actionId, adminUser?.id ?? null)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 })
  return NextResponse.json({ ok: true })
}
