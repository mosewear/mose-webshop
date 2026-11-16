import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Order search for manual returns UI. Uses DB RPC (no broken PostgREST id::text filters)
 * and service role so all matching orders are visible for admins.
 */
export async function GET(request: NextRequest) {
  const { authorized } = await requireAdmin()
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const q = request.nextUrl.searchParams.get('q') ?? ''
  const limitRaw = request.nextUrl.searchParams.get('limit')
  const parsed = parseInt(limitRaw || '100', 10)
  const limit = Number.isFinite(parsed) ? Math.min(500, Math.max(1, parsed)) : 100

  const service = createServiceClient()

  const [{ data: orderRows, error: rpcError }, shopify] = await Promise.all([
    service.rpc('admin_search_orders_for_return', { p_query: q, p_limit: limit }),
    service.rpc('admin_search_shopify_orders_for_return', { p_query: q, p_limit: limit }),
  ])

  if (rpcError) {
    console.error('admin_search_orders_for_return', rpcError)
    return NextResponse.json({ error: rpcError.message }, { status: 500 })
  }

  const rows = (orderRows ?? []) as Array<{ id: string }>


  const ids = rows.map((o) => o.id)

  const { data: orderItems, error: itemsError } = ids.length ? await service
    .from('order_items')
    .select('*')
    .in('order_id', ids) : { data: [], error: null }

  if (itemsError) {
    console.error('order_items for admin search', itemsError)
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  const byOrder = new Map<string, unknown[]>()
  for (const item of orderItems ?? []) {
    const oid = (item as { order_id: string }).order_id
    const list = byOrder.get(oid) ?? []
    list.push(item)
    byOrder.set(oid, list)
  }

  const orders = rows.map((o) => ({
    ...(o as Record<string, unknown>),
    order_items: byOrder.get(o.id) ?? [],
  }))

  const shopifyOrders = (shopify.data ?? []) as Array<{
    id: string; created_at: string; item_count: number
  }>
  const combined = [
    ...orders.map(order => ({ ...order, created_at: (order as { created_at?: string }).created_at ?? '' })),
    ...shopifyOrders.map(order => ({
      ...order,
      return_url: '/admin/orders/shopify/' + order.id.split('/').pop() + '#retour',
    })),
  ].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  return NextResponse.json({ orders: combined.slice(0, limit), shopifyUnavailable: Boolean(shopify.error) }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
