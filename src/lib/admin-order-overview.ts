import { createServiceClient } from '@/lib/supabase/service'
import { admin } from '@/lib/shopify/client'
import { shipmentLabel } from '@/lib/shopify/shipping-status'
import { orderSchema, type OrderProjection } from '@/lib/shopify/orders'
import { moneyCents } from '@/lib/admin-order-metrics'
import { z } from 'zod'
import { productionPresentation, type StoredProduction } from '@/lib/tapstitch-production'

export const METADATA = `query AdminOrderMetadata($ids:[ID!]!){ nodes(ids:$ids){ ... on Order { id createdAt email netPaymentSet { shopMoney { amount currencyCode } } } } }`
/** Authorized server-only reader. Refuse truncation instead of reporting partial financial totals. */
export async function readAllAdminRows(table: string, select: string, key: string) {
  const db = createServiceClient()
  const rows: any[] = []
  const seen = new Set<string>()
  let after: string | number | undefined
  while (true) {
    const limit = Math.min(500, 10000 - rows.length + 1)
    let query = db.from(table).select(select).order(key, { ascending: true }).limit(limit)
    if (after !== undefined) query = query.gt(key, after)
    const result = await query
    if (result.error) throw new Error('ORDER_OVERVIEW_UNAVAILABLE')
    const page: unknown[] = result.data ?? []
    if (rows.length + page.length > 10000) throw new Error('ORDER_OVERVIEW_LIMIT')
    for (const row of page) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('ORDER_ROW_INVALID')
      const cursor = (row as Record<string, unknown>)[key]
      if (typeof cursor !== 'string' && typeof cursor !== 'number') throw new Error('ORDER_CURSOR_UNAVAILABLE')
      if (seen.has(String(cursor))) throw new Error('ORDER_OVERVIEW_DUPLICATE')
      seen.add(String(cursor))
      rows.push(row)
      after = cursor
    }
    if (page.length < limit) return rows
  }
}

export async function readAdminOrderOverview() {
  const all = readAllAdminRows
  const [legacy, snapshots, refunds, production] = await Promise.all([
    all('orders', 'id,user_id,email,status,payment_status,total,delivery_method,shipping_address,tracking_code,label_url,created_at,updated_at,checkout_started_at,paid_at,payment_method', 'id'),
    all('shopify_order_snapshots', 'shopify_order_id,snapshot,synced_at', 'shopify_order_id'),
    all('returns', 'id,order_id,status,refund_amount,mollie_refund_id,stripe_refund_id,mollie_refund_status,stripe_refund_status,refunded_at', 'id'),
    all('tapstitch_latest_production','shopify_order_id,supplier_order_id,shopify_order_name,status,header_text,source_url,observed_at,run_id','shopify_order_id'),
  ])
  const metadata = new Map<string, {createdAt:string;email:string|null;netPaymentSet:{shopMoney:{amount:string;currencyCode:string}}}>()
  // Retain authoritative metadata with each reconciled projection. Historical reports
  // must not require a fresh Shopify read for every old order on each page view.
  const missingMetadata = []
  for (const row of snapshots) {
    const stored = storedOrderMetadata(orderSchema.parse(row.snapshot))
    if (stored) metadata.set(row.shopify_order_id, stored)
    else missingMetadata.push(row)
  }
  for (let offset=0;offset<missingMetadata.length;offset+=100) {
    const ids=missingMetadata.slice(offset,offset+100).map(r=>r.shopify_order_id)
    const result=await admin<{nodes:({id:string;createdAt:string;email:string|null;netPaymentSet:{shopMoney:{amount:string;currencyCode:string}}}|null)[]}>(METADATA,{ids})
    for(const row of result.nodes) if(row) metadata.set(row.id,row)
  }

  const shopify = snapshots.map(row => ({...normalizeShopifyAdminOrder(row,metadata.get(row.shopify_order_id)),
    ...productionPresentation(production.find(p=>p.shopify_order_id===row.shopify_order_id) as StoredProduction|undefined)}))
  const confirmedRefunds = legacyRefundTotals(refunds)
  return [...legacy.map(o => normalizeLegacyAdminOrder(o, confirmedRefunds.get(o.id) ?? 0)), ...shopify]
    .sort((a,b)=>b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id))
}

const legacyReportedAmount = z.union([z.number().finite(), z.string().regex(/^\d+(\.\d+)?$/)]).transform(Number)

interface RecordedRefund {
  id: string; order_id: string; status: string; refund_amount: number | string;
  mollie_refund_id: string | null; stripe_refund_id: string | null;
  mollie_refund_status: string | null; stripe_refund_status: string | null; refunded_at: string | null;
}
/** A return workflow label alone cannot prove cash was refunded. */
export function legacyRefundTotals(refunds: RecordedRefund[]): Map<string, number> {
  const totals = new Map<string, number>()
  const seen = new Map<string, { order: string; cents: number }>()
  for (const refund of refunds) {
    const providerId = refund.mollie_refund_id || refund.stripe_refund_id
    const confirmed = refund.mollie_refund_id
      ? refund.mollie_refund_status === 'refunded'
      : refund.stripe_refund_id
        ? refund.stripe_refund_status === 'succeeded'
        : refund.status === 'refunded' && Boolean(refund.refunded_at)
    if (!confirmed) continue
    const cents = moneyCents(legacyReportedAmount.parse(refund.refund_amount))
    if (cents < 0) throw new Error('INVALID_REFUND_TOTAL')
    const key = providerId || 'manual:' + refund.id
    const previous = seen.get(key)
    if (previous) {
      if (previous.order !== refund.order_id || previous.cents !== cents) throw new Error('CONFLICTING_REFUND_EVIDENCE')
      continue
    }
    seen.set(key, { order: refund.order_id, cents })
    totals.set(refund.order_id, (totals.get(refund.order_id) ?? 0) + cents)
  }
  return totals
}
const legacyMetricSchema = z.object({
  id: z.string().min(1), created_at: z.string().datetime({ offset: true }),
  status: z.string().nullish().transform(v => v ?? 'unknown'),
  payment_status: z.string().nullish().transform(v => v ?? 'unpaid'),
  total: legacyReportedAmount,
  email: z.string().nullish().transform(v => v ?? null),
  checkout_started_at: z.string().nullish().transform(v => v ?? null),
  payment_method: z.string().nullish().transform(v => v ?? null),
}).passthrough()
export function normalizeLegacyAdminOrder(input: Record<string, unknown>, refundedCents = 0) {
  const order = legacyMetricSchema.parse(input)
  const gross = moneyCents(order.total)
  if (gross < 0 || refundedCents < 0 || refundedCents > gross) throw new Error('REFUNDS_EXCEED_ORDER_TOTAL')
  if (order.payment_status === 'partially_paid') throw new Error('LEGACY_CAPTURE_AMOUNT_REQUIRED')
  const hadPayment = ['paid', 'partially_paid', 'partially_refunded', 'refunded'].includes(order.payment_status)
  let paymentStatus = order.payment_status
  if (hadPayment && refundedCents > 0 && paymentStatus !== 'refunded') paymentStatus = refundedCents === gross ? 'refunded' : 'partially_refunded'
  return { ...order, source: 'legacy', currency: 'EUR', payment_status: paymentStatus,
    revenue: hadPayment && paymentStatus !== 'refunded' ? (gross - refundedCents) / 100 : 0,
    detail_url: '/admin/orders/' + order.id }
}

function storedOrderMetadata(order: OrderProjection) {
  return order.createdAt && order.netPaymentSet && order.email !== undefined
    ? { createdAt: order.createdAt, email: order.email, netPaymentSet: order.netPaymentSet }
    : undefined
}

export function normalizeShopifyAdminOrder(row: {snapshot:unknown;synced_at:string}, meta: {createdAt:string;email:string|null;netPaymentSet:{shopMoney:{amount:string;currencyCode:string}}}|undefined) {
    const o=orderSchema.parse(row.snapshot)
    meta = storedOrderMetadata(o) ?? meta
    if(!meta || !Number.isFinite(Date.parse(meta.createdAt))) throw new Error('ORDER_METADATA_UNAVAILABLE')
    if(!Number.isFinite(Number(meta.netPaymentSet.shopMoney.amount))) throw new Error('INVALID_PAYMENT_TOTAL')
    if(o.currencyCode!=='EUR' || meta.netPaymentSet.shopMoney.currencyCode!=='EUR') throw new Error('ORDER_CURRENCY_REQUIRES_CONVERSION')
    const paid=['PAID','PARTIALLY_PAID','PARTIALLY_REFUNDED','REFUNDED'].includes(o.displayFinancialStatus ?? '')
    const activeLines=o.lineItems.nodes.filter(l=>l.currentQuantity>0)
    const delivered=activeLines.length>0 && activeLines.every(line=>o.fulfillments.filter(f=>f.status==='SUCCESS' && f.displayStatus==='DELIVERED').reduce((sum,f)=>sum+f.fulfillmentLineItems.nodes.filter(l=>l.lineItem.id===line.id).reduce((n,l)=>n+l.quantity,0),0)>=line.currentQuantity)
    const physicalStatuses=new Set(['CARRIER_PICKED_UP','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','ATTEMPTED_DELIVERY'])
    const inTransport=(line:typeof activeLines[number])=>o.fulfillments.filter(f=>f.status==='SUCCESS' && physicalStatuses.has(f.displayStatus??'')).reduce((sum,f)=>sum+f.fulfillmentLineItems.nodes.filter(l=>l.lineItem.id===line.id).reduce((n,l)=>n+l.quantity,0),0)
    const allTransport=activeLines.length>0 && activeLines.every(l=>inTransport(l)>=l.currentQuantity)
    const someTransport=activeLines.some(l=>inTransport(l)>0)
    const status=o.cancelledAt ? 'cancelled' : delivered ? 'delivered' : allTransport ? 'shipped' : someTransport ? 'partially_shipped' : o.displayFulfillmentStatus==='FULFILLED' ? 'fulfilled' : 'processing'

    return {id:o.id, source:'shopify', name:o.name,email:meta.email ?? '', user_id:null,
      status, payment_status:(o.displayFinancialStatus ?? 'unknown').toLowerCase(),
      total:Number(o.currentTotalPriceSet.shopMoney.amount), currency:o.currencyCode,
      revenue:paid ? Number(meta.netPaymentSet.shopMoney.amount) : 0,
      paid_at:null,payment_method:'Shopify',delivery_method:'shipping',shipping_address:null,billing_address:null,
      payment_intent_id:null,tracking_code:o.fulfillments.filter(f=>f.status==='SUCCESS').flatMap(f=>f.trackingInfo).map(t=>t.number).filter(Boolean).join(', '),
      label_url:null,created_at:meta.createdAt,updated_at:o.updatedAt,checkout_started_at:null,
      production_status:'Productie niet afzonderlijk gemeld',
      shipping_status:o.fulfillments.filter(f=>f.status==='SUCCESS').map(f=>shipmentLabel(f.displayStatus)).join(' · ') || 'Nog geen verzendmelding',synced_at:row.synced_at,
      detail_url:'/admin/shopify/orders#'+o.id.split('/').pop()}
}
