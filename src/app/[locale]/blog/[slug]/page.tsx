import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import BlogDetailClient from './BlogDetailClient'
import { getBlogPost, getRelatedBlogPosts, renderBlogMarkdown } from '@/lib/blog'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const post = await getBlogPost(slug)

  if (!post) {
    return { title: 'Blog - MOSE' }
  }

  const title = locale === 'en'
    ? (post.seo_title_en || post.title_en || post.title_nl)
    : (post.seo_title_nl || post.title_nl)
  const description = locale === 'en'
    ? (post.seo_description_en || post.excerpt_en || post.excerpt_nl || '')
    : (post.seo_description_nl || post.excerpt_nl || '')

  const publishedTime = post.published_at ?? undefined
  const modifiedTime = post.updated_at

  return {
    title: `${title} - MOSE Blog`,
    description,
    authors: [{ name: post.author }],
    openGraph: {
      title: `${title} - MOSE Blog`,
      description,
      type: 'article',
      url: `https://www.mosewear.com/${locale}/blog/${slug}`,
      publishedTime,
      modifiedTime,
      authors: [post.author],
      section: post.category ?? undefined,
      tags: post.tags ?? undefined,
      images: post.featured_image_url
        ? [
            {
              url: post.featured_image_url,
              width: 1200,
              height: 630,
              alt: title,
            },
          ]
        : [
            {
              url: 'https://www.mosewear.com/hero_mose.png',
              width: 1200,
              height: 630,
              alt: 'MOSE Blog',
            },
          ],
      siteName: 'MOSE',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} - MOSE Blog`,
      description,
      site: '@mosewear',
      creator: '@mosewear',
      images: post.featured_image_url
        ? [post.featured_image_url]
        : ['https://www.mosewear.com/hero_mose.png'],
    },
    alternates: {
      canonical: `/${locale}/blog/${slug}`,
      languages: {
        nl: `/nl/blog/${slug}`,
        en: `/en/blog/${slug}`,
      },
    },
  }
}

export const revalidate = 1800

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const post = await getBlogPost(slug)
  if (!post) notFound()

  const relatedPosts = await getRelatedBlogPosts(post.id, post.category, 3)

  const title = locale === 'en' && post.title_en ? post.title_en : post.title_nl
  const isEnglish = locale === 'en'
  const hasEnglishContent = isEnglish && Boolean(post.content_en?.trim())
  const rawContent = hasEnglishContent ? post.content_en : post.content_nl
  const contentHtml = renderBlogMarkdown(rawContent)
  const showEnglishFallback = isEnglish && !hasEnglishContent

  const canonicalUrl = `https://www.mosewear.com/${locale}/blog/${slug}`

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: locale === 'en'
      ? (post.excerpt_en || post.excerpt_nl || '')
      : (post.excerpt_nl || ''),
    image: post.featured_image_url || 'https://www.mosewear.com/hero_mose.png',
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'MOSE',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.mosewear.com/logomose.png',
      },
    },
    datePublished: post.published_at ?? post.created_at,
    dateModified: post.updated_at,
    articleSection: post.category ?? undefined,
    keywords: post.tags?.join(', ') ?? undefined,
    url: canonicalUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `https://www.mosewear.com/${locale}`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Blog',
          item: `https://www.mosewear.com/${locale}/blog`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: title,
          item: canonicalUrl,
        },
      ],
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <BlogDetailClient
        post={{
          id: post.id,
          slug: post.slug,
          title_nl: post.title_nl,
          title_en: post.title_en,
          featured_image_url: post.featured_image_url,
          category: post.category,
          tags: post.tags,
          author: post.author,
          reading_time: post.reading_time,
          published_at: post.published_at,
          created_at: post.created_at,
        }}
        contentHtml={contentHtml}
        canonicalUrl={canonicalUrl}
        showEnglishFallback={showEnglishFallback}
        relatedPosts={relatedPosts.map((p) => ({
          id: p.id,
          slug: p.slug,
          title_nl: p.title_nl,
          title_en: p.title_en,
          excerpt_nl: p.excerpt_nl,
          excerpt_en: p.excerpt_en,
          featured_image_url: p.featured_image_url,
          category: p.category,
          author: p.author,
          reading_time: p.reading_time,
          published_at: p.published_at,
          created_at: p.created_at,
        }))}
      />
    </>
  )
}
