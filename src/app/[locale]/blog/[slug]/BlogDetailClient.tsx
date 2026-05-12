'use client'

import { useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import toast from 'react-hot-toast'

interface BlogPost {
  id: string
  slug: string
  title_nl: string
  title_en: string
  featured_image_url: string | null
  category: string | null
  tags: string[] | null
  author: string
  reading_time: number
  published_at: string | null
  created_at: string
}

interface RelatedPost {
  id: string
  slug: string
  title_nl: string
  title_en: string
  excerpt_nl: string | null
  excerpt_en: string | null
  featured_image_url: string | null
  category: string | null
  author: string
  reading_time: number
  published_at: string | null
  created_at: string
}

interface BlogDetailClientProps {
  post: BlogPost
  contentHtml: string
  canonicalUrl: string
  showEnglishFallback: boolean
  relatedPosts: RelatedPost[]
}

export default function BlogDetailClient({
  post,
  contentHtml,
  canonicalUrl,
  showEnglishFallback,
  relatedPosts,
}: BlogDetailClientProps) {
  const locale = useLocale() as 'nl' | 'en'
  const t = useTranslations('blog')
  const tc = useTranslations('common.breadcrumb')
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const canNativeShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    () => false
  )

  const title = locale === 'en' && post.title_en ? post.title_en : post.title_nl

  const getRelatedTitle = (p: RelatedPost) =>
    locale === 'en' && p.title_en ? p.title_en : p.title_nl
  const getRelatedExcerpt = (p: RelatedPost) =>
    locale === 'en' && p.excerpt_en ? p.excerpt_en : p.excerpt_nl

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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl)
      toast.success(t('linkCopied'))
    } catch {
      toast.error(t('linkCopyFailed'))
    }
  }

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, url: canonicalUrl })
    } catch {
      // User cancelled or not supported, ignore
    }
  }

  const shareUrl = encodeURIComponent(canonicalUrl)
  const shareTitle = encodeURIComponent(title)

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 pt-8 md:pt-12">
        <nav
          className="flex items-center gap-2 text-sm text-gray-500 mb-6 md:mb-8"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="hover:text-brand-primary transition-colors">
            {tc('home')}
          </Link>
          <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/blog" className="hover:text-brand-primary transition-colors">
            {t('title')}
          </Link>
          <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-semibold truncate max-w-xs">{title}</span>
        </nav>
      </div>

      {post.featured_image_url && (
        <div className="max-w-7xl mx-auto px-4 mb-8 md:mb-12">
          <div className="relative aspect-[16/9] border-4 border-black overflow-hidden">
            <Image
              src={post.featured_image_url}
              alt={title}
              fill
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover"
              priority
            />
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 mb-8 md:mb-12">
        {post.category && (
          <span className="inline-block bg-brand-primary text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider mb-6">
            {categoryLabel(post.category)}
          </span>
        )}
        <h1 className="font-display text-4xl md:text-6xl tracking-tight mb-6 leading-tight">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pb-6 border-b-2 border-gray-200">
          <span className="font-semibold text-gray-900">{post.author}</span>
          <span aria-hidden="true">&middot;</span>
          <span>{formatDate(post.published_at || post.created_at)}</span>
          <span aria-hidden="true">&middot;</span>
          <span>{t('minuteRead', { minutes: post.reading_time })}</span>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 mb-12 md:mb-16">
        {showEnglishFallback && (
          <div
            role="note"
            className="mb-8 px-4 py-3 bg-yellow-50 border-l-4 border-yellow-400 text-sm text-yellow-900"
          >
            {t('englishFallback')}
          </div>
        )}

        <div
          className="prose prose-lg max-w-none text-gray-800 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />

        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t-2 border-gray-200">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-semibold border border-gray-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 pt-6 border-t-2 border-gray-200">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
            {t('shareArticle')}
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-sm font-bold uppercase tracking-wider hover:border-black transition-colors"
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 11-5.656-5.656l1.414-1.414M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.414 1.414" />
              </svg>
              {t('copyLink')}
            </button>
            {canNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-sm font-bold uppercase tracking-wider hover:border-black transition-colors"
              >
                <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {t('share')}
              </button>
            )}
            <a
              href={`https://wa.me/?text=${shareTitle}%20${shareUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-sm font-bold uppercase tracking-wider hover:border-black transition-colors"
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
            <a
              href={`https://x.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-sm font-bold uppercase tracking-wider hover:border-black transition-colors"
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              X
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-sm font-bold uppercase tracking-wider hover:border-black transition-colors"
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-sm font-bold uppercase tracking-wider hover:border-black transition-colors"
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn
            </a>
          </div>
        </div>
      </article>

      <div className="max-w-3xl mx-auto px-4 mb-12">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-primary hover:gap-3 transition-all"
        >
          <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          {t('backToBlog')}
        </Link>
      </div>

      {relatedPosts.length > 0 && (
        <section className="bg-gray-50 border-t-2 border-gray-200 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="font-display text-3xl md:text-4xl mb-8 tracking-tight text-center">
              {t('relatedPosts')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((relPost) => (
                <Link
                  key={relPost.id}
                  href={`/blog/${relPost.slug}`}
                  className="group block"
                >
                  <div className="bg-white border-2 border-black overflow-hidden md:hover:-translate-y-2 transition-all duration-300 h-full flex flex-col">
                    <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                      {relPost.featured_image_url && !failedImages.has(relPost.id) ? (
                        <Image
                          src={relPost.featured_image_url}
                          alt={getRelatedTitle(relPost)}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                          onError={() => setFailedImages((prev) => new Set(prev).add(relPost.id))}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <svg aria-hidden="true" className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-4 md:p-6 flex flex-col flex-grow">
                      <h3 className="font-bold text-lg uppercase tracking-wide mb-2 group-hover:text-brand-primary transition-colors line-clamp-2">
                        {getRelatedTitle(relPost)}
                      </h3>
                      {getRelatedExcerpt(relPost) && (
                        <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2 flex-grow">
                          {getRelatedExcerpt(relPost)}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-4 border-t border-gray-200">
                        <span>{formatDate(relPost.published_at || relPost.created_at)}</span>
                        <span>{t('minuteRead', { minutes: relPost.reading_time })}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
