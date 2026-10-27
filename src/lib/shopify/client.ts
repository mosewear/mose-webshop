import { isIP } from 'node:net'
import { SHOPIFY_API_VERSION, SHOPIFY_STORE } from './policy'

export class ShopifyUnavailable extends Error {
  constructor(public readonly code: string) { super(code); this.name = 'ShopifyUnavailable' }
}

/** Server only. Never reuse the interactive CLI's user token for production. */
export async function storefront<T>(query: string, variables: Record<string, unknown>, buyerIp: string): Promise<T> {
  if (typeof window !== 'undefined') throw new Error('SERVER_ONLY')
  const token = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN
  if (!token || !isIP(buyerIp)) throw new ShopifyUnavailable('SHOPIFY_NOT_CONFIGURED')
  const response = await fetch(`https://${SHOPIFY_STORE}/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Shopify-Storefront-Private-Token': token,
      'Shopify-Storefront-Buyer-IP': buyerIp,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) throw new ShopifyUnavailable('SHOPIFY_HTTP_ERROR')
  const result = await response.json() as { data?: T; errors?: unknown[] }
  if (result.errors?.length || !result.data) throw new ShopifyUnavailable('SHOPIFY_QUERY_FAILED')
  return result.data
}

/** Production offline Admin token only; never a CLI session or browser credential. */
export async function admin<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  if (typeof window !== 'undefined') throw new Error('SERVER_ONLY')
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
  if (!token) throw new ShopifyUnavailable('SHOPIFY_ADMIN_NOT_CONFIGURED')
  const response = await fetch(`https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }), cache: 'no-store', signal: AbortSignal.timeout(15_000),
  })
  if (response.status === 429) throw new ShopifyUnavailable('SHOPIFY_THROTTLED')
  if (response.status === 401 || response.status === 403) throw new ShopifyUnavailable('SHOPIFY_ACCESS_DENIED')
  if (!response.ok) throw new ShopifyUnavailable('SHOPIFY_HTTP_ERROR')
  const result = await response.json() as { data?: T; errors?: { extensions?: { code?: string } }[] }
  if (result.errors?.some(e => e.extensions?.code === 'THROTTLED')) throw new ShopifyUnavailable('SHOPIFY_THROTTLED')
  if (result.errors?.length || !result.data) throw new ShopifyUnavailable('SHOPIFY_QUERY_FAILED')
  return result.data
}
