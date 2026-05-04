import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { REVIEWS_MARQUEE_TAG } from '@/lib/reviews/marquee'

interface AdminReviewImage {
  id: string
  storage_path: string
  position: number
  is_approved: boolean
  url: string
}

export async function GET(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const filter = req.nextUrl.searchParams.get('filter') || 'all'
  const supabase = createServiceRoleClient()

  let query = supabase
    .from('product_reviews')
    .select('*, products(name, slug), product_review_images(id, storage_path, position, is_approved)')
    .order('created_at', { ascending: false })

  if (filter === 'pending') {
    query = query.eq('is_approved', false)
  } else if (filter === 'approved') {
    query = query.eq('is_approved', true)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Resolve public URLs for review images so the admin UI can render them
  // without a second round-trip per row.
  const reviews = (data || []).map((row) => {
    const images = ((row as unknown as { product_review_images?: Array<{ id: string; storage_path: string; position: number; is_approved: boolean }> }).product_review_images || [])
      .sort((a, b) => a.position - b.position)
      .map<AdminReviewImage>((img) => {
        const { data: pub } = supabase.storage
          .from('review-images')
          .getPublicUrl(img.storage_path)
        return { ...img, url: pub.publicUrl }
      })
    return { ...row, product_review_images: images }
  })

  return NextResponse.json({ reviews })
}

export async function PATCH(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { reviewId, action } = await req.json()

  if (!reviewId || !action) {
    return NextResponse.json({ error: 'Missing reviewId or action' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  if (action === 'approve') {
    const { error } = await supabase
      .from('product_reviews')
      .update({ is_approved: true })
      .eq('id', reviewId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Auto-approve all photos that belong to this review. Admin can still
    // delete individual photos via the dedicated endpoint if any single
    // image needs to be removed.
    await supabase
      .from('product_review_images')
      .update({ is_approved: true })
      .eq('review_id', reviewId)

    // Invalideer de homepage reviews-marquee zodat deze nieuwe approval
    // direct zichtbaar wordt zonder te wachten op de 5-min revalidate.
    revalidateTag(REVIEWS_MARQUEE_TAG, { expire: 0 })

    return NextResponse.json({ success: true })
  }

  if (action === 'delete') {
    // Clean up storage objects first so we never leave orphaned files when
    // the review row is gone.
    const { data: images } = await supabase
      .from('product_review_images')
      .select('storage_path')
      .eq('review_id', reviewId)

    if (images && images.length > 0) {
      const paths = images.map((i) => i.storage_path)
      await supabase.storage.from('review-images').remove(paths)
    }

    const { error } = await supabase
      .from('product_reviews')
      .delete()
      .eq('id', reviewId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Een verwijderde review kan ook in de marquee staan; invalidate
    // zodat we 'm direct uit de strip halen.
    revalidateTag(REVIEWS_MARQUEE_TAG, { expire: 0 })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { imageId } = await req.json()
  if (!imageId) {
    return NextResponse.json({ error: 'Missing imageId' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data: image, error: fetchErr } = await supabase
    .from('product_review_images')
    .select('storage_path')
    .eq('id', imageId)
    .single()

  if (fetchErr || !image) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }

  await supabase.storage.from('review-images').remove([image.storage_path])

  const { error } = await supabase
    .from('product_review_images')
    .delete()
    .eq('id', imageId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
