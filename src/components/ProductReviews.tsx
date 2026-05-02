'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, PenLine, X, Camera } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

interface ReviewImage {
  id: string
  storage_path: string
  position: number
  url: string
}

interface Review {
  id: string
  rating: number
  title: string
  comment: string
  reviewer_name: string
  is_verified_purchase: boolean
  created_at: string
  helpful_count?: number
  user_voted?: boolean
  images?: ReviewImage[]
}

interface ProductReviewsProps {
  productId: string
}

const MAX_IMAGES = 3
const MAX_BYTES_RAW = 8 * 1024 * 1024 // 8 MB raw, compressed below
const COMPRESS_MAX_DIMENSION = 1400
const COMPRESS_QUALITY = 0.8

interface PreviewImage {
  id: string
  file: File
  url: string
}

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (typeof document === 'undefined') return file

  return await new Promise<File>((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      let { width, height } = img
      const longest = Math.max(width, height)
      if (longest > COMPRESS_MAX_DIMENSION) {
        const scale = COMPRESS_MAX_DIMENSION / longest
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(objectUrl)
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl)
          if (!blob) {
            resolve(file)
            return
          }
          const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve(compressed.size < file.size ? compressed : file)
        },
        'image/jpeg',
        COMPRESS_QUALITY
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }
    img.src = objectUrl
  })
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const t = useTranslations('product.reviews')
  const locale = useLocale()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [ratingDistribution, setRatingDistribution] = useState<number[]>([0, 0, 0, 0, 0])

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    rating: 5,
    title: '',
    comment: '',
    reviewer_name: '',
    reviewer_email: '',
  })
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([])
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState<ReviewImage[] | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  useEffect(() => {
    fetchReviews()
  }, [productId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup object URLs on unmount or when previews change.
  useEffect(() => {
    return () => {
      previewImages.forEach((p) => URL.revokeObjectURL(p.url))
    }
  }, [previewImages])

  const fetchReviews = async () => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('product_reviews')
      .select('*, product_review_images(id, storage_path, position, is_approved)')
      .eq('product_id', productId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reviews:', error)
      setLoading(false)
      return
    }

    if (data && data.length > 0) {
      const enriched: Review[] = data.map((row) => {
        const images = ((row as { product_review_images?: Array<{ id: string; storage_path: string; position: number; is_approved: boolean }> }).product_review_images || [])
          .filter((img) => img.is_approved)
          .sort((a, b) => a.position - b.position)
          .map((img) => {
            const { data: pub } = supabase.storage
              .from('review-images')
              .getPublicUrl(img.storage_path)
            return {
              id: img.id,
              storage_path: img.storage_path,
              position: img.position,
              url: pub.publicUrl,
            }
          })
        return {
          id: row.id,
          rating: row.rating,
          title: row.title,
          comment: row.comment,
          reviewer_name: row.reviewer_name,
          is_verified_purchase: row.is_verified_purchase,
          created_at: row.created_at,
          images,
        }
      })

      setReviews(enriched)
      setTotalReviews(enriched.length)
      const avg = enriched.reduce((sum, r) => sum + r.rating, 0) / enriched.length
      setAverageRating(Math.round(avg * 10) / 10)

      const dist = [0, 0, 0, 0, 0]
      enriched.forEach((review) => {
        dist[review.rating - 1]++
      })
      setRatingDistribution(dist)
    }

    setLoading(false)
  }

  const handlePickImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const remaining = MAX_IMAGES - previewImages.length
    if (remaining <= 0) {
      alert(t('imagesMax', { count: MAX_IMAGES }))
      return
    }

    const candidates = Array.from(files).slice(0, remaining)
    const accepted: PreviewImage[] = []

    for (const raw of candidates) {
      if (!raw.type.startsWith('image/')) continue
      if (raw.size > MAX_BYTES_RAW) {
        alert(t('imagesTooLarge'))
        continue
      }
      const compressed = await compressImage(raw)
      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: compressed,
        url: URL.createObjectURL(compressed),
      })
    }

    setPreviewImages((prev) => [...prev, ...accepted])
  }

  const handleRemovePreview = (id: string) => {
    setPreviewImages((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((p) => p.id !== id)
    })
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.reviewer_name || !formData.reviewer_email || !formData.rating) {
      alert(t('fillRequired'))
      return
    }

    setSubmitting(true)

    try {
      const fd = new FormData()
      fd.append('product_id', productId)
      fd.append('rating', String(formData.rating))
      fd.append('title', formData.title)
      fd.append('comment', formData.comment)
      fd.append('reviewer_name', formData.reviewer_name)
      fd.append('reviewer_email', formData.reviewer_email)
      previewImages.forEach((p) => fd.append('images', p.file, p.file.name))

      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        body: fd,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || t('submitError'))
      }

      if (data.reviewId) {
        fetch('/api/reviews/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewId: data.reviewId,
            productId,
          }),
        }).catch(() => {})
      }

      alert(t('submitSuccess'))
      setShowForm(false)
      setFormData({
        rating: 5,
        title: '',
        comment: '',
        reviewer_name: '',
        reviewer_email: '',
      })
      previewImages.forEach((p) => URL.revokeObjectURL(p.url))
      setPreviewImages([])
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('submitError')
      console.error('Error submitting review:', error)
      alert(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    // Sterren in MOSE brand-primary (groen) i.p.v. het generieke
    // yellow zodat de review-sectie visueel hetzelfde DNA heeft als
    // de rest van de PDP (ATC-knop, korting-tags, accenten).
    const sizeClasses = {
      sm: 'w-3.5 h-3.5',
      md: 'w-4 h-4',
      lg: 'w-6 h-6 md:w-7 md:h-7',
    }

    return (
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`${sizeClasses[size]} ${star <= rating ? 'text-brand-primary' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    )
  }

  const dateLocale = locale === 'en' ? 'en-GB' : 'nl-NL'

  // Pagineren op 6 zodat de sectie compact blijft. Onder de strip
  // verschijnt een "Toon alle X reviews"-link wanneer er meer zijn.
  const REVIEWS_INITIAL = 6
  const [showAll, setShowAll] = useState(false)
  const visibleReviews = useMemo(
    () => (showAll ? reviews : reviews.slice(0, REVIEWS_INITIAL)),
    [reviews, showAll]
  )

  if (loading) {
    return null
  }

  // No reviews yet: compact "be the first" CTA in MOSE brutalist stijl.
  if (totalReviews === 0) {
    return (
      <section
        data-pdp-reviews
        id="reviews"
        aria-labelledby="reviews-heading-empty"
        className="border-t-2 border-black pt-8 md:pt-10 mt-12 md:mt-16"
      >
        <p className="text-[11px] tracking-[0.2em] uppercase text-gray-500 mb-1">
          {t('reviewsTagline')}
        </p>
        <h2
          id="reviews-heading-empty"
          className="font-display text-3xl md:text-4xl uppercase tracking-tight leading-none mb-5 md:mb-6"
        >
          {t('customerReviews')}
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full md:w-auto bg-white text-black border-2 border-black font-bold py-3 px-6 md:px-8 uppercase tracking-wider transition-colors flex items-center justify-center gap-2 hover:bg-black hover:text-white"
        >
          <PenLine size={16} />
          <span>{t('beFirst')}</span>
        </button>

        {showForm && (
          <ReviewForm
            t={t}
            formData={formData}
            setFormData={setFormData}
            previewImages={previewImages}
            onPickImages={handlePickImages}
            onRemovePreview={handleRemovePreview}
            fileInputRef={fileInputRef}
            onSubmit={handleSubmitReview}
            submitting={submitting}
          />
        )}
      </section>
    )
  }

  return (
    <section
      data-pdp-reviews
      id="reviews"
      aria-labelledby="reviews-heading"
      className="border-t-2 border-black pt-8 md:pt-10 mt-12 md:mt-16"
    >
      <p className="text-[11px] tracking-[0.2em] uppercase text-gray-500 mb-1">
        {t('reviewsTagline')}
      </p>
      <h2
        id="reviews-heading"
        className="font-display text-3xl md:text-4xl uppercase tracking-tight leading-none mb-5 md:mb-6"
      >
        {t('customerReviews')}
      </h2>

      {/* Compact summary-strip: één brutalist horizontaal vlak met 3
          segmenten op desktop (gemiddeld cijfer | distributie-bars |
          schrijf-knop) en 2 segmenten op mobiel (cijfer + distributie),
          met de schrijf-knop als full-width brute knop daaronder. */}
      <div className="border-2 border-black mb-5 md:mb-6">
        <div className="flex items-stretch divide-x-2 divide-black">
          <div className="px-4 py-3 md:px-6 md:py-4 flex flex-col items-start justify-center min-w-[110px] md:min-w-[140px]">
            <span className="font-display text-4xl md:text-5xl leading-none mb-1.5">
              {averageRating.toFixed(1)}
            </span>
            {renderStars(Math.round(averageRating), 'md')}
            <span className="text-[10px] md:text-[11px] uppercase tracking-wider text-gray-500 mt-1.5">
              {t('basedOn', { count: totalReviews })}
            </span>
          </div>

          <div className="flex-1 px-4 py-3 md:px-6 md:py-4 flex flex-col justify-center gap-1.5 md:gap-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingDistribution[rating - 1]
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0
              return (
                <div key={rating} className="flex items-center gap-2 md:gap-3">
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider w-3 text-gray-700">
                    {rating}
                  </span>
                  <div className="flex-1 bg-gray-100 h-1.5 overflow-hidden">
                    <div
                      className="bg-brand-primary h-full transition-[width] duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] md:text-xs text-gray-500 w-6 text-right tabular-nums">
                    {count}
                  </span>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="hidden md:flex flex-col items-center justify-center gap-1.5 px-5 lg:px-7 bg-black text-white hover:bg-brand-primary transition-colors min-w-[140px]"
          >
            <PenLine size={18} aria-hidden="true" />
            <span className="text-[11px] font-bold uppercase tracking-wider leading-tight text-center">
              {showForm ? t('close') : t('writeReview')}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile-only schrijf-knop, full-width onder de strip. Op desktop
          zit dezelfde actie ingebouwd als rechter segment hierboven. */}
      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        className="md:hidden w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors flex items-center justify-center gap-2 mb-5"
      >
        {showForm ? (
          t('close')
        ) : (
          <>
            <PenLine size={16} aria-hidden="true" />
            <span>{t('writeReview')}</span>
          </>
        )}
      </button>

      {showForm && (
        <ReviewForm
          t={t}
          formData={formData}
          setFormData={setFormData}
          previewImages={previewImages}
          onPickImages={handlePickImages}
          onRemovePreview={handleRemovePreview}
          fileInputRef={fileInputRef}
          onSubmit={handleSubmitReview}
          submitting={submitting}
        />
      )}

      {visibleReviews.length > 0 && (
        <div className="space-y-3 md:space-y-4">
          {visibleReviews.map((review) => (
            <article
              key={review.id}
              className="border-2 border-black p-4 md:p-5 bg-white"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  {renderStars(review.rating, 'sm')}
                  {review.title && (
                    <h3 className="font-bold text-base md:text-lg mt-1.5 leading-tight">
                      {review.title}
                    </h3>
                  )}
                </div>
                {review.is_verified_purchase && (
                  <span className="shrink-0 inline-flex items-center gap-1 bg-black text-white border-2 border-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]">
                    <Check className="w-3 h-3" aria-hidden="true" />
                    <span>{t('verifiedPurchase')}</span>
                  </span>
                )}
              </div>

              {review.comment && (
                <p className="text-sm md:text-[15px] text-gray-800 leading-relaxed mb-3">
                  {review.comment}
                </p>
              )}

              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide -mx-1 px-1">
                  {review.images.map((img, idx) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => {
                        setLightboxImages(review.images || null)
                        setLightboxIndex(idx)
                      }}
                      className="relative shrink-0 border-2 border-black hover:border-brand-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                      aria-label={t('openPhoto')}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt=""
                        className="w-16 h-16 md:w-20 md:h-20 object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-gray-500">
                <span className="font-bold text-gray-700">{review.reviewer_name}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {new Date(review.created_at).toLocaleDateString(dateLocale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {reviews.length > REVIEWS_INITIAL && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-5 md:mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider underline-offset-4 hover:underline hover:text-brand-primary transition-colors"
        >
          {t('showAll', { count: reviews.length })}
        </button>
      )}

      {/* Lightbox */}
      {lightboxImages && lightboxImages.length > 0 && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImages(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              setLightboxImages(null)
            }}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            aria-label="Sluiten"
          >
            <X className="w-8 h-8" />
          </button>
          <div
            className="relative w-full h-full max-w-4xl max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImages[lightboxIndex].url}
              alt="Review foto"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          {lightboxImages.length > 1 && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {lightboxImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    lightboxIndex === i ? 'bg-white' : 'bg-white/40'
                  }`}
                  aria-label={`Foto ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

interface ReviewFormProps {
  t: ReturnType<typeof useTranslations>
  formData: {
    rating: number
    title: string
    comment: string
    reviewer_name: string
    reviewer_email: string
  }
  setFormData: React.Dispatch<
    React.SetStateAction<{
      rating: number
      title: string
      comment: string
      reviewer_name: string
      reviewer_email: string
    }>
  >
  previewImages: PreviewImage[]
  onPickImages: (files: FileList | null) => void
  onRemovePreview: (id: string) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onSubmit: (e: React.FormEvent) => void
  submitting: boolean
}

function ReviewForm({
  t,
  formData,
  setFormData,
  previewImages,
  onPickImages,
  onRemovePreview,
  fileInputRef,
  onSubmit,
  submitting,
}: ReviewFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border-2 border-black p-5 md:p-6 mt-5 md:mt-6 mb-6 md:mb-8"
    >
      <h3 className="font-display text-2xl md:text-3xl uppercase tracking-tight leading-none mb-5 md:mb-6">
        {t('yourReview')}
      </h3>

      <div className="mb-4">
        <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 text-gray-700">
          {t('rating')} {t('required')}
        </label>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setFormData({ ...formData, rating: star })}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              aria-label={`${star} ${t('stars', { count: star })}`}
              aria-pressed={star <= formData.rating}
            >
              <svg
                className={`w-7 h-7 transition-colors ${
                  star <= formData.rating
                    ? 'text-brand-primary'
                    : 'text-gray-300 hover:text-brand-primary/60'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 text-gray-700">
          {t('name')} {t('required')}
        </label>
        <input
          type="text"
          value={formData.reviewer_name}
          onChange={(e) => setFormData({ ...formData, reviewer_name: e.target.value })}
          className="w-full px-4 py-3 border-2 border-black focus:border-brand-primary focus:outline-none transition-colors"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 text-gray-700">
          {t('email')} {t('required')} <span className="text-gray-500 normal-case tracking-normal">{t('emailNote')}</span>
        </label>
        <input
          type="email"
          value={formData.reviewer_email}
          onChange={(e) => setFormData({ ...formData, reviewer_email: e.target.value })}
          className="w-full px-4 py-3 border-2 border-black focus:border-brand-primary focus:outline-none transition-colors"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 text-gray-700">
          {t('title')} {t('optional')}
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-3 border-2 border-black focus:border-brand-primary focus:outline-none transition-colors"
          placeholder={t('titlePlaceholder')}
        />
      </div>

      <div className="mb-4">
        <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 text-gray-700">
          {t('comment')} {t('optional')}
        </label>
        <textarea
          value={formData.comment}
          onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
          className="w-full px-4 py-3 border-2 border-black focus:border-brand-primary focus:outline-none transition-colors"
          rows={5}
          placeholder={t('commentPlaceholder')}
        />
      </div>

      <div className="mb-6">
        <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 text-gray-700">
          {t('addPhotos')} {t('optional')}
        </label>
        <p className="text-xs text-gray-500 mb-3">{t('photosHelp', { count: MAX_IMAGES })}</p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => onPickImages(e.target.files)}
        />

        <div className="flex flex-wrap items-center gap-3">
          {previewImages.map((p) => (
            <div
              key={p.id}
              className="relative w-20 h-20 md:w-24 md:h-24 border-2 border-black"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemovePreview(p.id)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-black text-white border-2 border-white flex items-center justify-center hover:bg-brand-primary transition-colors"
                aria-label={t('removePhoto')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {previewImages.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 md:w-24 md:h-24 border-2 border-dashed border-black flex flex-col items-center justify-center gap-1 text-black hover:text-brand-primary hover:border-brand-primary transition-colors"
            >
              <Camera className="w-5 h-5 md:w-6 md:h-6" />
              <span className="text-[10px] md:text-xs uppercase tracking-wider font-bold">
                {t('addPhotosShort')}
              </span>
            </button>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full md:w-auto bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-8 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? t('submitting') : t('submit')}
      </button>
    </form>
  )
}
