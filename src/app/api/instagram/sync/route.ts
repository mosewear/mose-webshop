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
      // Fetch a wide window (100 = Graph API max per page) so we can
      // safely prune any DB row whose Instagram post got deleted —
      // without false-positively hiding legitimately-old posts that
      // simply fell out of a smaller window. For MOSE's account this
      // covers all media in a single round-trip; for accounts with
      // 100+ Instagram posts the prune simply marks the oldest ones
      // hidden, which is benign because nothing surfaces them anyway
      // (the widgets all cap rendered posts at `max_posts` ≤ ~24).
      media = await fetchRecentMedia(
        creds.long_lived_token,
        creds.business_account_id,
        100,
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
    // Re-activate (is_hidden=false) any post that re-appears in the
    // Graph fetch — covers the case where a previously-pruned row
    // turns out to still exist (e.g. transient API hiccup last sync).
    for (const item of media) {
      // Upsert op instagram_id zodat curatie-velden (is_pinned,
      // pin_order, caption_en) bewaard blijven. `is_hidden` wordt
      // hier expliciet gereset zodat een eerder onterecht-gepruunde
      // post weer zichtbaar wordt zodra hij in de fetch terugkomt.
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
            is_hidden: false,
          },
          { onConflict: 'instagram_id', ignoreDuplicates: false },
        )
      if (!error) upserted++
    }

    // -----------------------------------------------------------------
    // Prune: mark graph-sourced rows whose Instagram ID is no longer in
    // the fetched set as `is_hidden = true`. This is the fix for
    // "deleted IG post still shows as a ? placeholder" — Graph no
    // longer returns the post, so we remove it from the storefront.
    //
    // Safety guards:
    //   - Only prune when the fetch returned ≥ 1 item. A 0-result is
    //     almost always a transient API/auth issue, not a "MOSE deleted
    //     all their posts" event; pruning everything would be terrible.
    //   - Only touch graph-sourced rows. `source = 'manual'` posts are
    //     curated by an admin and must never be auto-pruned.
    //   - Use `is_hidden = true` (not DELETE) so curation fields
    //     (is_pinned, pin_order, caption_en) survive — and the admin
    //     can still see/restore the post in /admin/instagram.
    // -----------------------------------------------------------------
    let pruned = 0
    if (media.length > 0) {
      // Instagram media IDs are numeric strings (e.g. "17890..."), so
      // we pass them unquoted in the PostgREST `in` filter list. The
      // parens are part of the value syntax for `not in`.
      const liveIds = media
        .map((m) => m.id)
        .filter((id): id is string => typeof id === 'string' && /^[0-9]+$/.test(id))
      if (liveIds.length > 0) {
        const { data: prunedRows, error: pruneError } = await supabase
          .from('instagram_posts')
          .update({ is_hidden: true })
          .eq('source', 'graph')
          .eq('is_hidden', false)
          .not('instagram_id', 'in', `(${liveIds.join(',')})`)
          .select('id')
        if (pruneError) {
          console.error('[instagram/sync] prune failed:', pruneError)
        } else {
          pruned = prunedRows?.length ?? 0
        }
      }
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
      pruned,
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
