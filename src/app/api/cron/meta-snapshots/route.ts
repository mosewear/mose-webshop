import { NextRequest, NextResponse } from 'next/server'
import { ingestMetaSnapshots } from '@/lib/ai/snapshot-ingester'
import { runOosPauseRule } from '@/lib/ai/oos-pause'

/**
 * Hourly Vercel Cron entry: pulls fresh Meta Marketing API snapshots
 * and applies the rule-based OOS-pause check. Returns 200 even when
 * Meta credentials are missing so the cron stays green during the
 * window between code deploy and System User token configuration.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` —
 * we enforce it. Same convention as /api/sendcloud-sync-statuses.
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

  const startedAt = new Date().toISOString()

  let snapshotSummary: Awaited<ReturnType<typeof ingestMetaSnapshots>> | null = null
  let snapshotError: string | null = null
  try {
    snapshotSummary = await ingestMetaSnapshots()
  } catch (e) {
    snapshotError = (e as Error).message
  }

  let oosSummary: Awaited<ReturnType<typeof runOosPauseRule>> | null = null
  let oosError: string | null = null
  try {
    oosSummary = await runOosPauseRule()
  } catch (e) {
    oosError = (e as Error).message
  }

  const allOk = !snapshotError && !oosError
  return NextResponse.json(
    {
      ok: allOk,
      started_at: startedAt,
      snapshot: snapshotSummary,
      snapshot_error: snapshotError,
      oos_rule: oosSummary,
      oos_error: oosError,
    },
    { status: allOk ? 200 : 500 },
  )
}
