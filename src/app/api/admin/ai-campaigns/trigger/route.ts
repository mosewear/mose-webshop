import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { runAutopilotDailyDecision } from '@/lib/ai/orchestrator'
import { ingestMetaSnapshots } from '@/lib/ai/snapshot-ingester'
import { runOosPauseRule } from '@/lib/ai/oos-pause'

/**
 * Admin-triggered manual run. Useful when the marketer wants to see a
 * fresh decision after, say, finishing the SKU economics fill-in or
 * pushing new creatives. Pass `?kind=decision`, `kind=snapshots` or
 * `kind=oos`.
 */
export async function POST(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })
  }

  const url = new URL(req.url)
  const kind = url.searchParams.get('kind') || 'decision'
  const providerOverride = url.searchParams.get('provider') as 'openai' | 'mock' | null

  try {
    if (kind === 'snapshots') {
      const result = await ingestMetaSnapshots()
      return NextResponse.json({ ok: true, kind, result })
    }
    if (kind === 'oos') {
      const result = await runOosPauseRule()
      return NextResponse.json({ ok: true, kind, result })
    }
    if (kind === 'decision') {
      const provider = providerOverride ?? (process.env.OPENAI_API_KEY ? undefined : 'mock')
      const result = await runAutopilotDailyDecision({
        trigger: 'manual',
        provider,
      })
      return NextResponse.json({ ok: true, kind, result })
    }
    return NextResponse.json({ error: `Onbekende kind=${kind}` }, { status: 400 })
  } catch (e) {
    // 502 (Bad Gateway) reflects "upstream call failed" — usually
    // OpenAI/Meta/Supabase returned an error we couldn't massage into
    // a 4xx. The UI uses `ok === false` to render the message; the
    // status code is for monitoring tools (Sentry/Vercel/Datadog).
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 })
  }
}
