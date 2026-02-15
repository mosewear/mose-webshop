import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_HOSTS = new Set([
  'bsklcgeyvdsxjxvmghbp.supabase.co',
  'www.mosewear.com',
  'mosewear.com',
])

export async function GET(req: NextRequest) {
  try {
    const src = req.nextUrl.searchParams.get('src')
    if (!src) {
      return NextResponse.json({ error: 'Missing src' }, { status: 400 })
    }

    let parsed: URL
    try {
      parsed = new URL(src)
    } catch {
      return NextResponse.json({ error: 'Invalid src URL' }, { status: 400 })
    }

    if (!ALLOWED_HOSTS.has(parsed.hostname)) {
      return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
    }

    const upstream = await fetch(parsed.toString(), { cache: 'no-store' })
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Image fetch failed' }, { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    const body = await upstream.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 })
  }
}

