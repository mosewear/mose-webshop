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
  try {
    // Get favicon URL from settings
    const settings = await getSiteSettings()
    const faviconUrl = settings.favicon_url || '/favicon.ico'
    
    // If it's a local path, fetch from public folder
    if (faviconUrl.startsWith('/')) {
      // Redirect to actual file with cache busting
      const cacheParam = settings.updated_at ? new Date(settings.updated_at).getTime() : Date.now()
      const url = `${faviconUrl}?v=${cacheParam}`
      
      return NextResponse.redirect(new URL(url, request.url), {
        headers: {
          'Cache-Control': 'public, max-age=3600, must-revalidate',
          'CDN-Cache-Control': 'public, max-age=3600',
        }
      })
    }
    
    // If it's a full URL (Supabase storage), fetch and proxy it
    const response = await fetch(faviconUrl)
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/x-icon',
        'Cache-Control': 'public, max-age=3600, must-revalidate',
        'CDN-Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error serving favicon:', error)
    
    // Fallback to default favicon
    return NextResponse.redirect(new URL('/favicon.ico', request.url))
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Revalidate every hour

