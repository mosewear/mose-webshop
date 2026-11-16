import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { admin } from './client'
import { fetchOrderProjection, orderSchema } from './orders'
import { toShopifyOrderView } from './order-views'

const address = z.object({
  name: z.string().nullable(),
  company: z.string().nullable(),
  address1: z.string().nullable(),
  address2: z.string().nullable(),
  zip: z.string().nullable(),
  city: z.string().nullable(),
  countryCodeV2: z.string().nullable(),
  phone: z.string().nullable(),
})

const contact = z.object({
  id: z.string(),
  email: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  shippingAddress: address.nullable(),
  billingAddress: address.nullable(),
})

const CONTACT = `query MoseAdminOrderContact($id: ID!) {
  order(id: $id) {
    id email createdAt
    shippingAddress { name company address1 address2 zip city countryCodeV2 phone }
    billingAddress { name company address1 address2 zip city countryCodeV2 phone }
  }
}`

export const shopifyOrderNumber = /^\d{1,20}$/

export async function readShopifyAdminOrder(number: string) {
  if (!shopifyOrderNumber.test(number)) return null
  const id = 'gid://shopify/Order/' + number
  const db = createServiceClient()
  const [snapshot, owners, liveContact] = await Promise.all([
    db.from('shopify_order_snapshots').select('snapshot,synced_at').eq('shopify_order_id', id).maybeSingle(),
    db.from('shopify_order_lines').select('line_id,fulfillment_owner').eq('order_id', id),
    admin<{ order: unknown }>(CONTACT, { id }).catch(() => undefined),
  ])
  if (snapshot.error || owners.error) throw new Error('ORDER_DETAIL_UNAVAILABLE')
  if (!snapshot.data && liveContact?.order === null) return null
  if (!snapshot.data && !liveContact) throw new Error('ORDER_DETAIL_UNAVAILABLE')

  const details = liveContact?.order ? contact.parse(liveContact.order) : null
  if (details && details.id !== id) throw new Error('ORDER_ID_MISMATCH')

  const order = snapshot.data ? orderSchema.parse(snapshot.data.snapshot) : await fetchOrderProjection(id)
  if (order.id !== id) throw new Error('ORDER_ID_MISMATCH')
  const view = toShopifyOrderView(
    { snapshot: order, synced_at: snapshot.data?.synced_at ?? order.updatedAt },
    owners.data ?? [],
    'admin',
  )
  return {
    ...view,
    email: details ? details.email : order.email ?? null,
    createdAt: details?.createdAt ?? order.createdAt ?? null,
    shippingAddress: details?.shippingAddress ?? null,
    billingAddress: details?.billingAddress ?? null,
    contactAvailable: Boolean(details),
    items: order.lineItems.nodes,
  }
}

export type ShopifyAdminOrder = NonNullable<Awaited<ReturnType<typeof readShopifyAdminOrder>>>

export function canCreateShopifyReturnLabel(order: ShopifyAdminOrder) {
  return !order.cancelled && ['PAID', 'PARTIALLY_REFUNDED'].includes(order.financialStatus)
    && order.shippingAddress?.countryCodeV2 === 'NL' && Boolean(order.email)
    && order.lines.some(line => line.shippedQuantity > 0 && line.currentQuantity > 0 && line.owner !== 'digital')
}
