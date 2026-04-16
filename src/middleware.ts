import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

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

  return intlMiddleware(request)
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next`, `/_vercel`, or `/admin`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: [
    '/((?!api|_next|_vercel|admin|.*\\..*).*)',
  ],
}
