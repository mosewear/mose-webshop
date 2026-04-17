'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
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
  category: string | null
  tags: string[] | null
  status: 'draft' | 'published'
  author: string
  reading_time: number
  published_at: string | null
  created_at: string
}

interface RelatedPost {
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

interface BlogDetailClientProps {
  post: BlogPost
  relatedPosts: RelatedPost[]
}

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  html = html.replace(/^### (.+)$/gm, '<h3 class="text-xl font-display font-bold mt-8 mb-3">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-display font-bold mt-10 mb-4">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-3xl font-display font-bold mt-12 mb-4">$1</h1>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/^- (.+)$/gm, '<li class="ml-6 list-disc">$1</li>')

  const paragraphs = html.split(/\n\n+/)
  html = paragraphs
    .map(p => {
      const trimmed = p.trim()
      if (!trimmed) return ''
      if (trimmed.startsWith('<h') || trimmed.startsWith('<li')) return trimmed
      if (trimmed.includes('<li')) {
        return `<ul class="my-4 space-y-1">${trimmed}</ul>`
      }
      return `<p class="mb-4">${trimmed.replace(/\n/g, '<br />')}</p>`
    })
    .join('\n')

  return html
}

export default function BlogDetailClient({ post, relatedPosts }: BlogDetailClientProps) {
  const locale = useLocale() as 'nl' | 'en'
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const title = locale === 'en' && post.title_en ? post.title_en : post.title_nl
  const content = locale === 'en' && post.content_en ? post.content_en : post.content_nl
  const getRelatedTitle = (p: RelatedPost) =>
    locale === 'en' && p.title_en ? p.title_en : p.title_nl
  const getRelatedExcerpt = (p: RelatedPost) =>
    locale === 'en' && p.excerpt_en ? p.excerpt_en : p.excerpt_nl

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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success(t('linkCopied'))
    } catch {
      toast.error(locale === 'en' ? 'Could not copy link' : 'Kon link niet kopiëren')
    }
  }

  const shareUrl = typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''
  const shareTitle = encodeURIComponent(title)

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 pt-8 md:pt-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 md:mb-8">
          <Link href="/" className="hover:text-brand-primary transition-colors">
            Home
          </Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/blog" className="hover:text-brand-primary transition-colors">
            Blog
          </Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-semibold truncate max-w-xs">{title}</span>
        </nav>
      </div>

      {/* Featured Image */}
      {post.featured_image_url && (
        <div className="max-w-7xl mx-auto px-4 mb-8 md:mb-12">
          <div className="relative aspect-[21/9] border-4 border-black overflow-hidden">
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

      {/* Article Header */}
      <div className="max-w-3xl mx-auto px-4 mb-8 md:mb-12">
        {post.category && (
          <span className="inline-block bg-brand-primary text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider mb-6">
            {categoryLabels[post.category] || post.category}
          </span>
        )}
        <h1 className="font-display text-4xl md:text-6xl tracking-tight mb-6 leading-tight">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pb-6 border-b-2 border-gray-200">
          <span className="font-semibold text-gray-900">{post.author}</span>
          <span>&middot;</span>
          <span>{formatDate(post.published_at || post.created_at)}</span>
          <span>&middot;</span>
          <span>{t('minuteRead', { minutes: post.reading_time })}</span>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-3xl mx-auto px-4 mb-12 md:mb-16">
        <div
          className="prose prose-lg max-w-none text-gray-800 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t-2 border-gray-200">
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
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

        {/* Share Buttons */}
        <div className="mt-10 pt-6 border-t-2 border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
            {t('shareArticle')}
          </h3>
          <div className="flex gap-3">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-sm font-bold uppercase tracking-wider hover:border-black transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              {locale === 'en' ? 'Copy link' : 'Kopieer link'}
            </button>
            <a
              href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-sm font-bold uppercase tracking-wider hover:border-black transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
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
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </a>
          </div>
        </div>
      </article>

      {/* Back to Blog */}
      <div className="max-w-3xl mx-auto px-4 mb-12">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-primary hover:gap-3 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          {t('backToBlog')}
        </Link>
      </div>

      {/* Related Posts */}
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
                          onError={() => setFailedImages(prev => new Set(prev).add(relPost.id))}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <span>{relPost.reading_time} min</span>
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
