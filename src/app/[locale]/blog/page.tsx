import type { Metadata } from 'next'
import BlogListClient from './BlogListClient'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'blog' })

  const title = `${t('title')} - MOSE`
  const description = locale === 'en'
    ? 'Read the latest stories, style guides, and behind-the-scenes content from MOSE streetwear.'
    : 'Lees de laatste verhalen, stijlgidsen en behind-the-scenes content van MOSE streetwear.'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://www.mosewear.com/${locale}/blog`,
      images: [
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
      title,
      description,
      images: ['https://www.mosewear.com/hero_mose.png'],
    },
    alternates: {
      canonical: `/${locale}/blog`,
      languages: {
        nl: '/nl/blog',
        en: '/en/blog',
      },
    },
  }
}

export const revalidate = 1800

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'MOSE Blog',
    description: locale === 'en'
      ? 'Stories, style guides, and behind-the-scenes content from MOSE.'
      : 'Verhalen, stijlgidsen en behind-the-scenes content van MOSE.',
    url: `https://www.mosewear.com/${locale}/blog`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'MOSE',
      url: 'https://www.mosewear.com',
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
      ],
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <BlogListClient />
    </>
  )
}
