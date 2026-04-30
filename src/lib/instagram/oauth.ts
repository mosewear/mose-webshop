import 'server-only'

import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import {
  FACEBOOK_OAUTH_DIALOG,
  type FacebookPageWithInstagram,
} from './graph'

/**
 * "Connect with Instagram" OAuth flow helpers.
 *
 * We gebruiken het klassieke server-side OAuth-pad ("Web OAuth login"
 * in de Meta App Settings, default aan). Dat vereist GEEN Facebook
 * Login Configuration en GEEN JS SDK. Alleen:
 *   1. Onze redirect_uri staat in "Valid OAuth Redirect URIs"
 *   2. We hebben META_APP_ID en META_APP_SECRET in env (productie + preview)
 *
 * State + pending payloads worden HMAC-gesigneerd met META_APP_SECRET.
 * Dat is geen losse JWT-lib (te zwaar voor één feature) en het secret
 * is sowieso server-only beschikbaar.
 */

// Permissies die we vragen tijdens de OAuth-dialog. Komt overeen met
// de scopes die in de Meta App use case zijn aangezet.
export const INSTAGRAM_OAUTH_SCOPES = [
  'instagram_basic',
  'pages_show_list',
  'pages_read_engagement',
  'business_management',
] as const

// Cookie-namen.
export const OAUTH_STATE_COOKIE = 'mose_ig_oauth_state'
export const OAUTH_PENDING_COOKIE = 'mose_ig_oauth_pending'

// Cookie-options voor zowel state als pending payloads. SameSite=Lax
// blijft behouden bij top-level redirects van facebook.com terug naar
// onze callback - dat is wat we nodig hebben.
const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
}

const STATE_COOKIE_MAX_AGE = 10 * 60 // 10 minuten
const PENDING_COOKIE_MAX_AGE = 15 * 60 // 15 minuten

export const stateCookieOptions = (maxAge = STATE_COOKIE_MAX_AGE) => ({
  ...COOKIE_BASE,
  maxAge,
})

export const pendingCookieOptions = (maxAge = PENDING_COOKIE_MAX_AGE) => ({
  ...COOKIE_BASE,
  maxAge,
})

// =====================================================
// Signing helpers
// =====================================================

function getSigningKey(): string {
  const secret = process.env.META_APP_SECRET
  if (!secret) {
    throw new Error(
      'META_APP_SECRET ontbreekt - vereist voor het signen van OAuth state.'
    )
  }
  return secret
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return buf.toString('base64url')
}

function fromBase64url(input: string): Buffer {
  return Buffer.from(input, 'base64url')
}

export function signPayload(payload: object): string {
  const json = JSON.stringify(payload)
  const data = base64url(json)
  const sig = base64url(
    createHmac('sha256', getSigningKey()).update(data).digest()
  )
  return `${data}.${sig}`
}

export function verifyPayload<T>(token: string | undefined | null): T | null {
  if (!token || typeof token !== 'string') return null
  const dot = token.indexOf('.')
  if (dot <= 0 || dot === token.length - 1) return null
  const data = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = base64url(
    createHmac('sha256', getSigningKey()).update(data).digest()
  )
  // timingSafeEqual werkt alleen op gelijke buffers
  const a = Buffer.from(sig, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) return null
  if (!timingSafeEqual(a, b)) return null
  try {
    return JSON.parse(fromBase64url(data).toString('utf8')) as T
  } catch {
    return null
  }
}

// =====================================================
// State (CSRF + admin-binding)
// =====================================================

export interface OAuthStatePayload {
  // CSRF nonce - moet matchen tussen cookie en ?state= bij callback.
  nonce: string
  // Admin user ID die de flow startte. Defense in depth bij callback.
  adminUserId: string
  // Origin waar /start vandaan kwam, zodat callback dezelfde redirect_uri
  // kan reconstrueren (Facebook eist exact match).
  origin: string
  // Issued-at timestamp (ms). Verloopt na STATE_COOKIE_MAX_AGE.
  iat: number
}

export function createOAuthState(adminUserId: string, origin: string): {
  state: string
  payload: OAuthStatePayload
} {
  const payload: OAuthStatePayload = {
    nonce: randomBytes(24).toString('base64url'),
    adminUserId,
    origin,
    iat: Date.now(),
  }
  return { state: signPayload(payload), payload }
}

export function parseOAuthState(value: string | undefined | null): OAuthStatePayload | null {
  const decoded = verifyPayload<OAuthStatePayload>(value)
  if (!decoded) return null
  if (!decoded.nonce || !decoded.adminUserId || !decoded.origin) return null
  if (Date.now() - decoded.iat > STATE_COOKIE_MAX_AGE * 1000) return null
  return decoded
}

// =====================================================
// Pending payload (multi-page picker)
// =====================================================

export interface OAuthPendingPayload {
  // Long-lived user token, nodig om straks per gekozen page de juiste
  // page-token te kunnen pakken. Wordt na finalize meteen vergeten.
  longLivedUserToken: string
  // Lijst kandidaten waar admin uit kiest.
  candidates: FacebookPageWithInstagram[]
  // Admin user die mag finaliseren.
  adminUserId: string
  iat: number
}

export function createPendingPayload(
  data: Omit<OAuthPendingPayload, 'iat'>
): string {
  return signPayload({ ...data, iat: Date.now() })
}

export function parsePendingPayload(
  value: string | undefined | null
): OAuthPendingPayload | null {
  const decoded = verifyPayload<OAuthPendingPayload>(value)
  if (!decoded) return null
  if (!decoded.longLivedUserToken || !Array.isArray(decoded.candidates)) return null
  if (Date.now() - decoded.iat > PENDING_COOKIE_MAX_AGE * 1000) return null
  return decoded
}

// =====================================================
// Public-facing helpers
// =====================================================

export function buildAuthorizeUrl(state: string, redirectUri: string): string {
  const appId = process.env.META_APP_ID
  if (!appId) {
    throw new Error('META_APP_ID ontbreekt - kan OAuth-dialog niet starten.')
  }
  const url = new URL(FACEBOOK_OAUTH_DIALOG)
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', INSTAGRAM_OAUTH_SCOPES.join(','))
  url.searchParams.set('state', state)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('display', 'page')
  return url.toString()
}

// Reconstrueer de redirect_uri die we bij /start hebben meegegeven aan
// Facebook. Moet karakter-voor-karakter matchen, anders gooit Meta een
// "URL Blocked" error.
export function buildRedirectUri(origin: string): string {
  // Strip trailing slash en garandeer canonieke vorm.
  const cleanOrigin = origin.replace(/\/+$/, '')
  return `${cleanOrigin}/api/instagram/oauth/callback`
}
