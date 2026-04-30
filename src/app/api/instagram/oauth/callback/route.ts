import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeForLongLivedFacebookToken,
  exchangeOAuthCodeForUserToken,
  fetchUserPagesWithInstagram,
  InstagramGraphError,
} from '@/lib/instagram/graph'
import {
  buildRedirectUri,
  createPendingPayload,
  OAUTH_PENDING_COOKIE,
  OAUTH_STATE_COOKIE,
  parseOAuthState,
  pendingCookieOptions,
} from '@/lib/instagram/oauth'
import { saveOAuthCredentials } from '@/lib/instagram/persistence'

export const dynamic = 'force-dynamic'

/**
 * GET /api/instagram/oauth/callback
 *
 * Facebook redirect ons hierheen na de OAuth-dialog met `?code=` en
 * `?state=`. Dit endpoint is publiek bereikbaar (Meta moet erbij), maar
 * wordt beveiligd door:
 *   - state cookie (HMAC-gesigneerd, alleen geset door /start = admin gated)
 *   - state-payload bevat admin user id (defense in depth)
 *
 * Flow:
 *   1. Validate state cookie + ?state=
 *   2. Exchange ?code= -> short-lived user token
 *   3. Wissel user token in voor long-lived (60 dagen)
 *   4. Haal alle pages op met IG Business Account
 *   5a. Geen kandidaten -> redirect met error
 *   5b. Eén kandidaat -> direct opslaan + redirect met success
 *   5c. Meerdere kandidaten -> pending cookie + redirect naar picker
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  const errorReason = url.searchParams.get('error_reason')
  const errorDescription = url.searchParams.get('error_description')

  // User cancelled de OAuth-dialog op Facebook.
  if (error) {
    return redirectAdmin(req, {
      status: 'error',
      reason: errorReason || error,
      message: errorDescription || 'OAuth geannuleerd op Facebook.',
    })
  }

  if (!code || !state) {
    return redirectAdmin(req, {
      status: 'error',
      reason: 'missing_params',
      message: 'OAuth callback miste code of state.',
    })
  }

  // Validate state via cookie (CSRF) en payload-signing (tamper-proof).
  const cookieState = req.cookies.get(OAUTH_STATE_COOKIE)?.value
  if (!cookieState || cookieState !== state) {
    return redirectAdmin(req, {
      status: 'error',
      reason: 'state_mismatch',
      message: 'OAuth state cookie matched niet. Probeer opnieuw.',
    })
  }
  const statePayload = parseOAuthState(state)
  if (!statePayload) {
    return redirectAdmin(req, {
      status: 'error',
      reason: 'invalid_state',
      message: 'OAuth state was ongeldig of verlopen. Probeer opnieuw.',
    })
  }

  // Exchange code -> short-lived user token. Belangrijk: dezelfde
  // redirect_uri als bij /start, anders blokt Meta.
  const origin = statePayload.origin || url.origin
  const redirectUri = buildRedirectUri(origin)

  let shortLivedToken: string
  try {
    const exchange = await exchangeOAuthCodeForUserToken(code, redirectUri)
    shortLivedToken = exchange.access_token
  } catch (err) {
    return redirectAdmin(req, {
      status: 'error',
      reason: 'code_exchange_failed',
      message: graphMessage(err, 'Code kon niet worden ingewisseld voor token.'),
    })
  }

  // Wissel in voor long-lived user token (60 dagen).
  let longLivedUserToken: string
  try {
    const longLived = await exchangeForLongLivedFacebookToken(shortLivedToken)
    longLivedUserToken = longLived.access_token
  } catch (err) {
    return redirectAdmin(req, {
      status: 'error',
      reason: 'token_extension_failed',
      message: graphMessage(err, 'Long-lived token-uitwissel mislukt.'),
    })
  }

  // Haal pages + IG Business Accounts op.
  let candidates
  try {
    candidates = await fetchUserPagesWithInstagram(longLivedUserToken)
  } catch (err) {
    return redirectAdmin(req, {
      status: 'error',
      reason: 'pages_fetch_failed',
      message: graphMessage(err, 'Kon pages niet ophalen van Facebook.'),
    })
  }

  if (candidates.length === 0) {
    return redirectAdmin(req, {
      status: 'error',
      reason: 'no_ig_account',
      message:
        'Geen Instagram Business Account gevonden op je Facebook-pages. Koppel je Instagram in Meta Business Suite.',
    })
  }

  // Eén kandidaat -> direct opslaan, geen picker.
  if (candidates.length === 1) {
    const choice = candidates[0]
    const saveError = await saveOAuthCredentials(choice)
    const res = redirectAdmin(req, {
      status: saveError ? 'error' : 'connected',
      ...(saveError ? { reason: 'save_failed', message: saveError } : {}),
    })
    res.cookies.delete(OAUTH_STATE_COOKIE)
    res.cookies.delete(OAUTH_PENDING_COOKIE)
    return res
  }

  // Multi-page: pending cookie zetten en naar picker redirecten.
  const pending = createPendingPayload({
    longLivedUserToken,
    candidates,
    adminUserId: statePayload.adminUserId,
  })
  const res = redirectAdmin(req, { status: 'pick' })
  res.cookies.set(OAUTH_PENDING_COOKIE, pending, pendingCookieOptions())
  res.cookies.delete(OAUTH_STATE_COOKIE)
  return res
}

// =====================================================
// Helpers
// =====================================================

function redirectAdmin(
  req: NextRequest,
  query: { status: string; reason?: string; message?: string }
): NextResponse {
  const origin = new URL(req.url).origin
  const dest = new URL('/admin/instagram', origin)
  dest.searchParams.set('oauth', query.status)
  if (query.reason) dest.searchParams.set('reason', query.reason)
  if (query.message) dest.searchParams.set('message', query.message)
  return NextResponse.redirect(dest, 302)
}

function graphMessage(err: unknown, fallback: string): string {
  if (err instanceof InstagramGraphError) return err.message
  if (err instanceof Error) return err.message
  return fallback
}
