import { NextRequest, NextResponse } from 'next/server'
import { synchroniseerKlantgegevens } from '@/lib/brevo'

/**
 * Elke nacht. Zet KLANT, AANTAL_ORDERS en LAATSTE_BESTELLING op ieder contact
 * in de Brevo-nieuwsbrieflijst. Bij een betaalde order gebeurt dat al direct;
 * dit vangt nieuwe contacten en gemiste updates op, en blokkeert wie bij ons
 * is uitgesloten maar in Brevo nog actief staat.
 */
export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const geheim = process.env.CRON_SECRET
  if (!geheim || (req.headers.get('authorization') || '') !== `Bearer ${geheim}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json({ ok: true, ...(await synchroniseerKlantgegevens()) })
  } catch (e) {
    console.error('[cron/brevo-klanten]', e)
    return NextResponse.json({ ok: false, fout: (e as Error).message }, { status: 500 })
  }
}
