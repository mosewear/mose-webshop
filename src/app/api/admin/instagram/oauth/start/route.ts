import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import {
  buildAuthorizeUrl,
  buildRedirectUri,
  createOAuthState,
  OAUTH_STATE_COOKIE,
  stateCookieOptions,
} from '@/lib/instagram/oauth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/instagram/oauth/start
 *
 * Genereert een gesigneerde state, zet die in een httpOnly cookie en
 * stuurt de browser door naar Facebook's OAuth-dialog. De button in
 * /admin/instagram navigeert direct naar deze URL (geen fetch), zodat
 * de browser de OAuth-flow kan voltooien.
 */
export async function GET(req: NextRequest) {
  const { authorized, adminUser } = await requireAdmin(['admin', 'manager'])
  if (!authorized || !adminUser) {
    return NextResponse.json(
      { success: false, error: 'Niet geautoriseerd' },
      { status: 403 }
    )
  }

  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
    return NextResponse.json(
      {
        success: false,
        error:
          'META_APP_ID of META_APP_SECRET ontbreekt in env. Stel deze eerst in via Vercel.',
      },
      { status: 503 }
    )
  }

  const origin = new URL(req.url).origin
  const redirectUri = buildRedirectUri(origin)
  const { state } = createOAuthState(adminUser.id, origin)

  const authorizeUrl = buildAuthorizeUrl(state, redirectUri)

  const res = NextResponse.redirect(authorizeUrl, 302)
  res.cookies.set(OAUTH_STATE_COOKIE, state, stateCookieOptions())
  return res
}
