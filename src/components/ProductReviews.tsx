'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PenLine, X, Camera } from 'lucide-react'
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
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-8 h-8',
    }

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`${sizeClasses[size]} ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
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

  if (loading) {
    return null
  }

  // No reviews yet: compact "be the first" CTA
  if (totalReviews === 0) {
    return (
      <div data-pdp-reviews id="reviews" className="border-t-2 border-gray-200 pt-6 mt-8">
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full md:w-auto bg-gray-100 hover:bg-brand-primary hover:text-white border-2 border-gray-300 hover:border-brand-primary text-black font-bold py-4 px-8 uppercase tracking-wider transition-all flex items-center justify-center gap-2"
        >
          <PenLine size={18} />
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
      </div>
    )
  }

  return (
    <div data-pdp-reviews id="reviews" className="border-t-2 border-gray-200 pt-8 mt-8">
      <h2 className="text-3xl font-bold mb-6">{t('customerReviews')}</h2>

      {totalReviews > 0 && (
        <div className="bg-gray-50 border-2 border-gray-200 p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">{averageRating.toFixed(1)}</div>
              {renderStars(Math.round(averageRating), 'lg')}
              <p className="text-gray-600 mt-2">{t('basedOn', { count: totalReviews })}</p>
            </div>

            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingDistribution[rating - 1]
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0

                return (
                  <div key={rating} className="flex items-center gap-3">
                    <span className="text-sm font-semibold w-16">{rating} {t('stars', { count: rating })}</span>
                    <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-yellow-400 h-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-8 uppercase tracking-wider transition-colors flex items-center gap-2"
        >
          {showForm ? (
            t('close')
          ) : (
            <>
              <PenLine size={18} />
              <span>{t('writeReview')}</span>
            </>
          )}
        </button>
      </div>

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

      {reviews.length > 0 && (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-2 border-gray-200 p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  {renderStars(review.rating)}
                  {review.title && <h4 className="font-bold text-lg mt-2">{review.title}</h4>}
                </div>
                {review.is_verified_purchase && (
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 uppercase">
                    ✓ {t('verifiedPurchase')}
                  </span>
                )}
              </div>
              {review.comment && <p className="text-gray-700 mb-3">{review.comment}</p>}

              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto">
                  {review.images.map((img, idx) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => {
                        setLightboxImages(review.images || null)
                        setLightboxIndex(idx)
                      }}
                      className="relative shrink-0 border-2 border-gray-200 hover:border-black transition-colors"
                      aria-label="Open foto"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={`Review foto ${idx + 1}`}
                        className="w-20 h-20 md:w-24 md:h-24 object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="font-semibold">{review.reviewer_name}</span>
                <span>•</span>
                <span>{new Date(review.created_at).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
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
    </div>
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
    <form onSubmit={onSubmit} className="bg-white border-2 border-gray-200 p-6 mt-6 mb-8">
      <h3 className="text-xl font-bold mb-4">{t('yourReview')}</h3>

      <div className="mb-4">
        <label className="block text-sm font-bold mb-2">
          {t('rating')} {t('required')}
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setFormData({ ...formData, rating: star })}
              className="focus:outline-none"
              aria-label={`${star} ster${star === 1 ? '' : 'ren'}`}
            >
              <svg
                className={`w-8 h-8 ${star <= formData.rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-300 transition-colors`}
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
        <label className="block text-sm font-bold mb-2">{t('name')} {t('required')}</label>
        <input
          type="text"
          value={formData.reviewer_name}
          onChange={(e) => setFormData({ ...formData, reviewer_name: e.target.value })}
          className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-bold mb-2">{t('email')} {t('required')} {t('emailNote')}</label>
        <input
          type="email"
          value={formData.reviewer_email}
          onChange={(e) => setFormData({ ...formData, reviewer_email: e.target.value })}
          className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-bold mb-2">{t('title')} {t('optional')}</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
          placeholder={t('titlePlaceholder')}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-bold mb-2">{t('comment')} {t('optional')}</label>
        <textarea
          value={formData.comment}
          onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
          className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
          rows={5}
          placeholder={t('commentPlaceholder')}
        />
      </div>

      {/* Photos */}
      <div className="mb-6">
        <label className="block text-sm font-bold mb-2">
          {t('addPhotos')} {t('optional')}
        </label>
        <p className="text-xs text-gray-600 mb-2">{t('photosHelp', { count: MAX_IMAGES })}</p>

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
            <div key={p.id} className="relative w-20 h-20 md:w-24 md:h-24 border-2 border-gray-300">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemovePreview(p.id)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center"
                aria-label="Verwijder foto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {previewImages.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 md:w-24 md:h-24 border-2 border-dashed border-gray-400 flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-brand-primary hover:border-brand-primary transition-colors"
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
        className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-8 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? t('submitting') : t('submit')}
      </button>
    </form>
  )
}
