import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseOrderPage, readShopifyOrders } from '@/lib/shopify/order-access'

export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    const auth = await createClient()
    const { data: { user }, error } = await auth.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Log in om je bestellingen te bekijken.' }, { status: 401, headers })
    const page = parseOrderPage(request.url)
    if (page === null) return NextResponse.json({ error: 'Ongeldige pagina.' }, { status: 400, headers })
    if (process.env.SHOPIFY_SYNC_ENABLED !== 'true' || process.env.NEXT_PUBLIC_SHOPIFY_ORDERS_ENABLED !== 'true') return NextResponse.json({ enabled: false, orders: [], hasMore: false, page, reason: 'SYNC_NOT_CONFIGURED' }, { headers })
    return NextResponse.json(await readShopifyOrders(page, 'account', user.id), { headers })
  } catch {
    return NextResponse.json({ error: 'Bestellingen kunnen nu niet worden geladen.' }, { status: 503, headers })
  }
}
