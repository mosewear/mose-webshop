import type { Metadata } from 'next'
import { getShopCatalog } from '@/lib/catalog-server'
import ShopPageClient from './ShopPageClient'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { getCommercePromises, formatPromiseAmount } from '@/lib/settings-server'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })
  // Zelfde reden als in [locale]/layout.tsx: de drempel stond hardgecodeerd
  // op €75 terwijl site_settings 150 zegt.
  const { free_shipping_threshold } = await getCommercePromises()
  const threshold = formatPromiseAmount(free_shipping_threshold, locale)

  return {
    title: `${t('shop.title')} - MOSE`,
    description: t('shop.description', { threshold }),
    keywords: t('shop.keywords').split(', '),
    openGraph: {
      title: `${t('shop.title')} - MOSE`,
      description: t('shop.description', { threshold }),
      type: 'website',
      url: `https://www.mosewear.com/${locale}/shop`,
      images: [
        {
          url: 'https://www.mosewear.com/og-default.jpg',
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
      description: t('shop.description', { threshold }),
      images: ['https://www.mosewear.com/og-default.jpg'],
    },
    alternates: {
      canonical: `/${locale}/shop`,
    },
  }
}

export const revalidate = 60 // Public presentation data; checkout checks live inventory

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'metadata' })
  // Zelfde bron als generateMetadata hierboven: de JSON-LD-beschrijving moet
  // dezelfde drempel noemen als de meta-description, anders geven we Google
  // twee verschillende beloftes voor dezelfde pagina.
  const { free_shipping_threshold } = await getCommercePromises()
  const threshold = formatPromiseAmount(free_shipping_threshold, locale)

  const catalog = await getShopCatalog()

  // Add structured data for CollectionPage
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'MOSE Shop',
    description: t('shop.description', { threshold }),
    url: `https://www.mosewear.com/${locale}/shop`,
    image: 'https://www.mosewear.com/og-default.jpg',
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
          name: 'Shop',
          item: `https://www.mosewear.com/${locale}/shop`,
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
      <ShopPageClient initialProducts={catalog.products} initialCategories={catalog.categories} />
    </>
  )
}
