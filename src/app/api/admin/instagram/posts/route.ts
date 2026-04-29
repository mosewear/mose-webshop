import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { INSTAGRAM_FEED_TAG } from '@/lib/instagram/types'

export const dynamic = 'force-dynamic'

const PERMALINK_RE = /^https:\/\/(www\.)?instagram\.com\//i

// GET: lijst alle posts (zichtbaar + verborgen + handmatig).
export async function GET() {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json(
      { success: false, error: 'Niet geautoriseerd' },
      { status: 403 }
    )
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('instagram_posts')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('pin_order', { ascending: true, nullsFirst: false })
    .order('taken_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[admin/instagram/posts] list error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data: data ?? [] }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

// POST: handmatige post toevoegen (source=manual, geen instagram_id).
export async function POST(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json(
      { success: false, error: 'Niet geautoriseerd' },
      { status: 403 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { success: false, error: 'Ongeldige JSON body.' },
      { status: 400 }
    )
  }

  const permalink = String(body?.permalink || '').trim()
  const media_url = String(body?.media_url || '').trim()
  const caption = body?.caption ? String(body.caption).slice(0, 2000) : null
  const caption_en = body?.caption_en ? String(body.caption_en).slice(0, 2000) : null
  const incomingType = typeof body?.media_type === 'string' ? body.media_type : ''
  const media_type = ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'].includes(incomingType)
    ? (incomingType as 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM')
    : 'IMAGE'
  const thumbnail_url = body?.thumbnail_url ? String(body.thumbnail_url).trim() : null

  if (!permalink || !PERMALINK_RE.test(permalink)) {
    return NextResponse.json(
      { success: false, error: 'Permalink moet een geldige instagram.com URL zijn.' },
      { status: 400 }
    )
  }
  if (!media_url) {
    return NextResponse.json(
      { success: false, error: 'media_url is verplicht.' },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('instagram_posts')
    .insert({
      instagram_id: null,
      permalink,
      media_type,
      media_url,
      thumbnail_url,
      caption,
      caption_en,
      taken_at: new Date().toISOString(),
      source: 'manual',
    })
    .select('*')
    .single()

  if (error) {
    console.error('[admin/instagram/posts] insert error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  revalidateTag(INSTAGRAM_FEED_TAG, { expire: 0 })
  return NextResponse.json({ success: true, data })
}
