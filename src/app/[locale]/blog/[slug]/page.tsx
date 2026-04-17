import type { Metadata } from 'next'
import { createAnonClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BlogDetailClient from './BlogDetailClient'

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
  seo_title_nl: string | null
  seo_title_en: string | null
  seo_description_nl: string | null
  seo_description_en: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const supabase = createAnonClient()

  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) {
    return { title: 'Blog - MOSE' }
  }

  const title = locale === 'en'
    ? (post.seo_title_en || post.title_en || post.title_nl)
    : (post.seo_title_nl || post.title_nl)
  const description = locale === 'en'
    ? (post.seo_description_en || post.excerpt_en || post.excerpt_nl || '')
    : (post.seo_description_nl || post.excerpt_nl || '')

  return {
    title: `${title} - MOSE Blog`,
    description,
    openGraph: {
      title: `${title} - MOSE Blog`,
      description,
      type: 'article',
      url: `https://www.mosewear.com/${locale}/blog/${slug}`,
      publishedTime: post.published_at || post.created_at,
      modifiedTime: post.updated_at,
      authors: [post.author],
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
  const supabase = createAnonClient()

  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) {
    notFound()
  }

  const typedPost = post as BlogPost

  let relatedQuery = supabase
    .from('blog_posts')
    .select('id, title_nl, title_en, slug, excerpt_nl, excerpt_en, featured_image_url, category, author, reading_time, published_at, created_at')
    .eq('status', 'published')
    .neq('id', typedPost.id)

  if (typedPost.category) {
    relatedQuery = relatedQuery.eq('category', typedPost.category)
  }

  const { data: relatedPosts } = await relatedQuery
    .order('published_at', { ascending: false })
    .limit(3)

  const title = locale === 'en' && typedPost.title_en ? typedPost.title_en : typedPost.title_nl
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: locale === 'en'
      ? (typedPost.excerpt_en || typedPost.excerpt_nl || '')
      : (typedPost.excerpt_nl || ''),
    image: typedPost.featured_image_url || 'https://www.mosewear.com/hero_mose.png',
    author: {
      '@type': 'Person',
      name: typedPost.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'MOSE',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.mosewear.com/logomose.png',
      },
    },
    datePublished: typedPost.published_at || typedPost.created_at,
    dateModified: typedPost.updated_at,
    url: `https://www.mosewear.com/${locale}/blog/${slug}`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.mosewear.com/${locale}/blog/${slug}`,
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
          item: `https://www.mosewear.com/${locale}/blog/${slug}`,
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
      <BlogDetailClient post={typedPost} relatedPosts={relatedPosts || []} />
    </>
  )
}
