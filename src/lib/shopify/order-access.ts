import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { toShopifyOrderView, type OrderRow, type OwnerRow } from './order-views'

const pagination = z.object({ page: z.string().regex(/^\d{1,5}$/).default('0').transform(Number).refine(n => n <= 10000) }).strict()
export function parseOrderPage(url: string): number | null {
  const params = new URL(url).searchParams
  if ([...params.keys()].some(key => key !== 'page') || params.getAll('page').length > 1) return null
  const parsed = pagination.safeParse(Object.fromEntries(params))
  return parsed.success ? parsed.data.page : null
}
const PAGE_SIZE = 10

/** Call only after route authorization. userId is server-verified, never request-supplied. */
export async function readShopifyOrders(page: number, audience: 'admin' | 'account', userId?: string) {
  if (audience === 'account' && !userId) throw new Error('ACCOUNT_REQUIRED')
  const db = createServiceClient()
  let ids: string[] | undefined
  let hasMore = false
  if (audience === 'account') {
    const linked = await db.from('shopify_order_accounts').select('order_id')
      .eq('user_id', userId!).order('linked_at', { ascending: false }).order('order_id')
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
    if (linked.error) throw new Error('ACCOUNT_ORDERS_UNAVAILABLE')
    hasMore = (linked.data?.length ?? 0) > PAGE_SIZE
    ids = (linked.data ?? []).slice(0, PAGE_SIZE).map(row => row.order_id as string)
    if (!ids.length) return { orders: [], hasMore: false, page }
  }
  let query = db.from('shopify_order_snapshots').select('shopify_order_id,snapshot,synced_at')
  if (ids) query = query.in('shopify_order_id', ids)
  query = query.order('source_updated_at', { ascending: false }).order('shopify_order_id')
  if (!ids) query = query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  const snapshots = await query
  if (snapshots.error) throw new Error('ORDERS_UNAVAILABLE')
  if (!ids) hasMore = (snapshots.data?.length ?? 0) > PAGE_SIZE
  let rows = (snapshots.data ?? []).slice(0, PAGE_SIZE)
  // Match account link pagination order even when fulfillment updates reorder snapshots.
  if (ids) rows = rows.sort((a, b) => ids.indexOf(a.shopify_order_id) - ids.indexOf(b.shopify_order_id))
  let owners: OwnerRow[] = []
  if (audience === 'admin' && rows.length) {
    const result = await db.from('shopify_order_lines').select('line_id,fulfillment_owner')
      .in('order_id', rows.map(row => row.shopify_order_id)).limit(1000)
    if (result.error) throw new Error('ORDER_ROUTING_UNAVAILABLE')
    owners = result.data ?? []
  }
  return { orders: rows.map(row => toShopifyOrderView(row as OrderRow, owners, audience)), hasMore, page }
}
