'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Review {
  id: string
  product_id: string
  rating: number
  title: string
  comment: string
  reviewer_name: string
  reviewer_email: string
  is_verified_purchase: boolean
  is_approved: boolean
  created_at: string
  products: {
    name: string
    slug: string
  }
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending')

  useEffect(() => {
    fetchReviews()
  }, [filter])

  const fetchReviews = async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('product_reviews')
      .select('*, products(name, slug)')
      .order('created_at', { ascending: false })

    if (filter === 'pending') {
      query = query.eq('is_approved', false)
    } else if (filter === 'approved') {
      query = query.eq('is_approved', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching reviews:', error)
    } else {
      setReviews(data || [])
    }

    setLoading(false)
  }

  const handleApprove = async (reviewId: string) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('product_reviews')
      .update({ is_approved: true })
      .eq('id', reviewId)

    if (error) {
      alert(`Fout: ${error.message}`)
    } else {
      alert('✅ Review goedgekeurd!')
      fetchReviews()
    }
  }

  const handleReject = async (reviewId: string) => {
    if (!confirm('Weet je zeker dat je deze review wilt verwijderen?')) return

    const supabase = createClient()

    const { error } = await supabase
      .from('product_reviews')
      .delete()
      .eq('id', reviewId)

    if (error) {
      alert(`Fout: ${error.message}`)
    } else {
      alert('Review verwijderd')
      fetchReviews()
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Reviews beheren</h1>
        <Link
          href="/admin"
          className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-6 uppercase tracking-wider transition-colors"
        >
          ← Terug
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('pending')}
          className={`px-6 py-3 font-bold uppercase tracking-wider transition-colors ${
            filter === 'pending'
              ? 'bg-brand-primary text-white'
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          Te beoordelen
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-6 py-3 font-bold uppercase tracking-wider transition-colors ${
            filter === 'approved'
              ? 'bg-brand-primary text-white'
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          Goedgekeurd
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-6 py-3 font-bold uppercase tracking-wider transition-colors ${
            filter === 'all'
              ? 'bg-brand-primary text-white'
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          Alles
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-brand-primary"></div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-gray-100 border-2 border-gray-200 p-12 text-center">
          <p className="text-gray-600">Geen reviews gevonden</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white border-2 border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {renderStars(review.rating)}
                    {review.is_approved ? (
                      <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 uppercase">
                        Goedgekeurd
                      </span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 uppercase">
                        Wacht op goedkeuring
                      </span>
                    )}
                    {review.is_verified_purchase && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 uppercase">
                        Geverifieerde koop
                      </span>
                    )}
                  </div>

                  {review.title && <h3 className="font-bold text-lg mb-2">{review.title}</h3>}
                  {review.comment && <p className="text-gray-700 mb-3">{review.comment}</p>}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Product:</span>
                      <Link
                        href={`/product/${review.products.slug}`}
                        className="ml-2 font-semibold hover:text-brand-primary"
                        target="_blank"
                      >
                        {review.products.name}
                      </Link>
                    </div>
                    <div>
                      <span className="text-gray-600">Reviewer:</span>
                      <span className="ml-2 font-semibold">{review.reviewer_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <span className="ml-2">{review.reviewer_email}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Datum:</span>
                      <span className="ml-2">
                        {new Date(review.created_at).toLocaleDateString('nl-NL', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
                {!review.is_approved && (
                  <button
                    onClick={() => handleApprove(review.id)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 uppercase tracking-wider transition-colors"
                  >
                    ✓ Goedkeuren
                  </button>
                )}
                <button
                  onClick={() => handleReject(review.id)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 uppercase tracking-wider transition-colors"
                >
                  ✕ Verwijderen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


