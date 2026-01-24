import type { Metadata } from 'next'
import ShopPageClient from './ShopPageClient'

export const metadata: Metadata = {
  title: 'Shop - MOSE',
  description: 'Ontdek onze collectie premium basics. Tijdloze kleding en accessoires voor mannen. Lokaal gemaakt in Groningen. Gratis verzending vanaf €75.',
  keywords: ['MOSE shop', 'premium basics', 'hoodies', 't-shirts', 'mannenkleding', 'Groningen', 'lokaal gemaakt', 'streetwear'],
  openGraph: {
    title: 'Shop - MOSE',
    description: 'Ontdek onze collectie premium basics. Tijdloze kleding en accessoires voor mannen.',
    type: 'website',
    url: 'https://mosewear.com/shop',
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
    title: 'Shop - MOSE',
    description: 'Ontdek onze collectie premium basics.',
    images: ['https://mosewear.com/hero_mose.png'],
  },
  alternates: {
    canonical: '/shop',
  },
}

export const revalidate = 1800 // Revalidate every 30 minutes

export default function ShopPage() {
  // Add structured data for CollectionPage
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'MOSE Shop',
    description: 'Premium basics voor mannen. Lokaal gemaakt in Groningen.',
    url: 'https://mosewear.com/shop',
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
