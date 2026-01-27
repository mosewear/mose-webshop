import { getSiteSettings } from '@/lib/settings'
import { getHomepageSettings, getFeaturedProducts, getCategoryData } from '@/lib/homepage'
import HomePageClient from '@/components/HomePageClient'
import { getTranslations } from 'next-intl/server'
import { routing } from '@/i18n/routing'

// ✅ ISR with On-Demand Revalidation
// Homepage cached for 1 hour, auto-updates when admin saves changes
export const revalidate = 3600 // Cache for 1 hour

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  
  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    return null
  }

  const t = await getTranslations({ locale, namespace: 'metadata' })

  // Fetch all data server-side
  const [siteSettings, homepageSettings] = await Promise.all([
    getSiteSettings(),
    getHomepageSettings(locale),
  ])

  // Fetch featured products
  const productIds = [
    homepageSettings.featured_product_1_id,
    homepageSettings.featured_product_2_id,
    homepageSettings.featured_product_3_id,
  ]
  const featuredProducts = await getFeaturedProducts(productIds, locale)

  // Fetch categories
  const categoryIds = [
    homepageSettings.category_1_id,
    homepageSettings.category_2_id,
    homepageSettings.category_3_id,
    homepageSettings.category_4_id,
  ]
  const categories = await getCategoryData(categoryIds, locale)

  // Structured Data for SEO - localized
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    "name": "MOSE",
    "image": "https://mosewear.com/logomose.png",
    "url": `https://mosewear.com/${locale}`,
    "description": t('description'),
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
      />
    </>
  )
}
