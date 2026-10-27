import { randomBytes } from 'node:crypto'
export const SHOPIFY_SESSION_COOKIE = 'mose_shopify_session'
export function validShopifySession(value: string | undefined): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
}
export function newShopifySession(): string { return randomBytes(32).toString('hex') }
