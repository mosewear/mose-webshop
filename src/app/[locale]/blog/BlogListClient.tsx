'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { Link, useRouter, usePathname } from '@/i18n/routing'

interface BlogPost {
  id: string
  title_nl: string
  title_en: string
  slug: string
  excerpt_nl: string | null
  excerpt_en: string | null
  featured_image_url: string | null
  category: string | null
  author: string
  reading_time: number
  published_at: string | null
  created_at: string
}

interface BlogListClientProps {
  posts: BlogPost[]
  categories: string[]
}

const PAGE_SIZE = 9

export default function BlogListClient({ posts, categories }: BlogListClientProps) {
  const locale = useLocale() as 'nl' | 'en'
  const t = useTranslations('blog')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedCategory = searchParams.get('category') ?? 'all'
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const setCategory = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') params.delete('category')
    else params.set('category', value)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    setVisibleCount(PAGE_SIZE)
  }

  const getTitle = (post: BlogPost) =>
    locale === 'en' && post.title_en ? post.title_en : post.title_nl

  const getExcerpt = (post: BlogPost) =>
    locale === 'en' && post.excerpt_en ? post.excerpt_en : post.excerpt_nl

  const filteredPosts = useMemo(
    () =>
      selectedCategory === 'all'
        ? posts
        : posts.filter((p) => p.category === selectedCategory),
    [posts, selectedCategory]
  )

  const featuredPost = filteredPosts[0]
  const remainingPosts = filteredPosts.slice(1)
  const visibleRemaining = remainingPosts.slice(0, visibleCount)
  const hasMore = remainingPosts.length > visibleCount

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString(locale === 'en' ? 'en-GB' : 'nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const categoryLabel = (slug: string) => {
    const key = `categories.${slug}`
    return t.has(key as never) ? (t(key as never) as string) : slug
  }

  const categoryOptions = [
    { value: 'all', label: t('allCategories') },
    ...categories.map((c) => ({ value: c, label: categoryLabel(c) })),
  ]

  return (
    <div className="bg-white">
      <section className="relative h-48 md:h-80 overflow-hidden border-b-4 border-brand-primary">
        <Image
          src="/hero-desktop.webp"
          alt="MOSE Blog"
          fill
          sizes="100vw"
          className="object-cover object-[center_30%]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90" />
        <div className="relative h-full flex flex-col items-center justify-center text-white text-center px-4">
          <h1 className="font-display text-7xl md:text-9xl tracking-tight">BLOG</h1>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-wrap gap-2 mb-8 md:mb-12" role="group" aria-label={t('title')}>
          {categoryOptions.map((cat) => {
            const isActive = selectedCategory === cat.value
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                aria-pressed={isActive}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wider border-2 transition-all ${
                  isActive
                    ? 'bg-brand-primary border-brand-primary text-white'
                    : 'border-gray-300 text-gray-700 hover:border-black'
                }`}
              >
                {cat.label}
              </button>
            )
          })}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-16">
            <svg
              aria-hidden="true"
              className="w-20 h-20 text-gray-300 mx-auto mb-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <h3 className="text-2xl font-display font-bold mb-2 text-gray-800">
              {t('noPosts')}
            </h3>
          </div>
        )}

        {featuredPost && (
          <Link
            href={`/blog/${featuredPost.slug}`}
            className="group block mb-8 md:mb-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-2 border-black overflow-hidden bg-white md:hover:-translate-y-1 transition-all duration-300">
              <div className="relative aspect-[4/3] md:aspect-auto bg-gray-100 overflow-hidden">
                {featuredPost.featured_image_url && !failedImages.has(featuredPost.id) ? (
                  <Image
                    src={featuredPost.featured_image_url}
                    alt={getTitle(featuredPost)}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    onError={() => setFailedImages((prev) => new Set(prev).add(featuredPost.id))}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <svg aria-hidden="true" className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-6 md:p-8 flex flex-col justify-center">
                {featuredPost.category && (
                  <span className="inline-block self-start bg-brand-primary text-white px-3 py-1 text-xs font-bold uppercase tracking-wider mb-4">
                    {categoryLabel(featuredPost.category)}
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
                  <span aria-hidden="true">&middot;</span>
                  <span>{formatDate(featuredPost.published_at || featuredPost.created_at)}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>{t('minuteRead', { minutes: featuredPost.reading_time })}</span>
                </div>
                <span className="inline-flex items-center gap-2 mt-6 text-sm font-bold uppercase tracking-wider text-brand-primary group-hover:gap-3 transition-all">
                  {t('readMore')}
                  <svg aria-hidden="true" className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        )}

        {visibleRemaining.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleRemaining.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group block"
              >
                <div className="bg-white border-2 border-black overflow-hidden md:hover:-translate-y-2 transition-all duration-300 h-full flex flex-col">
                  <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                    {post.featured_image_url && !failedImages.has(post.id) ? (
                      <Image
                        src={post.featured_image_url}
                        alt={getTitle(post)}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        onError={() => setFailedImages((prev) => new Set(prev).add(post.id))}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <svg aria-hidden="true" className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                      </div>
                    )}
                    {post.category && (
                      <div className="absolute top-3 left-3 bg-brand-primary text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
                        {categoryLabel(post.category)}
                      </div>
                    )}
                  </div>

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
                      <svg aria-hidden="true" className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="px-6 py-3 border-2 border-black text-sm font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
            >
              {t('loadMore')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
