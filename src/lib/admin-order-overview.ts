import { createServiceClient } from '@/lib/supabase/service'
import { admin } from '@/lib/shopify/client'
import { orderSchema } from '@/lib/shopify/orders'

export const METADATA = `query AdminOrderMetadata($ids:[ID!]!){ nodes(ids:$ids){ ... on Order { id createdAt email netPaymentSet { shopMoney { amount currencyCode } } } } }`
/** Authorized server-only reader. Refuse truncation instead of reporting partial financial totals. */
export async function readAdminOrderOverview() {
  const db = createServiceClient()
  async function all(table: string, select: string, key: string) {
    const rows: any[] = []
    for (let offset = 0; offset < 10000; offset += 500) {
      const result = await db.from(table).select(select).order(key).range(offset, offset + 499)
      if (result.error) throw new Error('ORDER_OVERVIEW_UNAVAILABLE')
      rows.push(...(result.data ?? []))
      if ((result.data?.length ?? 0) < 500) return rows
    }
    throw new Error('ORDER_OVERVIEW_LIMIT')
  }
  const [legacy, snapshots] = await Promise.all([
    all('orders', 'id,user_id,email,status,payment_status,total,delivery_method,shipping_address,tracking_code,label_url,created_at,updated_at,checkout_started_at', 'id'),
    all('shopify_order_snapshots', 'shopify_order_id,snapshot,synced_at', 'shopify_order_id'),
  ])
  const metadata = new Map<string, {createdAt:string;email:string|null;netPaymentSet:{shopMoney:{amount:string;currencyCode:string}}}>()
  for (let offset=0;offset<snapshots.length;offset+=100) {
    const ids=snapshots.slice(offset,offset+100).map(r=>r.shopify_order_id)
    const result=await admin<{nodes:({id:string;createdAt:string;email:string|null;netPaymentSet:{shopMoney:{amount:string;currencyCode:string}}}|null)[]}>(METADATA,{ids})
    for(const row of result.nodes) if(row) metadata.set(row.id,row)
  }
  const shopify = snapshots.map(row => normalizeShopifyAdminOrder(row,metadata.get(row.shopify_order_id)))
  return [...legacy.map(o=>({...o,source:'legacy',currency:'EUR',revenue:o.payment_status==='paid'?Number(o.total):0,detail_url:'/admin/orders/'+o.id})),...shopify]
    .sort((a,b)=>b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id))
}

export function normalizeShopifyAdminOrder(row: {snapshot:unknown;synced_at:string}, meta: {createdAt:string;email:string|null;netPaymentSet:{shopMoney:{amount:string;currencyCode:string}}}|undefined) {
    const o=orderSchema.parse(row.snapshot)
    if(!meta || !Number.isFinite(Date.parse(meta.createdAt))) throw new Error('ORDER_METADATA_UNAVAILABLE')
    if(!Number.isFinite(Number(meta.netPaymentSet.shopMoney.amount))) throw new Error('INVALID_PAYMENT_TOTAL')
    if(o.currencyCode!=='EUR' || meta.netPaymentSet.shopMoney.currencyCode!=='EUR') throw new Error('ORDER_CURRENCY_REQUIRES_CONVERSION')
    const paid=['PAID','PARTIALLY_PAID','PARTIALLY_REFUNDED','REFUNDED'].includes(o.displayFinancialStatus ?? '')
    const status=o.cancelledAt ? 'cancelled' : o.displayFulfillmentStatus==='FULFILLED' ? 'shipped' : o.displayFulfillmentStatus==='PARTIALLY_FULFILLED' ? 'partially_shipped' : 'processing'
    return {id:o.id, source:'shopify', name:o.name,email:meta.email ?? '', user_id:null,
      status, payment_status:(o.displayFinancialStatus ?? 'unknown').toLowerCase(),
      total:Number(o.currentTotalPriceSet.shopMoney.amount), currency:o.currencyCode,
      revenue:paid ? Number(meta.netPaymentSet.shopMoney.amount) : 0,
      paid_at:null,payment_method:'Shopify',delivery_method:'shipping',shipping_address:null,billing_address:null,
      payment_intent_id:null,tracking_code:o.fulfillments.filter(f=>f.status==='SUCCESS').flatMap(f=>f.trackingInfo).map(t=>t.number).filter(Boolean).join(', '),
      label_url:null,created_at:meta.createdAt,updated_at:o.updatedAt,checkout_started_at:null,
      production_status:'Productie nog niet bevestigd',synced_at:row.synced_at,
      detail_url:'/admin/shopify/orders#'+o.id.split('/').pop()}
}
