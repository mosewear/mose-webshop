'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

interface BlogPost {
  id: string
  title_nl: string
  title_en: string
  slug: string
  excerpt_nl: string | null
  excerpt_en: string | null
  featured_image_url: string | null
  category: string | null
  status: 'draft' | 'published'
  author: string
  reading_time: number
  published_at: string | null
  created_at: string
}

const CATEGORIES = [
  { value: 'all', label: { nl: 'Alle', en: 'All' } },
  { value: 'algemeen', label: { nl: 'Algemeen', en: 'General' } },
  { value: 'style', label: { nl: 'Style', en: 'Style' } },
  { value: 'drops', label: { nl: 'Drops', en: 'Drops' } },
  { value: 'behind-the-scenes', label: { nl: 'Behind the Scenes', en: 'Behind the Scenes' } },
  { value: 'sustainability', label: { nl: 'Duurzaamheid', en: 'Sustainability' } },
  { value: 'groningen', label: { nl: 'Groningen', en: 'Groningen' } },
]

export default function BlogListClient() {
  const locale = useLocale() as 'nl' | 'en'
  const t = useTranslations('blog')
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title_nl, title_en, slug, excerpt_nl, excerpt_en, featured_image_url, category, status, author, reading_time, published_at, created_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (err) {
      console.error('Error fetching blog posts:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTitle = (post: BlogPost) =>
    locale === 'en' && post.title_en ? post.title_en : post.title_nl

  const getExcerpt = (post: BlogPost) =>
    locale === 'en' && post.excerpt_en ? post.excerpt_en : post.excerpt_nl

  const filteredPosts = selectedCategory === 'all'
    ? posts
    : posts.filter(p => p.category === selectedCategory)

  const featuredPost = filteredPosts[0]
  const remainingPosts = filteredPosts.slice(1)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString(locale === 'en' ? 'en-US' : 'nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const categoryLabels: Record<string, string> = {
    algemeen: locale === 'en' ? 'General' : 'Algemeen',
    style: 'Style',
    drops: 'Drops',
    'behind-the-scenes': 'Behind the Scenes',
    sustainability: locale === 'en' ? 'Sustainability' : 'Duurzaamheid',
    groningen: 'Groningen',
  }

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative h-48 md:h-80 overflow-hidden border-b-4 border-brand-primary">
        <Image
          src="/hero_mose.png"
          alt="MOSE Blog"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90" />
        <div className="relative h-full flex flex-col items-center justify-center text-white text-center px-4">
          <h1 className="font-display text-7xl md:text-9xl tracking-tight">BLOG</h1>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-8 md:mb-12">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-wider border-2 transition-all ${
                selectedCategory === cat.value
                  ? 'bg-brand-primary border-brand-primary text-white'
                  : 'border-gray-300 text-gray-700 hover:border-black'
              }`}
            >
              {cat.label[locale]}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-100 aspect-[4/3] animate-pulse border-2 border-gray-200" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredPosts.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <h3 className="text-2xl font-display font-bold mb-2 text-gray-800">
              {t('noPosts')}
            </h3>
          </div>
        )}

        {/* Featured Post */}
        {!loading && featuredPost && (
          <Link href={`/blog/${featuredPost.slug}`} className="group block mb-8 md:mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-2 border-black overflow-hidden bg-white md:hover:-translate-y-1 transition-all duration-300">
              <div className="relative aspect-[4/3] md:aspect-auto bg-gray-100 overflow-hidden">
                {featuredPost.featured_image_url && !failedImages.has(featuredPost.id) ? (
                  <Image
                    src={featuredPost.featured_image_url}
                    alt={getTitle(featuredPost)}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    priority
                    onError={() => setFailedImages(prev => new Set(prev).add(featuredPost.id))}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-6 md:p-8 flex flex-col justify-center">
                {featuredPost.category && (
                  <span className="inline-block self-start bg-brand-primary text-white px-3 py-1 text-xs font-bold uppercase tracking-wider mb-4">
                    {categoryLabels[featuredPost.category] || featuredPost.category}
                  </span>
                )}
                <h2 className="font-display text-2xl md:text-4xl mb-4 tracking-tight group-hover:text-brand-primary transition-colors">
                  {getTitle(featuredPost)}
                </h2>
                {getExcerpt(featuredPost) && (
                  <p className="text-gray-600 leading-relaxed mb-4 line-clamp-3">
                    {getExcerpt(featuredPost)}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{featuredPost.author}</span>
                  <span>&middot;</span>
                  <span>{formatDate(featuredPost.published_at || featuredPost.created_at)}</span>
                  <span>&middot;</span>
                  <span>{t('minuteRead', { minutes: featuredPost.reading_time })}</span>
                </div>
                <span className="inline-flex items-center gap-2 mt-6 text-sm font-bold uppercase tracking-wider text-brand-primary group-hover:gap-3 transition-all">
                  {t('readMore')}
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Remaining Posts Grid */}
        {!loading && remainingPosts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {remainingPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group block"
              >
                <div className="bg-white border-2 border-black overflow-hidden md:hover:-translate-y-2 transition-all duration-300 h-full flex flex-col">
                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                    {post.featured_image_url && !failedImages.has(post.id) ? (
                      <Image
                        src={post.featured_image_url}
                        alt={getTitle(post)}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        onError={() => setFailedImages(prev => new Set(prev).add(post.id))}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                      </div>
                    )}
                    {post.category && (
                      <div className="absolute top-3 left-3 bg-brand-primary text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
                        {categoryLabels[post.category] || post.category}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 md:p-6 flex flex-col flex-grow">
                    <h3 className="font-bold text-lg uppercase tracking-wide mb-2 group-hover:text-brand-primary transition-colors line-clamp-2">
                      {getTitle(post)}
                    </h3>
                    {getExcerpt(post) && (
                      <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2 flex-grow">
                        {getExcerpt(post)}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-4 border-t border-gray-200">
                      <span>{formatDate(post.published_at || post.created_at)}</span>
                      <span>{t('minuteRead', { minutes: post.reading_time })}</span>
                    </div>
                    <span className="inline-flex items-center gap-2 mt-4 text-sm font-bold uppercase tracking-wider text-brand-primary group-hover:gap-3 transition-all">
                      {t('readMore')}
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
