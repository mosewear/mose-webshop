import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import {
  refreshLongLivedToken,
  exchangeForLongLivedFacebookToken,
  InstagramGraphError,
} from '@/lib/instagram/graph'

// Ververs het long-lived Instagram-token. Probeert eerst de
// Instagram Basic Display refresh-route; als die faalt en de
// Meta App credentials beschikbaar zijn, valt terug op de
// Facebook fb_exchange_token route (Business / Graph API).
async function handle(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const cronSecret = process.env.CRON_SECRET
    const isCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`

    if (!isCron) {
      const { authorized } = await requireAdmin(['admin', 'manager'])
      if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const supabase = createServiceRoleClient()

    const { data: creds, error: credsError } = await supabase
      .from('instagram_credentials')
      .select('id, long_lived_token')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (credsError || !creds || !creds.long_lived_token) {
      return NextResponse.json(
        { success: false, error: 'No Instagram token to refresh' },
        { status: 503 }
      )
    }

    let refreshed
    try {
      refreshed = await refreshLongLivedToken(creds.long_lived_token)
    } catch (err) {
      // Fallback: probeer de Facebook fb_exchange_token route
      // wanneer Basic Display niet werkt (Business token).
      try {
        refreshed = await exchangeForLongLivedFacebookToken(creds.long_lived_token)
      } catch (fallbackErr: unknown) {
        const status =
          fallbackErr instanceof InstagramGraphError ? fallbackErr.status : 500
        const message =
          (fallbackErr instanceof Error ? fallbackErr.message : null) ||
          (err instanceof Error ? err.message : 'Token refresh failed')
        await supabase
          .from('instagram_credentials')
          .update({
            last_sync_status: 'error',
            last_sync_error: `Token refresh: ${message}`,
          })
          .eq('id', creds.id)
        return NextResponse.json(
          { success: false, error: message },
          { status: status >= 400 && status < 600 ? status : 502 }
        )
      }
    }

    const expiresAt = new Date(
      Date.now() + (refreshed.expires_in || 60 * 24 * 60 * 60) * 1000
    ).toISOString()

    await supabase
      .from('instagram_credentials')
      .update({
        long_lived_token: refreshed.access_token,
        token_expires_at: expiresAt,
      })
      .eq('id', creds.id)

    return NextResponse.json({
      success: true,
      token_expires_at: expiresAt,
    })
  } catch (error: unknown) {
    console.error('[instagram/refresh-token] error:', error)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
