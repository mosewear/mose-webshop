import { NextRequest, NextResponse } from 'next/server'
import { verifyMetaTestTicket } from '@/lib/meta/test-session'
export async function GET(request: NextRequest) {
  const ticket = request.nextUrl.searchParams.get('ticket') ?? undefined
  const session = verifyMetaTestTicket(ticket)
  if (!session) return NextResponse.json({ error: 'Invalid test session' }, { status: 403 })
  const target = request.nextUrl.searchParams.get('path') || '/en/shop'
  if (!/^\/(en|nl)\/(shop|product\/[a-z0-9-]+)(\?[^#]*)?$/.test(target)) return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
  const response = NextResponse.redirect(new URL(target, 'https://www.mosewear.com'))
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')
  response.cookies.set('mose_meta_test', ticket!, { secure: true, sameSite: 'lax', path: '/', maxAge: Math.floor((session.expires - Date.now()) / 1000) })
  return response
}
