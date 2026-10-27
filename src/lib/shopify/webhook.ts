import { createHmac, timingSafeEqual } from 'node:crypto'
import { SHOPIFY_STORE } from './policy'

export const WEBHOOK_TOPICS = new Set([
  'orders/create', 'orders/updated', 'orders/paid', 'orders/cancelled',
  'refunds/create', 'fulfillments/create', 'fulfillments/update',
  'products/update', 'products/delete', 'app/uninstalled',
])

export function verifyWebhook(raw: Uint8Array, signature: string | null, secret: string): boolean {
  if (!secret || !signature || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false
  const supplied = Buffer.from(signature, 'base64')
  const expected = createHmac('sha256', secret).update(raw).digest()
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

export function webhookEnvelope(headers: Headers) {
  const shop = headers.get('x-shopify-shop-domain')
  const topic = headers.get('x-shopify-topic')
  const deliveryId = headers.get('x-shopify-webhook-id')
  if (shop !== SHOPIFY_STORE || !topic || !WEBHOOK_TOPICS.has(topic) ||
      !deliveryId || !/^[a-zA-Z0-9_-]{16,128}$/.test(deliveryId)) return null
  return { shop, topic, delivery_id: deliveryId, event_id: headers.get('x-shopify-event-id')?.slice(0, 128) ?? null }
}
