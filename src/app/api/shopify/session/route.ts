import { NextRequest, NextResponse } from 'next/server'
import { newShopifySession, SHOPIFY_SESSION_COOKIE, validShopifySession } from '@/lib/shopify/session'
export const runtime = 'nodejs'

/** Must be acknowledged by the browser BEFORE any cart mutation is attempted. */
export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' }
  if (request.headers.get('sec-fetch-site') === 'cross-site') return new NextResponse('Forbidden', { status: 403, headers })
  let origin: string
  try { origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mosewear.com').origin } catch {
    return new NextResponse('Not configured', { status: 503, headers })
  }
  const suppliedOrigin = request.headers.get('origin')
  if (suppliedOrigin && suppliedOrigin !== origin) return new NextResponse('Forbidden', { status: 403, headers })
  const current = request.cookies.get(SHOPIFY_SESSION_COOKIE)?.value
  const response = NextResponse.json({ ready: true }, { headers })
  response.cookies.set(SHOPIFY_SESSION_COOKIE, validShopifySession(current) ? current : newShopifySession(), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 86400,
  })
  return response
}
