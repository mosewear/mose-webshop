import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { readAdminAnalytics } from '@/lib/admin-analytics'
export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    const { authorized } = await requireAdmin(['admin', 'manager'])
    if (!authorized) return NextResponse.json({ error: 'Geen toegang.' }, { status: 403, headers })
    const days = Number(request.nextUrl.searchParams.get('days') ?? '30')
    if (days !== 7 && days !== 30 && days !== 90) return NextResponse.json({ error: 'Kies 7, 30 of 90 dagen.' }, { status: 400, headers })
    return NextResponse.json(await readAdminAnalytics(days), { headers })
  } catch {
    return NextResponse.json({ error: 'De volledige analyse kan nu niet worden geladen. Cijfers zijn niet bijgewerkt.' }, { status: 503, headers })
  }
}
