import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { atomicLegacyLoyalty, atomicLoyaltyEnabled } from '@/lib/atomic-legacy-loyalty'

export async function POST(request: NextRequest) {
  const { authorized } = await requireAdmin()
  if (!authorized) return NextResponse.json({ error: 'Niet toegestaan' }, { status: 403 })
  if (!atomicLoyaltyEnabled()) return NextResponse.json({ error: 'Veilige puntenaanpassing is nog niet geactiveerd' }, { status: 503 })
  try {
    const body = await request.json()
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuid.test(body.operationId ?? '') || !uuid.test(body.accountId ?? '') ||
      !Number.isSafeInteger(body.points) || body.points === 0 || Math.abs(body.points) > 20_000_000 ||
      typeof body.reason !== 'string' || body.reason.trim().length < 1 || body.reason.length > 500) {
      return NextResponse.json({ error: 'Ongeldige puntenaanpassing' }, { status: 400 })
    }
    const client = createServiceRoleClient()
    const { data: account, error } = await client.from('loyalty_points').select('id,email,user_id').eq('id', body.accountId).single()
    if (error || !account) return NextResponse.json({ error: 'Lid niet gevonden' }, { status: 404 })
    const result = await atomicLegacyLoyalty(client, { kind: 'admin', key: `legacy:admin:${body.operationId}`,
      email: account.email, userId: account.user_id, points: body.points, accountId: account.id, reason: body.reason.trim() })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    return NextResponse.json({ error: message.includes('INSUFFICIENT') ? 'Saldo kan niet negatief worden' :
      'Aanpassing kon niet worden afgerond; probeer dezelfde aanvraag opnieuw' }, { status: message.includes('INSUFFICIENT') ? 409 : 503 })
  }
}
