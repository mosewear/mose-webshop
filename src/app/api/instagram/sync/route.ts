import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { fetchRecentMedia, InstagramGraphError } from '@/lib/instagram/graph'
import { INSTAGRAM_FEED_TAG } from '@/lib/instagram/types'

// Sync de laatste posts van Instagram naar instagram_posts.
// Auth: Vercel Cron via Bearer CRON_SECRET, of admin via cookie.
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
      .select('id, long_lived_token, business_account_id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (credsError || !creds) {
      return NextResponse.json(
        { success: false, error: 'No Instagram credentials configured' },
        { status: 503 }
      )
    }

    if (!creds.long_lived_token || !creds.business_account_id) {
      await supabase
        .from('instagram_credentials')
        .update({
          last_sync_status: 'error',
          last_sync_error: 'Missing long_lived_token or business_account_id',
        })
        .eq('id', creds.id)
      return NextResponse.json(
        { success: false, error: 'Instagram not connected — paste token + business account id in /admin/instagram' },
        { status: 503 }
      )
    }

    let media
    try {
      media = await fetchRecentMedia(
        creds.long_lived_token,
        creds.business_account_id,
        24
      )
    } catch (err: unknown) {
      const status = err instanceof InstagramGraphError ? err.status : 500
      const message = err instanceof Error ? err.message : 'Instagram Graph error'
      await supabase
        .from('instagram_credentials')
        .update({
          last_sync_status: 'error',
          last_sync_error: message,
        })
        .eq('id', creds.id)
      return NextResponse.json(
        { success: false, error: message },
        { status: status >= 400 && status < 600 ? status : 502 }
      )
    }

    let upserted = 0
    for (const item of media) {
      // Upsert op instagram_id zodat curatie-velden (is_hidden,
      // is_pinned, pin_order, caption_en) bewaard blijven.
      const { error } = await supabase
        .from('instagram_posts')
        .upsert(
          {
            instagram_id: item.id,
            permalink: item.permalink,
            media_type: item.media_type,
            media_url: item.media_url,
            thumbnail_url: item.thumbnail_url || null,
            caption: item.caption || null,
            like_count: typeof item.like_count === 'number' ? item.like_count : null,
            taken_at: item.timestamp || null,
            source: 'graph',
          },
          { onConflict: 'instagram_id', ignoreDuplicates: false }
        )
      if (!error) upserted++
    }

    await supabase
      .from('instagram_credentials')
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: 'success',
        last_sync_error: null,
      })
      .eq('id', creds.id)

    revalidateTag(INSTAGRAM_FEED_TAG, { expire: 0 })

    return NextResponse.json({
      success: true,
      fetched: media.length,
      upserted,
    })
  } catch (error: unknown) {
    console.error('[instagram/sync] error:', error)
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
