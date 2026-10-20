import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceClient } from '@/lib/supabase/service'
import {
  leesInstellingen,
  leesCijfers,
  overzichtPerPluk,
  verstuurPluk,
  verstuurTest,
} from '@/lib/toestemming'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET() {
  const { authorized } = await requireAdmin(['admin'])
  if (!authorized) return NextResponse.json({ ok: false, fout: 'Niet geautoriseerd' }, { status: 403 })
  const [instellingen, cijfers, plukken] = await Promise.all([leesInstellingen(), leesCijfers(), overzichtPerPluk()])
  return NextResponse.json({ ok: true, instellingen, cijfers, plukken })
}

export async function POST(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin'])
  if (!authorized) return NextResponse.json({ ok: false, fout: 'Niet geautoriseerd' }, { status: 403 })
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const db = createServiceClient()
  const nu = new Date().toISOString()

  switch (body.actie) {
    case 'start':
      // Starten heft ook een eerdere automatische stop op; dat is een bewuste
      // keuze van degene die op de knop drukt, met de reden in beeld.
      await db.from('toestemming_instellingen').update({ actief: true, gestopt_op: null, stopreden: null, updated_at: nu }).eq('id', 1)
      return NextResponse.json({ ok: true })
    case 'pauzeer':
      await db.from('toestemming_instellingen').update({ actief: false, updated_at: nu }).eq('id', 1)
      return NextResponse.json({ ok: true })
    case 'nu':
      return NextResponse.json({ ok: true, uitslag: await verstuurPluk({ negeerWachttijd: true }) })
    case 'test': {
      const email = String(body.email || '')
      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return NextResponse.json({ ok: false, fout: 'Ongeldig adres' }, { status: 400 })
      return NextResponse.json(await verstuurTest(email, body.taal === 'en' ? 'en' : 'nl'))
    }
    case 'instellingen': {
      const getal = (v: unknown, min: number, max: number) => {
        const n = Number(v)
        return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : undefined
      }
      const wijziging = {
        plukgrootte: getal(body.plukgrootte, 1, 500),
        interval_minuten: getal(body.interval_minuten, 30, 1440),
        venster_van: getal(body.venster_van, 0, 23),
        venster_tot: getal(body.venster_tot, 1, 24),
      }
      const schoon = Object.fromEntries(Object.entries(wijziging).filter(([, v]) => v !== undefined))
      await db.from('toestemming_instellingen').update({ ...schoon, updated_at: nu }).eq('id', 1)
      return NextResponse.json({ ok: true })
    }
    case 'zakelijk_vrijgeven': {
      // Achteraan in de rij: eerst de particuliere adressen afmaken.
      const { count } = await db
        .from('toestemming_ontvangers')
        .update({ status: 'wachtrij', prioriteit: 200 }, { count: 'exact' })
        .eq('status', 'vastgehouden')
      return NextResponse.json({ ok: true, vrijgegeven: count })
    }
    default:
      return NextResponse.json({ ok: false, fout: 'Onbekende actie' }, { status: 400 })
  }
}
