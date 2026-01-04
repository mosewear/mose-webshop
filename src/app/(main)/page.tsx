import { getSiteSettings } from '@/lib/settings'
import { getHomepageSettings, getFeaturedProducts, getCategoryData } from '@/lib/homepage'
import HomePageClient from '@/components/HomePageClient'

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HomePage() {
  console.log('=== SERVER COMPONENT: HomePage ===')
  
  // Fetch all data server-side
  const [siteSettings, homepageSettings] = await Promise.all([
    getSiteSettings(),
    getHomepageSettings(),
  ])
  
  console.log('Homepage settings fetched:', {
    featured_product_1_id: homepageSettings.featured_product_1_id,
    featured_product_2_id: homepageSettings.featured_product_2_id,
    featured_product_3_id: homepageSettings.featured_product_3_id,
  })

  // Fetch featured products
  const productIds = [
    homepageSettings.featured_product_1_id,
    homepageSettings.featured_product_2_id,
    homepageSettings.featured_product_3_id,
  ]
  console.log('Product IDs to fetch:', productIds)
  
  const featuredProducts = await getFeaturedProducts(productIds)
  console.log('Featured products received in page.tsx:', featuredProducts)
  console.log('Number of featured products:', featuredProducts.length)

  // Fetch categories
  const categoryIds = [
    homepageSettings.category_1_id,
    homepageSettings.category_2_id,
    homepageSettings.category_3_id,
    homepageSettings.category_4_id,
  ]
  console.log('Category IDs to fetch:', categoryIds)
  
  const categories = await getCategoryData(categoryIds)
  console.log('Categories received in page.tsx:', categories)
  console.log('Number of categories:', categories.length)

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
