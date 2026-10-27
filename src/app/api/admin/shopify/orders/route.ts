import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { parseOrderPage, readShopifyOrders } from '@/lib/shopify/order-access'

export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    const { authorized } = await requireAdmin(['admin', 'manager'])
    if (!authorized) return NextResponse.json({ error: 'Geen toegang.' }, { status: 403, headers })
    const page = parseOrderPage(request.url)
    if (page === null) return NextResponse.json({ error: 'Ongeldige pagina.' }, { status: 400, headers })
    return NextResponse.json(await readShopifyOrders(page, 'admin'), { headers })
  } catch {
    return NextResponse.json({ error: 'Bestellingen kunnen nu niet worden geladen.' }, { status: 503, headers })
  }
}
