'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface ReviewImage {
  id: string
  storage_path: string
  position: number
  is_approved: boolean
  url: string
}

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
  product_review_images?: ReviewImage[]
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0 })

  useEffect(() => {
    fetchReviews()
  }, [filter])

  useEffect(() => {
    fetchCounts()
  }, [])

  const fetchCounts = async () => {
    const res = await fetch('/api/admin/reviews?filter=all')
    if (res.ok) {
      const { reviews: all } = await res.json()
      setCounts({
        total: all.length,
        pending: all.filter((r: Review) => !r.is_approved).length,
        approved: all.filter((r: Review) => r.is_approved).length,
      })
    }
  }

  const fetchReviews = async () => {
    setLoading(true)

    const res = await fetch(`/api/admin/reviews?filter=${filter}`)

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      console.error('Error fetching reviews:', errData.error || res.statusText)
      toast.error('Kon reviews niet laden')
      setLoading(false)
      return
    }

    const { reviews: data } = await res.json()
    setReviews(data || [])
    setLoading(false)
  }

  const handleApprove = async (reviewId: string) => {
    const res = await fetch('/api/admin/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId, action: 'approve' }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      toast.error(`Fout: ${errData.error || 'Onbekende fout'}`)
    } else {
      toast.success('Review goedgekeurd!')
      fetchReviews()
      fetchCounts()
    }
  }

  const handleReject = async (reviewId: string) => {
    if (!confirm('Weet je zeker dat je deze review wilt verwijderen?')) return

    const res = await fetch('/api/admin/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId, action: 'delete' }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      toast.error(`Fout: ${errData.error || 'Onbekende fout'}`)
    } else {
      toast.success('Review verwijderd')
      fetchReviews()
      fetchCounts()
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Foto verwijderen?')) return

    const res = await fetch('/api/admin/reviews', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageId }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      toast.error(`Fout: ${errData.error || 'Onbekende fout'}`)
    } else {
      toast.success('Foto verwijderd')
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
            { value: 'all' as const, label: 'Alles', count: counts.total },
            { value: 'pending' as const, label: 'Te beoordelen', count: counts.pending },
            { value: 'approved' as const, label: 'Goedgekeurd', count: counts.approved },
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
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-brand-primary mb-2">{counts.total}</div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Totaal</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200">
          <div className="text-2xl md:text-3xl font-bold text-yellow-600 mb-2">{counts.pending}</div>
          <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Te beoordelen</div>
        </div>
        <div className="bg-white p-4 md:p-6 border-2 border-gray-200 col-span-2 md:col-span-1">
          <div className="text-2xl md:text-3xl font-bold text-green-600 mb-2">{counts.approved}</div>
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

                {review.product_review_images && review.product_review_images.length > 0 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto">
                    {review.product_review_images.map((img) => (
                      <div key={img.id} className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt="Review foto"
                          className={`w-16 h-16 object-cover border-2 ${
                            img.is_approved ? 'border-green-500' : 'border-yellow-500'
                          }`}
                        />
                        <button
                          onClick={() => handleDeleteImage(img.id)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs flex items-center justify-center border border-white"
                          aria-label="Foto verwijderen"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-xs text-gray-600 space-y-1 mb-3">
                  <div><span className="font-semibold">Product:</span> {review.products?.name || 'Onbekend'}</div>
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
                      <div className="flex items-start gap-3">
                        <div>
                          {renderStars(review.rating)}
                          {review.title && <div className="font-bold text-sm mt-1">{review.title}</div>}
                          {review.comment && <div className="text-xs text-gray-600 mt-1 line-clamp-1 max-w-[300px]">{review.comment}</div>}
                          <div className="text-xs text-gray-500 mt-1">{review.reviewer_name} ({review.reviewer_email})</div>
                          {review.product_review_images && review.product_review_images.length > 0 && (
                            <div className="flex gap-1.5 mt-2">
                              {review.product_review_images.map((img) => (
                                <div key={img.id} className="relative">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={img.url}
                                    alt="Review foto"
                                    className={`w-12 h-12 object-cover border-2 ${
                                      img.is_approved ? 'border-green-500' : 'border-yellow-500'
                                    }`}
                                  />
                                  <button
                                    onClick={() => handleDeleteImage(img.id)}
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[10px] flex items-center justify-center border border-white"
                                    aria-label="Foto verwijderen"
                                    title="Foto verwijderen"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/product/${review.products?.slug}`}
                        target="_blank"
                        className="text-sm font-semibold text-brand-primary hover:underline"
                      >
                        {review.products?.name || 'Onbekend'}
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
