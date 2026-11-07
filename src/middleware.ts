import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'
import { resolveMoseCountry } from './lib/shopify/us-market'

const intlMiddleware = createMiddleware(routing)

export default function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''

  // Redirect mosewear.com (non-www) → www.mosewear.com
  // API routes are excluded by the matcher below, so webhooks are unaffected
  if (hostname === 'mosewear.com' || hostname === 'www.mosewear.nl' || hostname === 'mosewear.nl') {
    const url = request.nextUrl.clone()
    url.hostname = 'www.mosewear.com'
    url.host = 'www.mosewear.com'
    url.protocol = 'https'
    url.port = ''
    return NextResponse.redirect(url, 308)
  }

  // A visitor's explicit /nl or /en URL always wins. On unprefixed URLs,
  // prefer their manual language choice; otherwise use Vercel's country header.
  // The IP is only a language hint, never shipping or payment authorization.
  const pathname = request.nextUrl.pathname
  const hasExplicitLocale = /^\/(?:nl|en)(?:\/|$)/.test(pathname)
  const manualLocale = request.cookies.get('NEXT_LOCALE')?.value
  const geoCountry = request.headers.get('x-vercel-ip-country')?.trim().toUpperCase()
  let response: NextResponse
  if (!hasExplicitLocale) {
    const locale = manualLocale === 'nl' || manualLocale === 'en'
      ? manualLocale
      : !geoCountry || geoCountry === 'NL' || geoCountry === 'BE' ? 'nl' : 'en'
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
    response = NextResponse.redirect(url, 307)
  } else {
    response = intlMiddleware(request)
  }
  // Only enable geographic discovery on an approved market rollout.
  // A user's own country selection in this cookie takes precedence over IP hints.
  const usMarketEnabled = process.env.NEXT_PUBLIC_MOSE_US_MARKET_ENABLED === 'true'
  if (!['NL', 'BE', ...(usMarketEnabled ? ['US'] : [])].includes(request.cookies.get('mose-country')?.value ?? '')) {
    const country = resolveMoseCountry(undefined, request.headers.get('x-vercel-ip-country'), true)
    response.cookies.set('mose-country', country, { path: '/', sameSite: 'lax', secure: true, maxAge: 60 * 60 * 24 * 30 })
  }
  return response
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next`, `/_vercel`, or `/admin`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: [
    '/((?!api|_next|_vercel|admin|.*\\..*).*)',
  ],
}
