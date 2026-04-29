import 'server-only'

import type { InstagramGraphMedia } from './types'

const GRAPH_VERSION = 'v22.0'
const GRAPH_HOST = `https://graph.facebook.com/${GRAPH_VERSION}`

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
