import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/api/google-image',
          '/google-shopping-feed.xml',
          '/meta-offers-feed.csv',
          '/',
        ],
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: 'https://www.mosewear.com/sitemap.xml',
  }
}



