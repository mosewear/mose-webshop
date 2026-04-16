'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface BlogPost {
  id: string
  title_nl: string
  title_en: string
  slug: string
  excerpt_nl: string | null
  excerpt_en: string | null
  content_nl: string
  content_en: string
  featured_image_url: string | null
  category: string
  tags: string[] | null
  status: 'draft' | 'published'
  author: string
  reading_time: number
  seo_title_nl: string | null
  seo_title_en: string | null
  seo_description_nl: string | null
  seo_description_en: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 25
  const supabase = createClient()

  useEffect(() => {
    fetchPosts()
  }, [page])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      setError('')

      const { count } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })

      setTotalCount(count || 0)

      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (error) throw error
      setPosts(data || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Onbekende fout'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Weet je zeker dat je "${title}" wilt verwijderen?`)) return

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Artikel verwijderd')
      fetchPosts()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Onbekende fout'
      toast.error(`Fout bij verwijderen: ${message}`)
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published'
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          status: newStatus,
          published_at: newStatus === 'published' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error
      toast.success(newStatus === 'published' ? 'Artikel gepubliceerd' : 'Artikel als concept opgeslagen')
      fetchPosts()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Onbekende fout'
      toast.error(`Fout: ${message}`)
    }
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = searchQuery === '' ||
      post.title_nl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.title_en.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const publishedCount = posts.filter(p => p.status === 'published').length
  const draftCount = posts.filter(p => p.status === 'draft').length

  const categoryLabels: Record<string, string> = {
    style: 'Style',
    drops: 'Drops',
    'behind-the-scenes': 'Behind the Scenes',
    sustainability: 'Sustainability',
    groningen: 'Groningen',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Blog</h1>
          <p className="text-gray-600">Beheer alle blogartikelen</p>
        </div>
        <div className="grid grid-cols-1 md:flex md:w-auto gap-2 w-full">
          <Link
            href="/admin/blog/create"
            className="w-full md:w-auto text-center bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 md:py-3 px-3 md:px-6 text-xs md:text-base uppercase tracking-wider transition-colors"
          >
            + Nieuw Artikel
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white p-4 sm:p-6 border-2 border-gray-200">
          <div className="text-2xl sm:text-3xl font-bold text-brand-primary mb-1 sm:mb-2">{posts.length}</div>
          <div className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide">Totaal Artikelen</div>
        </div>
        <div className="bg-white p-4 sm:p-6 border-2 border-gray-200">
          <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1 sm:mb-2">{publishedCount}</div>
          <div className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide">Gepubliceerd</div>
        </div>
        <div className="bg-white p-4 sm:p-6 border-2 border-gray-200">
          <div className="text-2xl sm:text-3xl font-bold text-yellow-600 mb-1 sm:mb-2">{draftCount}</div>
          <div className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide">Concepten</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek artikelen..."
            className="w-full px-4 py-3 pr-12 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
          />
          <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft')}
          className="px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors font-semibold"
        >
          <option value="all">Alle statussen</option>
          <option value="published">Gepubliceerd</option>
          <option value="draft">Concept</option>
        </select>
      </div>

      {/* Posts Table */}
      <div className="bg-white border-2 border-gray-200 overflow-hidden">
        {filteredPosts.length === 0 ? (
          posts.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-bold text-gray-700 mb-2">Nog geen artikelen</h3>
              <p className="text-gray-500 mb-6">Begin met het schrijven van je eerste blogartikel!</p>
              <Link
                href="/admin/blog/create"
                className="inline-block bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors"
              >
                + Nieuw Artikel
              </Link>
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-bold text-gray-700 mb-2">Geen resultaten</h3>
              <p className="text-gray-500 mb-6">Geen artikelen gevonden voor je zoekopdracht.</p>
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all') }}
                className="inline-block border-2 border-black font-bold py-3 px-6 uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                Filters resetten
              </button>
            </div>
          )
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 p-3">
              {filteredPosts.map((post) => (
                <div key={post.id} className="border-2 border-gray-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-gray-900 truncate">{post.title_nl}</div>
                      <div className="text-xs text-gray-500 truncate">{post.slug}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`px-2 py-1 text-xs font-semibold border ${
                          post.status === 'published'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                        }`}>
                          {post.status === 'published' ? 'Gepubliceerd' : 'Concept'}
                        </span>
                        {post.category && (
                          <span className="px-2 py-1 text-xs font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                            {categoryLabels[post.category] || post.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-xs text-gray-500">
                      {new Date(post.created_at).toLocaleDateString('nl-NL')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {post.reading_time} min
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/admin/blog/${post.id}/edit`}
                      className="flex-1 text-center text-brand-primary border-2 border-brand-primary py-2 text-sm font-semibold"
                    >
                      Bewerken
                    </Link>
                    <button
                      onClick={() => handleToggleStatus(post.id, post.status)}
                      className="flex-1 text-center text-gray-700 border-2 border-gray-300 py-2 text-sm font-semibold"
                    >
                      {post.status === 'published' ? 'Depubliceer' : 'Publiceer'}
                    </button>
                    <button
                      onClick={() => handleDelete(post.id, post.title_nl)}
                      className="flex-1 text-center text-red-600 border-2 border-red-600 py-2 text-sm font-semibold"
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
                <caption className="sr-only">Overzicht van blogartikelen</caption>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Titel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Categorie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPosts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-bold text-gray-900">{post.title_nl}</div>
                          <div className="text-xs text-gray-500">{post.slug} &middot; {post.reading_time} min leestijd</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(post.id, post.status)}
                          className={`px-3 py-1 text-xs font-semibold border inline-block cursor-pointer transition-colors ${
                            post.status === 'published'
                              ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                              : 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200'
                          }`}
                        >
                          {post.status === 'published' ? 'Gepubliceerd' : 'Concept'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {post.category ? (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                            {categoryLabels[post.category] || post.category}
                          </span>
                        ) : (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            Geen categorie
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(post.created_at).toLocaleDateString('nl-NL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-3">
                          <Link
                            href={`/admin/blog/${post.id}/edit`}
                            className="text-brand-primary hover:text-brand-primary-hover font-semibold"
                          >
                            Bewerken
                          </Link>
                          <button
                            onClick={() => handleDelete(post.id, post.title_nl)}
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
          </>
        )}
        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between p-4 border-t-2 border-gray-200">
            <div className="text-sm text-gray-600">
              Pagina {page} van {Math.ceil(totalCount / PAGE_SIZE)} ({totalCount} items)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border-2 border-gray-300 text-sm font-bold uppercase disabled:opacity-30 hover:border-black transition-colors"
              >
                Vorige
              </button>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(totalCount / PAGE_SIZE), p + 1))}
                disabled={page >= Math.ceil(totalCount / PAGE_SIZE)}
                className="px-4 py-2 border-2 border-gray-300 text-sm font-bold uppercase disabled:opacity-30 hover:border-black transition-colors"
              >
                Volgende
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
