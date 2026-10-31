import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { getLookbookPageData } from '@/lib/lookbook-data'
import { pickLocalized } from '@/lib/lookbook'
import LookbookClient from './LookbookClient'
import { getShopCatalog } from '@/lib/catalog-server'
import LookbookCollection from './LookbookCollection'

/**
 * Public lookbook page — server component.
 *
 * ISR-cached for 30 minutes; the admin's Force Rebuild button and
 * organic revalidation keep it fresh between campaigns. Renders as a
 * server component for SEO (real chapter titles in initial HTML) and
 * passes chapter data + settings to the LookbookClient wrapper for
 * hydration with motion hooks in Stage 3.
 */

export const revalidate = 60

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: t('lookbook.title'),
    description: t('lookbook.description'),
    keywords: t('lookbook.keywords').split(', '),
    openGraph: {
      title: `${t('lookbook.title')} - MOSE`,
      description: t('lookbook.description'),
      type: 'website',
      url: `https://www.mosewear.com/${locale}/lookbook`,
      images: [
        {
          url: 'https://www.mosewear.com/og-default.jpg',
          width: 1200,
          height: 630,
          alt: 'MOSE Lookbook',
        },
      ],
      siteName: 'MOSE',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${t('lookbook.title')} - MOSE`,
      description: t('lookbook.description'),
      images: ['https://www.mosewear.com/og-default.jpg'],
    },
    alternates: {
      canonical: `/${locale}/lookbook`,
    },
  }
}

export default async function LookbookPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound()
  }
  setRequestLocale(locale)

  const [{ settings, chapters }, catalog] = await Promise.all([
    getLookbookPageData(),
    getShopCatalog(),
  ])
  const normalizedLocale = locale === 'en' ? 'en' : 'nl'

  // Structured data: a CollectionPage that references each chapter's
  // linked products. Helps Google surface the lookbook as a browse-able
  // collection and bridges it to the product graph already in the sitemap.
  const featuredProducts = catalog.products
  const uniqueProducts = Array.from(
    new Map(featuredProducts.map((p) => [p.id, p])).values(),
  )
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pickLocalized(
      settings?.header_title ?? 'MOSE Lookbook',
      settings?.header_title_en ?? null,
      normalizedLocale,
    ),
    description: pickLocalized(
      settings?.header_subtitle ?? '',
      settings?.header_subtitle_en ?? null,
      normalizedLocale,
    ),
    url: `https://www.mosewear.com/${normalizedLocale}/lookbook`,
    inLanguage: normalizedLocale,
    isPartOf: {
      '@type': 'WebSite',
      name: 'MOSE',
      url: 'https://www.mosewear.com',
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: uniqueProducts.map((p, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `https://www.mosewear.com/${normalizedLocale}/product/${p.slug}`,
        name: normalizedLocale === 'en' && p.name_en ? p.name_en : p.name,
      })),
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LookbookClient
        settings={settings}
        chapters={chapters}
        locale={normalizedLocale}
        collection={
          <LookbookCollection
            key="complete-collection"
            products={catalog.products}
          />
        }
      />
    </>
  )
}
