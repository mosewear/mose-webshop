import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { INSTAGRAM_FEED_TAG } from '@/lib/instagram/types'

export const dynamic = 'force-dynamic'

const ALLOWED_PATCH_FIELDS = [
  'is_hidden',
  'is_pinned',
  'pin_order',
  'caption',
  'caption_en',
] as const

type PatchKey = (typeof ALLOWED_PATCH_FIELDS)[number]

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json(
      { success: false, error: 'Niet geautoriseerd' },
      { status: 403 }
    )
  }

  const { id } = await ctx.params

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { success: false, error: 'Ongeldige JSON body.' },
      { status: 400 }
    )
  }

  const update: Partial<Record<PatchKey, unknown>> = {}
  for (const key of ALLOWED_PATCH_FIELDS) {
    const value = body[key]
    if (value === undefined) continue
    if (key === 'is_hidden' || key === 'is_pinned') {
      update[key] = Boolean(value)
    } else if (key === 'pin_order') {
      update[key] = value === null ? null : Number(value)
    } else {
      update[key] = value === null ? null : String(value).slice(0, 2000)
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { success: false, error: 'Geen geldige velden om te updaten.' },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('instagram_posts')
    .update(update)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('[admin/instagram/posts/:id] update error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
  if (!data) {
    return NextResponse.json(
      { success: false, error: 'Post niet gevonden.' },
      { status: 404 }
    )
  }

  revalidateTag(INSTAGRAM_FEED_TAG, { expire: 0 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json(
      { success: false, error: 'Niet geautoriseerd' },
      { status: 403 }
    )
  }

  const { id } = await ctx.params
  const supabase = createServiceRoleClient()

  // We staan alleen verwijderen toe voor handmatig toegevoegde posts.
  // Graph-posts moeten via "verbergen" gaan zodat ze niet bij de
  // volgende sync opnieuw verschijnen.
  const { data: existing, error: fetchError } = await supabase
    .from('instagram_posts')
    .select('id, source')
    .eq('id', id)
    .maybeSingle()
  if (fetchError) {
    return NextResponse.json(
      { success: false, error: fetchError.message },
      { status: 500 }
    )
  }
  if (!existing) {
    return NextResponse.json(
      { success: false, error: 'Post niet gevonden.' },
      { status: 404 }
    )
  }
  if (existing.source !== 'manual') {
    return NextResponse.json(
      {
        success: false,
        error: 'Graph-posts kunnen niet verwijderd worden — gebruik "Verbergen".',
      },
      { status: 400 }
    )
  }

  const { error } = await supabase.from('instagram_posts').delete().eq('id', id)
  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  revalidateTag(INSTAGRAM_FEED_TAG, { expire: 0 })
  return NextResponse.json({ success: true })
}
