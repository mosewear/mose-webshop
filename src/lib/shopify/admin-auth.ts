import { createHash } from 'node:crypto'
import { SHOPIFY_STORE } from './policy'
import { ShopifyUnavailable } from './errors'

type Token = { value: string; expiresAt: number }
let cached: { key: string; token: Token } | undefined
let pending: { key: string; promise: Promise<Token> } | undefined

/** A legacy offline token or credentials for an installed app in this store's own organization. */
export function adminCredentialsConfigured() {
  return Boolean(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ||
    (process.env.SHOPIFY_APP_CLIENT_ID && process.env.SHOPIFY_APP_CLIENT_SECRET))
}

export async function getAdminAccessToken(): Promise<string> {
  if (typeof window !== 'undefined') throw new Error('SERVER_ONLY')
  const legacy = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
  if (legacy) return legacy
  const clientId = process.env.SHOPIFY_APP_CLIENT_ID
  const secret = process.env.SHOPIFY_APP_CLIENT_SECRET
  if (!clientId || !secret) throw new ShopifyUnavailable('SHOPIFY_ADMIN_NOT_CONFIGURED')
  const key = createHash('sha256').update(JSON.stringify([SHOPIFY_STORE, clientId, secret])).digest('hex')
  if (cached?.key === key && cached.token.expiresAt > Date.now() + 60_000) return cached.token.value
  // Deduplicate exchanges in one server process. Serverless instances have independent caches.
  if (pending?.key === key) return (await pending.promise).value
  const exchange = (async (): Promise<Token> => {
    const startedAt = Date.now()
    let response: Response
    try {
      response = await fetch(`https://${SHOPIFY_STORE}/admin/oauth/access_token`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: secret }),
        cache: 'no-store', signal: AbortSignal.timeout(12_000), redirect: 'error',
      })
    } catch { throw new ShopifyUnavailable('SHOPIFY_AUTH_UNAVAILABLE') }
    if (response.status === 429) throw new ShopifyUnavailable('SHOPIFY_THROTTLED')
    if ([400, 401, 403].includes(response.status)) throw new ShopifyUnavailable('SHOPIFY_ACCESS_DENIED')
    if (!response.ok) throw new ShopifyUnavailable('SHOPIFY_AUTH_UNAVAILABLE')
    let result: { access_token?: unknown; expires_in?: unknown }
    try { result = await response.json() } catch { throw new ShopifyUnavailable('SHOPIFY_AUTH_INVALID_RESPONSE') }
    if (typeof result.access_token !== 'string' || !result.access_token.trim() ||
      typeof result.expires_in !== 'number' || !Number.isSafeInteger(result.expires_in) ||
      result.expires_in <= 60 || result.expires_in > 86_400) throw new ShopifyUnavailable('SHOPIFY_AUTH_INVALID_RESPONSE')
    return { value: result.access_token, expiresAt: startedAt + result.expires_in * 1000 }
  })()
  pending = { key, promise: exchange }
  try {
    const token = await exchange
    // A previous credentials exchange may finish after a newer one. Never overwrite that cache.
    if (pending?.promise === exchange) cached = { key, token }
    return token.value
  } finally {
    if (pending?.promise === exchange) pending = undefined
  }
}
