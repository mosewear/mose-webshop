import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/admin'

/** Invalidates public presentation only; never writes product or stock data. */
export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })
  }
  const { authorized } = await requireAdmin()
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
  revalidateTag('public-catalog', { expire: 0 })
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
