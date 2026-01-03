import { getSiteSettings } from '@/lib/settings'
import { getHomepageSettings, getFeaturedProducts, getCategoryData } from '@/lib/homepage'
import HomePageClient from '@/components/HomePageClient'

// Revalidate every 60 seconds (ISR)
export const revalidate = 60

export default async function HomePage() {
  // Fetch all data server-side in parallel for optimal performance
  const [siteSettings, homepageSettings] = await Promise.all([
    getSiteSettings(),
    getHomepageSettings(),
  ])

  // Fetch featured products based on homepage settings
  const productIds = [
    homepageSettings.featured_product_1_id,
    homepageSettings.featured_product_2_id,
    homepageSettings.featured_product_3_id,
  ]
  
  // Fetch categories based on homepage settings
  const categoryIds = [
    homepageSettings.category_1_id,
    homepageSettings.category_2_id,
    homepageSettings.category_3_id,
    homepageSettings.category_4_id,
  ]

  const [featuredProducts, categories] = await Promise.all([
    getFeaturedProducts(productIds),
    getCategoryData(categoryIds),
  ])

  // Structured Data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    "name": "MOSE",
    "image": "https://mosewear.com/logomose.png",
    "url": "https://mosewear.com",
    "description": "Lokaal gemaakte premium basics uit Groningen. Kleding zonder concessies, gebouwd om lang mee te gaan.",
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

