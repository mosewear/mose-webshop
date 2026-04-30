import 'server-only'

import type { InstagramGraphMedia } from './types'

const GRAPH_VERSION = 'v22.0'
const GRAPH_HOST = `https://graph.facebook.com/${GRAPH_VERSION}`

export const FACEBOOK_GRAPH_VERSION = GRAPH_VERSION
export const FACEBOOK_GRAPH_HOST = GRAPH_HOST
export const FACEBOOK_OAUTH_DIALOG = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`

const MEDIA_FIELDS = [
  'id',
  'permalink',
  'media_type',
  'media_url',
  'thumbnail_url',
  'caption',
  'like_count',
  'timestamp',
].join(',')

export class InstagramGraphError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.name = 'InstagramGraphError'
    this.status = status
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    // ignore parse failure, status will be reported below
  }
  if (!res.ok) {
    const errLike = body as
      | { error?: { message?: string } | string; error_description?: string }
      | null
    const messageFromError =
      typeof errLike?.error === 'object'
        ? errLike?.error?.message
        : typeof errLike?.error === 'string'
        ? errLike?.error
        : undefined
    const message =
      messageFromError ||
      errLike?.error_description ||
      `Instagram Graph request failed (${res.status})`
    throw new InstagramGraphError(String(message), res.status)
  }
  return body as T
}

export async function fetchRecentMedia(
  token: string,
  businessAccountId: string,
  limit = 24
): Promise<InstagramGraphMedia[]> {
  if (!token || !businessAccountId) {
    throw new InstagramGraphError('Missing Instagram token or business account id', 400)
  }
  const url =
    `${GRAPH_HOST}/${encodeURIComponent(businessAccountId)}/media` +
    `?fields=${encodeURIComponent(MEDIA_FIELDS)}` +
    `&limit=${encodeURIComponent(String(limit))}` +
    `&access_token=${encodeURIComponent(token)}`

  const data = await fetchJson<{ data: InstagramGraphMedia[] }>(url)
  return Array.isArray(data?.data) ? data.data : []
}

export async function fetchAccountInfo(
  token: string,
  businessAccountId: string
): Promise<{ id: string; username: string; name?: string }> {
  const url =
    `${GRAPH_HOST}/${encodeURIComponent(businessAccountId)}` +
    `?fields=id,username,name` +
    `&access_token=${encodeURIComponent(token)}`
  return fetchJson(url)
}

export interface RefreshedToken {
  access_token: string
  token_type: string
  expires_in: number
}

// Refresh een long-lived Instagram-token (geldig nog ~30+ dagen).
// Werkt voor Instagram Basic Display tokens; voor Instagram Graph API
// (Business) verlengen we via de Facebook OAuth-route met app secret.
export async function refreshLongLivedToken(token: string): Promise<RefreshedToken> {
  if (!token) {
    throw new InstagramGraphError('Missing Instagram token', 400)
  }
  const url =
    `https://graph.instagram.com/refresh_access_token` +
    `?grant_type=ig_refresh_token` +
    `&access_token=${encodeURIComponent(token)}`
  return fetchJson<RefreshedToken>(url)
}

// Verleng een Facebook-page-token (gebruikt door Instagram Graph
// API / Business). Vereist META_APP_ID + META_APP_SECRET in env.
export async function exchangeForLongLivedFacebookToken(
  token: string
): Promise<RefreshedToken> {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) {
    throw new InstagramGraphError(
      'META_APP_ID / META_APP_SECRET not configured',
      503
    )
  }
  const url =
    `${GRAPH_HOST}/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${encodeURIComponent(appId)}` +
    `&client_secret=${encodeURIComponent(appSecret)}` +
    `&fb_exchange_token=${encodeURIComponent(token)}`
  return fetchJson<RefreshedToken>(url)
}

// =====================================================
// OAuth helpers (Connect with Instagram knop)
// =====================================================

export interface OAuthCodeExchangeResponse {
  access_token: string
  token_type: string
  expires_in?: number
}

// Wissel de `?code=...` van de OAuth callback in voor een short-lived
// User Access Token. Vereist exact dezelfde redirect_uri als bij /start.
export async function exchangeOAuthCodeForUserToken(
  code: string,
  redirectUri: string
): Promise<OAuthCodeExchangeResponse> {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) {
    throw new InstagramGraphError(
      'META_APP_ID / META_APP_SECRET not configured',
      503
    )
  }
  const url =
    `${GRAPH_HOST}/oauth/access_token` +
    `?client_id=${encodeURIComponent(appId)}` +
    `&client_secret=${encodeURIComponent(appSecret)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&code=${encodeURIComponent(code)}`
  return fetchJson<OAuthCodeExchangeResponse>(url)
}

export interface FacebookPageWithInstagram {
  page_id: string
  page_name: string
  page_access_token: string
  ig_business_account_id: string
  ig_username: string
}

export interface PagesDiagnostics {
  // Alle pages die een gekoppeld Instagram Business Account hebben.
  candidates: FacebookPageWithInstagram[]
  // Aantal pages dat /me/accounts überhaupt teruggaf.
  totalPages: number
  // Pages zonder IG-koppeling, voor een betere foutmelding.
  pagesWithoutIg: { id: string; name: string }[]
  // Permissies die de user wél/niet gaf tijdens de OAuth-dialog.
  grantedScopes: string[]
  declinedScopes: string[]
}

interface MeAccountsRow {
  id: string
  name?: string
  access_token: string
  instagram_business_account?: { id: string }
}

interface PageWithIgRow {
  instagram_business_account?: {
    id: string
    username?: string
    name?: string
  } | null
}

interface PermissionRow {
  permission: string
  status: 'granted' | 'declined' | 'expired'
}

async function fetchUserPermissions(userToken: string): Promise<{
  granted: string[]
  declined: string[]
}> {
  try {
    const url =
      `${GRAPH_HOST}/me/permissions` +
      `?access_token=${encodeURIComponent(userToken)}`
    const result = await fetchJson<{ data: PermissionRow[] }>(url)
    const rows = Array.isArray(result?.data) ? result.data : []
    return {
      granted: rows.filter((r) => r.status === 'granted').map((r) => r.permission),
      declined: rows
        .filter((r) => r.status === 'declined' || r.status === 'expired')
        .map((r) => r.permission),
    }
  } catch {
    return { granted: [], declined: [] }
  }
}

// Haal alle Facebook-pages op die de ingelogde user beheert + per page
// het direct meegegeven (al long-lived) Page Access Token. We krijgen
// een diagnostisch object terug zodat de callback bij 0 kandidaten
// precies kan vertellen waarom (geen pages, geen IG, of permissies
// uitgevinkt).
export async function fetchUserPagesWithInstagram(
  userToken: string
): Promise<PagesDiagnostics> {
  if (!userToken) {
    throw new InstagramGraphError('Missing user access token', 400)
  }

  // Permissies parallel ophalen - verwerken we pas als er 0 kandidaten
  // zijn, maar we doen het meteen om geen extra round-trip te krijgen.
  const permissionsPromise = fetchUserPermissions(userToken)

  const accountsUrl =
    `${GRAPH_HOST}/me/accounts` +
    `?fields=${encodeURIComponent('id,name,access_token,instagram_business_account')}` +
    `&limit=100` +
    `&access_token=${encodeURIComponent(userToken)}`
  const accounts = await fetchJson<{ data: MeAccountsRow[] }>(accountsUrl)
  const rows = Array.isArray(accounts?.data) ? accounts.data : []

  const candidates: FacebookPageWithInstagram[] = []
  const pagesWithoutIg: { id: string; name: string }[] = []

  for (const row of rows) {
    if (!row.instagram_business_account?.id) {
      pagesWithoutIg.push({ id: row.id, name: row.name || row.id })
      continue
    }
    // Detail-call om username erbij te halen (handig voor de admin-UI).
    const detailUrl =
      `${GRAPH_HOST}/${encodeURIComponent(row.id)}` +
      `?fields=${encodeURIComponent('instagram_business_account{id,username,name}')}` +
      `&access_token=${encodeURIComponent(row.access_token)}`
    let username = ''
    try {
      const detail = await fetchJson<PageWithIgRow>(detailUrl)
      username = detail?.instagram_business_account?.username || ''
    } catch {
      // detail-fetch mag falen, we hebben tenminste de basis-id
    }
    candidates.push({
      page_id: row.id,
      page_name: row.name || row.id,
      page_access_token: row.access_token,
      ig_business_account_id: row.instagram_business_account.id,
      ig_username: username,
    })
  }

  const permissions = await permissionsPromise

  return {
    candidates,
    totalPages: rows.length,
    pagesWithoutIg,
    grantedScopes: permissions.granted,
    declinedScopes: permissions.declined,
  }
}
