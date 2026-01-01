'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

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
}

interface ProductReviewsProps {
  productId: string
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [ratingDistribution, setRatingDistribution] = useState<number[]>([0, 0, 0, 0, 0])
  
  // Review form state
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    rating: 5,
    title: '',
    comment: '',
    reviewer_name: '',
    reviewer_email: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchReviews()
  }, [productId])

  const fetchReviews = async () => {
    const supabase = createClient()
    
    // Get approved reviews
    const { data, error } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reviews:', error)
      setLoading(false)
      return
    }

    if (data && data.length > 0) {
      setReviews(data)
      setTotalReviews(data.length)
      
      // Calculate average rating
      const avg = data.reduce((sum, review) => sum + review.rating, 0) / data.length
      setAverageRating(Math.round(avg * 10) / 10)
      
      // Calculate rating distribution
      const dist = [0, 0, 0, 0, 0]
      data.forEach((review) => {
        dist[review.rating - 1]++
      })
      setRatingDistribution(dist)
    }

    setLoading(false)
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.reviewer_name || !formData.reviewer_email || !formData.rating) {
      alert('Vul alle verplichte velden in')
      return
    }

    setSubmitting(true)
    const supabase = createClient()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('product_reviews')
        .insert([
          {
            product_id: productId,
            user_id: user?.id || null,
            rating: formData.rating,
            title: formData.title,
            comment: formData.comment,
            reviewer_name: formData.reviewer_name,
            reviewer_email: formData.reviewer_email,
            is_approved: false, // Admin moet goedkeuren
          },
        ])

      if (error) throw error

      alert('✅ Bedankt voor je review! Je review wordt binnen 24 uur goedgekeurd.')
      setShowForm(false)
      setFormData({
        rating: 5,
        title: '',
        comment: '',
        reviewer_name: '',
        reviewer_email: '',
      })
    } catch (error: any) {
      console.error('Error submitting review:', error)
      alert('Er ging iets mis bij het verzenden van je review')
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

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-brand-primary"></div>
      </div>
    )
  }

  return (
    <div className="border-t-2 border-gray-200 pt-8 mt-8">
      <h2 className="text-3xl font-bold mb-6">Klantervaringen</h2>

      {/* Rating Summary */}
      {totalReviews > 0 ? (
        <div className="bg-gray-50 border-2 border-gray-200 p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Average Rating */}
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">{averageRating.toFixed(1)}</div>
              {renderStars(Math.round(averageRating), 'lg')}
              <p className="text-gray-600 mt-2">Gebaseerd op {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}</p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingDistribution[rating - 1]
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0

                return (
                  <div key={rating} className="flex items-center gap-3">
                    <span className="text-sm font-semibold w-12">{rating} ster</span>
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
      ) : (
        <div className="bg-gray-50 border-2 border-gray-200 p-8 mb-8 text-center">
          <p className="text-gray-600">Nog geen reviews voor dit product.</p>
          <p className="text-sm text-gray-500 mt-2">Wees de eerste om een review te schrijven!</p>
        </div>
      )}

      {/* Write Review Button */}
      <div className="mb-8">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-8 uppercase tracking-wider transition-colors"
        >
          {showForm ? 'Sluiten' : '✍️ Schrijf een review'}
        </button>
      </div>

      {/* Review Form */}
      {showForm && (
        <form onSubmit={handleSubmitReview} className="bg-white border-2 border-gray-200 p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">Jouw review</h3>

          {/* Rating */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Beoordeling *</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className="focus:outline-none"
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

          {/* Name */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Naam *</label>
            <input
              type="text"
              value={formData.reviewer_name}
              onChange={(e) => setFormData({ ...formData, reviewer_name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Email * (wordt niet gepubliceerd)</label>
            <input
              type="email"
              value={formData.reviewer_email}
              onChange={(e) => setFormData({ ...formData, reviewer_email: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Titel (optioneel)</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              placeholder="Vat je ervaring samen"
            />
          </div>

          {/* Comment */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Jouw review (optioneel)</label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              rows={5}
              placeholder="Vertel ons over je ervaring met dit product"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-8 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Verzenden...' : 'Verstuur review'}
          </button>
        </form>
      )}

      {/* Reviews List */}
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
                    ✓ Geverifieerde koop
                  </span>
                )}
              </div>
              {review.comment && <p className="text-gray-700 mb-3">{review.comment}</p>}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="font-semibold">{review.reviewer_name}</span>
                <span>•</span>
                <span>{new Date(review.created_at).toLocaleDateString('nl-NL', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

