import { NextRequest, NextResponse } from 'next/server'
import { draaiCampagnes } from '@/lib/campagnes'
import { eligiblePilotRecipients, MOSE_EDIT_PILOT } from '@/lib/mose-edit-pilot'
import { getPostmarkPilotReportWithOrders } from '@/lib/postmark-campaign-report'

/**
 * Elke vijf minuten. Doet niets tot een verzendmoment aan de beurt is; dan
 * verstuurt hij per ronde hooguit per_run adressen (standaard 250), zodat een
 * moment over een half uur uitgesmeerd wordt.
 */
export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const geheim = process.env.CRON_SECRET
  if (!geheim || (req.headers.get('authorization') || '') !== `Bearer ${geheim}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    // Read-only deployment check: returns counts, never recipients or credentials.
    if (req.nextUrl.searchParams.get('check') === 'pilot') {
      const exclusions: Record<string, number> = {}
      const now = await eligiblePilotRecipients(Date.now(), exclusions)
      const report = await getPostmarkPilotReportWithOrders()
      return NextResponse.json({ ok: report.status === 'ok' && report.clickOrders?.status === 'ok', eligibleNow: now.length, exclusions, maximum: MOSE_EDIT_PILOT.roster.length, startAt: MOSE_EDIT_PILOT.startAt, reportStatus: report.status, clickOrdersStatus: report.clickOrders?.status, paidOrders7d: report.clickOrders?.paidOrders7d })
    }
    return NextResponse.json({ ok: true, ...(await draaiCampagnes()) })
  } catch (e) {
    console.error('[cron/campagnes]', e)
    return NextResponse.json({ ok: false, fout: (e as Error).message }, { status: 500 })
  }
}
