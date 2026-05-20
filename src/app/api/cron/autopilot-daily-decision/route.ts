import { NextRequest, NextResponse } from 'next/server'
import { runAutopilotDailyDecision } from '@/lib/ai/orchestrator'

/**
 * Daily Vercel Cron entry: runs the AI orchestrator. In Phase 1 this
 * is *advisory only* (no Meta API writes happen; the only side effect
 * is rows in ad_autopilot_decisions + ad_autopilot_actions with
 * status='skipped').
 *
 * Auth via CRON_SECRET, same pattern as other cron routes.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET
  const querySecret = new URL(req.url).searchParams.get('secret') || ''
  const isAuthorized =
    !!cronSecret && (authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret)
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const overrideProvider = new URL(req.url).searchParams.get('provider') as
    | 'openai'
    | 'mock'
    | null
  const overrideModel = new URL(req.url).searchParams.get('model') || undefined

  try {
    // Provider/model default comes from site_settings inside the
    // orchestrator. We only override when the query string asks for it
    // (smoke tests) or when no OpenAI key is configured at all (force
    // mock so the run still produces a useful audit trail).
    const provider = overrideProvider ?? (process.env.OPENAI_API_KEY ? undefined : 'mock')

    const result = await runAutopilotDailyDecision({
      trigger: 'cron',
      provider,
      model: overrideModel,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    const message = (e as Error).message
    console.error('[cron/autopilot-daily-decision] failed:', message)
    return NextResponse.json({ ok: false, error: message }, { status: 200 })
  }
}
