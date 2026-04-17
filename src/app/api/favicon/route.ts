import { NextRequest, NextResponse } from 'next/server'
import { getSiteSettings } from '@/lib/settings'

/**
 * Dynamic Favicon Route
 * 
 * Serves the favicon from site settings with proper cache headers.
 * This ensures favicon updates are reflected immediately in browsers.
 * 
 * Why we need this:
 * - Browsers cache favicons EXTREMELY aggressively
 * - Query params (?v=123) don't always work
 * - This route forces proper cache control headers
 */
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString()
  console.log(`🎯 [FAVICON API] ========== REQUEST START ${timestamp} ==========`)
  console.log('🎯 [FAVICON API] Request URL:', request.url)
  console.log('🎯 [FAVICON API] Request headers:', Object.fromEntries(request.headers))
  
  try {
    // Get favicon URL from settings
    const settings = await getSiteSettings()
    console.log('🎯 [FAVICON API] Settings loaded:', {
      favicon_url: settings.favicon_url,
      updated_at: settings.updated_at,
      all_settings: Object.keys(settings)
    })
    
    const faviconUrl = settings.favicon_url || '/favicon.ico'
    console.log('🎯 [FAVICON API] Using favicon URL:', faviconUrl)
    
    // If it's a local path, fetch from public folder
    if (faviconUrl.startsWith('/')) {
      // Redirect to actual file with cache busting
      const cacheParam = settings.updated_at ? new Date(settings.updated_at).getTime() : Date.now()
      const url = `${faviconUrl}?v=${cacheParam}`
      console.log('🎯 [FAVICON API] Local path detected, redirecting to:', url)
      
      return NextResponse.redirect(new URL(url, request.url), {
        headers: {
          'Cache-Control': 'public, max-age=3600, must-revalidate',
          'CDN-Cache-Control': 'public, max-age=3600',
        }
      })
    }
    
    // If it's a full URL (Supabase storage), fetch and proxy it
    console.log('🎯 [FAVICON API] Full URL detected, fetching:', faviconUrl)
    const response = await fetch(faviconUrl)
    console.log('🎯 [FAVICON API] Fetch response:', {
      status: response.status,
      contentType: response.headers.get('content-type'),
      ok: response.ok
    })
    
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    console.log('🎯 [FAVICON API] Proxying favicon, size:', arrayBuffer.byteLength, 'bytes')
    
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/x-icon',
        'Cache-Control': 'public, max-age=3600, must-revalidate',
        'CDN-Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('❌ [FAVICON API] Error serving favicon:', error)
    
    // Fallback to default favicon
    console.log('🎯 [FAVICON API] Falling back to /favicon.ico')
    return NextResponse.redirect(new URL('/favicon.ico', request.url))
  }
}

export const dynamic = 'force-dynamic'

