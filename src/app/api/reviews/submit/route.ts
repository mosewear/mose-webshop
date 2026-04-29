import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Submit a product review. Accepts EITHER JSON (legacy / no photos) or
 * multipart/form-data (with up to 3 image attachments per review).
 *
 * Photos land in the `review-images` Supabase Storage bucket and a row is
 * inserted in `product_review_images` with `is_approved = false`. Admin
 * approval of the review auto-approves the photos.
 */

const MAX_IMAGES = 3
const MAX_BYTES_PER_IMAGE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])

interface ReviewBody {
  product_id: string
  rating: number
  title?: string
  comment?: string
  reviewer_name: string
  reviewer_email: string
  images?: File[]
}

async function parseBody(req: NextRequest): Promise<ReviewBody | null> {
  const ctype = req.headers.get('content-type') || ''

  if (ctype.includes('multipart/form-data')) {
    const fd = await req.formData()
    const product_id = String(fd.get('product_id') || '')
    const ratingRaw = fd.get('rating')
    const rating = ratingRaw ? Number(ratingRaw) : NaN
    const title = String(fd.get('title') || '')
    const comment = String(fd.get('comment') || '')
    const reviewer_name = String(fd.get('reviewer_name') || '')
    const reviewer_email = String(fd.get('reviewer_email') || '')

    const images: File[] = []
    for (const entry of fd.getAll('images')) {
      if (entry instanceof File && entry.size > 0) {
        images.push(entry)
      }
      if (images.length >= MAX_IMAGES) break
    }

    return {
      product_id,
      rating,
      title,
      comment,
      reviewer_name,
      reviewer_email,
      images,
    }
  }

  // Legacy JSON path (kept so non-photo reviews keep working).
  try {
    const json = await req.json()
    return {
      product_id: String(json?.product_id || ''),
      rating: Number(json?.rating ?? NaN),
      title: typeof json?.title === 'string' ? json.title : '',
      comment: typeof json?.comment === 'string' ? json.comment : '',
      reviewer_name: String(json?.reviewer_name || ''),
      reviewer_email: String(json?.reviewer_email || ''),
      images: [],
    }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const {
      product_id,
      rating,
      title,
      comment,
      reviewer_name,
      reviewer_email,
      images = [],
    } = body

    if (!product_id || !rating || !reviewer_name || !reviewer_email) {
      return NextResponse.json(
        { error: 'Vul alle verplichte velden in' },
        { status: 400 }
      )
    }

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating moet tussen 1 en 5 zijn' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(reviewer_email)) {
      return NextResponse.json(
        { error: 'Ongeldig e-mailadres' },
        { status: 400 }
      )
    }

    if (images.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `Maximaal ${MAX_IMAGES} foto's per review` },
        { status: 400 }
      )
    }

    for (const img of images) {
      if (!ALLOWED_IMAGE_TYPES.has(img.type)) {
        return NextResponse.json(
          { error: 'Alleen JPG, PNG of WebP afbeeldingen' },
          { status: 400 }
        )
      }
      if (img.size > MAX_BYTES_PER_IMAGE) {
        return NextResponse.json(
          { error: `Foto te groot (max ${Math.floor(MAX_BYTES_PER_IMAGE / 1024 / 1024)} MB per foto)` },
          { status: 400 }
        )
      }
    }

    let userId: string | null = null
    let isVerifiedPurchase = false

    try {
      const userClient = await createClient()
      const { data: { user } } = await userClient.auth.getUser()
      if (user) {
        userId = user.id
        const supabaseService = createServiceRoleClient()
        const { data: purchases } = await supabaseService
          .from('order_items')
          .select('id, orders!inner(user_id, payment_status)')
          .eq('product_id', product_id)
          .eq('orders.user_id', user.id)
          .eq('orders.payment_status', 'paid')
          .limit(1)
        if (purchases && purchases.length > 0) {
          isVerifiedPurchase = true
        }
      }
    } catch {
      // Guest user, continue without user_id
    }

    const supabase = createServiceRoleClient()

    const { data: review, error } = await supabase
      .from('product_reviews')
      .insert({
        product_id,
        user_id: userId,
        rating,
        title: title || '',
        comment: comment || '',
        reviewer_name,
        reviewer_email,
        is_approved: false,
        is_verified_purchase: isVerifiedPurchase,
      })
      .select()
      .single()

    if (error || !review) {
      console.error('Error inserting review:', error)
      return NextResponse.json(
        { error: 'Kon review niet opslaan' },
        { status: 500 }
      )
    }

    // Upload images (best effort - if a single upload fails we keep the
    // review and surface a soft warning). Stored in
    // review-images/{review_id}/{position}.{ext}
    const uploadedRows: Array<{ storage_path: string; position: number }> = []
    if (images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        const ext = (img.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
        const storagePath = `${review.id}/${i}.${ext}`
        const arrayBuffer = await img.arrayBuffer()
        const { error: upErr } = await supabase.storage
          .from('review-images')
          .upload(storagePath, new Uint8Array(arrayBuffer), {
            contentType: img.type,
            upsert: true,
          })
        if (upErr) {
          console.error('Review image upload error:', upErr)
          continue
        }
        uploadedRows.push({ storage_path: storagePath, position: i })
      }

      if (uploadedRows.length > 0) {
        const { error: insertErr } = await supabase
          .from('product_review_images')
          .insert(
            uploadedRows.map((r) => ({
              review_id: review.id,
              storage_path: r.storage_path,
              position: r.position,
              is_approved: false,
            }))
          )
        if (insertErr) {
          console.error('Review image rows insert error:', insertErr)
        }
      }
    }

    return NextResponse.json({
      success: true,
      reviewId: review.id,
      uploadedImages: uploadedRows.length,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Er is een fout opgetreden'
    console.error('Review submit error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
