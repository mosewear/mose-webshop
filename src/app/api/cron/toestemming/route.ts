import { NextRequest, NextResponse } from 'next/server'
import { verstuurPluk } from '@/lib/toestemming'

/**
 * Elk uur door Vercel Cron aangeroepen. Of er echt een pluk vertrekt, beslist
 * de database (aan, binnen het venster, wachttijd voorbij); een aanroep op een
 * verkeerd moment doet dus niets. GET, want Vercel Cron roept GET aan.
 */
export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const geheim = process.env.CRON_SECRET
  const kop = req.headers.get('authorization') || ''
  if (!geheim || kop !== `Bearer ${geheim}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const uitslag = await verstuurPluk()
    return NextResponse.json({ ok: true, ...uitslag })
  } catch (e) {
    console.error('[cron/toestemming]', e)
    return NextResponse.json({ ok: false, fout: (e as Error).message }, { status: 500 })
  }
}
