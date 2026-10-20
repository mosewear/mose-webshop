import { NextRequest, NextResponse } from 'next/server'
import { bevestig } from '@/lib/toestemming'

/**
 * Bevestiging komt alleen via POST, vanaf de knop op de pagina. Een GET-link
 * in de mail zou door virusscanners en linkvoorvertoningen (Outlook Safe
 * Links, Gmail) automatisch geopend worden, en dan staat iedereen op
 * "bevestigd" zonder dat er een mens heeft geklikt.
 */
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string }
  if (!token || !/^[0-9a-f]{36}$/.test(token)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null
  const browser = req.headers.get('user-agent')?.slice(0, 300) || null
  const res = await bevestig(token, { ip, browser })
  return NextResponse.json(res, { status: res.ok ? 200 : 404 })
}
