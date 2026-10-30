import { getSiteSettings } from '@/lib/settings'
import { getHomepageSettings } from '@/lib/homepage'
import { getShopCatalog } from '@/lib/catalog-server'
import { homepageCategories, selectHomepageProducts } from '@/lib/homepage-catalog'
import HomePageClient from '@/components/HomePageClient'
import InstagramFeed from '@/components/home/InstagramFeed'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { formatPromiseAmount } from '@/lib/settings-server'

// ✅ ISR with On-Demand Revalidation
// Homepage follows the public catalogue refresh interval.
export const revalidate = 60 // Match the public catalogue refresh interval

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  
  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound()
  }

  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'metadata' })

  // Fetch all data server-side
  const [siteSettings, homepageSettings, catalog] = await Promise.all([
    getSiteSettings(),
    getHomepageSettings(locale),
    getShopCatalog(),
  ])

  const featuredProducts = selectHomepageProducts(catalog.products, locale, [
    homepageSettings.featured_product_1_id,
    homepageSettings.featured_product_2_id,
    homepageSettings.featured_product_3_id,
  ])
  const categories = homepageCategories(catalog.products, catalog.categories, locale)

  // Structured Data for SEO - localized
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    "name": "MOSE",
    "image": "https://www.mosewear.com/logomose.png",
    "url": `https://www.mosewear.com/${locale}`,
    // siteSettings is hierboven al opgehaald; zonder { threshold } zou de
    // letterlijke tekst "€{threshold}" in de JSON-LD naar Google gaan.
    "description": t('description', { threshold: formatPromiseAmount(siteSettings.free_shipping_threshold, locale) }),
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Groningen",
      "addressCountry": "NL"
    },
    "priceRange": "€€",
    "openingHours": "Mo-Su 00:00-23:59",
    "paymentAccepted": ["iDEAL", "Credit Card", "Bancontact"],
    "currenciesAccepted": "EUR"
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomePageClient
        siteSettings={{
          free_shipping_threshold: siteSettings.free_shipping_threshold,
          return_days: siteSettings.return_days,
        }}
        homepageSettings={homepageSettings}
        featuredProducts={featuredProducts}
        categories={categories}
        instagramSlot={<InstagramFeed />}
      />
    </>
  )
}
