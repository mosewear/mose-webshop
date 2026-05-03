import { NextResponse } from 'next/server'
import { getInstagramFeedData } from '@/lib/instagram/feed'

/**
 * Public read-only Instagram-feed endpoint. Returneert dezelfde shape
 * als getInstagramFeedData() (enabled / settings / posts) zodat client
 * components (zoals het mobiele menu) de feed kunnen renderen zonder
 * een server-component nodig te hebben.
 *
 * Caching:
 *  - getInstagramFeedData wrapt unstable_cache met `revalidate: 300`
 *    en de tag INSTAGRAM_FEED_TAG, dus deze route hergebruikt diezelfde
 *    cache. We zetten ook expliciete s-maxage / stale-while-revalidate
 *    headers zodat browser- en CDN-cache eveneens kort cachen.
 *  - We tonen GEEN credentials, secrets of admin-only velden (de
 *    InstagramDisplaySettings shape bevat enkel publieke display-info).
 *
 * Foutgedrag:
 *  - Bij een crash returnen we 200 + lege payload (enabled:false), zodat
 *    de client component netjes "geen content" rendert i.p.v. te falen.
 *    Echte fouten worden in lib/instagram/feed.ts al gelogd.
 */
export async function GET() {
  try {
    const data = await getInstagramFeedData()
    return NextResponse.json(data, {
      headers: {
        // Caching: laat browser én Vercel/CDN 5 minuten cachen, en
        // tot een uur stale-while-revalidate gebruiken zodat gebruikers
        // nooit op een lege response wachten als de Supabase-fetch
        // ergens hapert.
        'Cache-Control':
          'public, s-maxage=300, stale-while-revalidate=3600, max-age=60',
      },
    })
  } catch (err) {
    console.error('[api/instagram/feed] Unexpected error:', err)
    return NextResponse.json(
      { enabled: false, settings: null, posts: [] },
      { status: 200 }
    )
  }
}
