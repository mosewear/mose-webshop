import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { admin } from './client'
import { fetchOrderProjection } from './orders'
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
  const response = await admin<{ order: unknown }>(CONTACT, { id })
  if (!response.order) return null
  const details = contact.parse(response.order)
  if (details.id !== id) throw new Error('ORDER_ID_MISMATCH')

  const [order, owners] = await Promise.all([
    fetchOrderProjection(id),
    db.from('shopify_order_lines').select('line_id,fulfillment_owner').eq('order_id', id),
  ])
  if (owners.error) throw new Error('ORDER_ROUTING_UNAVAILABLE')
  const view = toShopifyOrderView({ snapshot: order, synced_at: order.updatedAt }, owners.data ?? [], 'admin')
  return { ...details, ...view, items: order.lineItems.nodes, refunds: order.refunds }
}

export type ShopifyAdminOrder = NonNullable<Awaited<ReturnType<typeof readShopifyAdminOrder>>>

export function canCreateShopifyReturnLabel(order: ShopifyAdminOrder) {
  return !order.cancelled && ['PAID', 'PARTIALLY_REFUNDED'].includes(order.financialStatus)
    && order.shippingAddress?.countryCodeV2 === 'NL' && Boolean(order.email)
    && order.lines.some(line => line.shippedQuantity > 0 && line.currentQuantity > 0 && line.owner !== 'digital')
}
