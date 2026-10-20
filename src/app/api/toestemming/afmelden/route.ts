import { NextRequest, NextResponse } from 'next/server'
import { meldAf } from '@/lib/toestemming'

/**
 * Afmelden vanaf de knop op /toestemming?actie=afmelden (JSON met token, of
 * het token als ?t= in de URL). De afmeldknop van Gmail en Apple Mail loopt
 * via Postmark, dat de stream beheert en ons via de webhook seint. Een kale
 * GET meldt niemand af, om dezelfde reden als bij bevestigen.
 */
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let token = new URL(req.url).searchParams.get('t') || ''
  if (!token) {
    const body = (await req.json().catch(() => ({}))) as { token?: string }
    token = body.token || ''
  }
  if (!/^[0-9a-f]{36}$/.test(token)) return NextResponse.json({ ok: false }, { status: 400 })
  const res = await meldAf(token)
  return NextResponse.json(res, { status: res.ok ? 200 : 404 })
}
