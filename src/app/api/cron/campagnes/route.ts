import { NextRequest, NextResponse } from 'next/server'
import { draaiCampagnes } from '@/lib/campagnes'

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
    return NextResponse.json({ ok: true, ...(await draaiCampagnes()) })
  } catch (e) {
    console.error('[cron/campagnes]', e)
    return NextResponse.json({ ok: false, fout: (e as Error).message }, { status: 500 })
  }
}
