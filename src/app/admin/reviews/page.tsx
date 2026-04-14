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
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Reviews</h1>
          <p className="text-gray-600 text-sm md:text-base">Beheer productreviews</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-2 border-gray-200 p-4 mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {([
            { value: 'pending' as const, label: 'Te beoordelen' },
            { value: 'approved' as const, label: 'Goedgekeurd' },
            { value: 'all' as const, label: 'Alles' },
          ]).map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all whitespace-nowrap ${
                filter === f.value
                  ? 'bg-brand-primary border-brand-primary text-white'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-brand-primary mb-2">{reviews.length}</div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Totaal</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-yellow-600 mb-2">
            {reviews.filter(r => !r.is_approved).length}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Te beoordelen</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200 col-span-2 md:col-span-1">
          <div className="text-2xl md:text-3xl font-bold text-green-600 mb-2">
            {reviews.filter(r => r.is_approved).length}
          </div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Goedgekeurd</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white border-2 border-gray-200 text-center py-12">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-700 mb-2">Geen reviews gevonden</h3>
          <p className="text-gray-500">Reviews verschijnen hier zodra klanten er plaatsen!</p>
        </div>
      ) : (
        <div className="bg-white border-2 border-gray-200">
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 p-3">
            {reviews.map((review) => (
              <div key={review.id} className="border-2 border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    {renderStars(review.rating)}
                    {review.title && <h3 className="font-bold text-sm mt-2 truncate">{review.title}</h3>}
                  </div>
                  <span className={`flex-shrink-0 px-2 py-1 text-xs font-bold border ${
                    review.is_approved
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  }`}>
                    {review.is_approved ? 'Goedgekeurd' : 'Wachtend'}
                  </span>
                </div>

                {review.comment && <p className="text-sm text-gray-700 mb-3 line-clamp-2">{review.comment}</p>}

                <div className="text-xs text-gray-600 space-y-1 mb-3">
                  <div><span className="font-semibold">Product:</span> {review.products.name}</div>
                  <div><span className="font-semibold">Door:</span> {review.reviewer_name}</div>
                  <div>{new Date(review.created_at).toLocaleDateString('nl-NL')}</div>
                </div>

                <div className="flex gap-2">
                  {!review.is_approved && (
                    <button
                      onClick={() => handleApprove(review.id)}
                      className="flex-1 text-center text-green-700 border-2 border-green-600 py-2 text-xs font-bold uppercase active:scale-95 transition-transform"
                    >
                      Goedkeuren
                    </button>
                  )}
                  <button
                    onClick={() => handleReject(review.id)}
                    className="flex-1 text-center text-red-600 border-2 border-red-600 py-2 text-xs font-bold uppercase active:scale-95 transition-transform"
                  >
                    Verwijderen
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Review</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Datum</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Acties</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div>
                          {renderStars(review.rating)}
                          {review.title && <div className="font-bold text-sm mt-1">{review.title}</div>}
                          {review.comment && <div className="text-xs text-gray-600 mt-1 line-clamp-1 max-w-[300px]">{review.comment}</div>}
                          <div className="text-xs text-gray-500 mt-1">{review.reviewer_name} ({review.reviewer_email})</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/product/${review.products.slug}`}
                        target="_blank"
                        className="text-sm font-semibold text-brand-primary hover:underline"
                      >
                        {review.products.name}
                      </Link>
                      {review.is_verified_purchase && (
                        <div className="text-xs text-blue-600 mt-1">Geverifieerde koop</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-semibold border-2 inline-block ${
                        review.is_approved
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      }`}>
                        {review.is_approved ? 'Goedgekeurd' : 'Wachtend'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {!review.is_approved && (
                          <button
                            onClick={() => handleApprove(review.id)}
                            className="text-green-600 hover:text-green-800 font-semibold"
                          >
                            Goedkeuren
                          </button>
                        )}
                        <button
                          onClick={() => handleReject(review.id)}
                          className="text-red-600 hover:text-red-900 font-semibold"
                        >
                          Verwijderen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}



