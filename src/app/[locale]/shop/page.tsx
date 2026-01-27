import type { Metadata } from 'next'
import ShopPageClient from './ShopPageClient'
import { getTranslations } from 'next-intl/server'
import { routing } from '@/i18n/routing'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })
  
  return {
    title: `${t('shop.title')} - MOSE`,
    description: t('shop.description'),
    keywords: t('shop.keywords').split(', '),
    openGraph: {
      title: `${t('shop.title')} - MOSE`,
      description: t('shop.description'),
      type: 'website',
      url: `https://mosewear.com/${locale}/shop`,
      images: [
        {
          url: 'https://mosewear.com/hero_mose.png',
          width: 1200,
          height: 630,
          alt: 'MOSE Shop',
        },
      ],
      siteName: 'MOSE',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${t('shop.title')} - MOSE`,
      description: t('shop.description'),
      images: ['https://mosewear.com/hero_mose.png'],
    },
    alternates: {
      canonical: `/${locale}/shop`,
    },
  }
}

export const revalidate = 1800 // Revalidate every 30 minutes

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })
  
  // Add structured data for CollectionPage
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'MOSE Shop',
    description: t('shop.description'),
    url: `https://mosewear.com/${locale}/shop`,
    image: 'https://mosewear.com/hero_mose.png',
    isPartOf: {
      '@type': 'WebSite',
      name: 'MOSE',
      url: 'https://mosewear.com',
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://mosewear.com',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Shop',
          item: 'https://mosewear.com/shop',
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
      <ShopPageClient />
    </>
  )
}
