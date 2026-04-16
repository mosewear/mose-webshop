import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 3600

const locales = ['nl', 'en'] as const
const baseUrl = 'https://www.mosewear.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  
  const { data: products } = await supabase
    .from('products')
    .select('slug, updated_at')
    .eq('is_active', true)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })

  const { data: categories } = await supabase
    .from('categories')
    .select('slug, updated_at')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })

  const staticPaths = [
    { path: '', priority: 1, changeFrequency: 'daily' as const },
    { path: '/shop', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/lookbook', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/over-mose', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/contact', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/privacy', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/algemene-voorwaarden', priority: 0.5, changeFrequency: 'monthly' as const },
  ]

  const entries: MetadataRoute.Sitemap = []

  for (const page of staticPaths) {
    for (const locale of locales) {
      entries.push({
        url: `${baseUrl}/${locale}${page.path}`,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages: {
            nl: `${baseUrl}/nl${page.path}`,
            en: `${baseUrl}/en${page.path}`,
          },
        },
      })
    }
  }

  for (const product of products || []) {
    for (const locale of locales) {
      entries.push({
        url: `${baseUrl}/${locale}/product/${product.slug}`,
        lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: {
          languages: {
            nl: `${baseUrl}/nl/product/${product.slug}`,
            en: `${baseUrl}/en/product/${product.slug}`,
          },
        },
      })
    }
  }

  for (const category of categories || []) {
    for (const locale of locales) {
      entries.push({
        url: `${baseUrl}/${locale}/shop?category=${category.slug}`,
        lastModified: category.updated_at ? new Date(category.updated_at) : new Date(),
        changeFrequency: 'daily',
        priority: 0.7,
        alternates: {
          languages: {
            nl: `${baseUrl}/nl/shop?category=${category.slug}`,
            en: `${baseUrl}/en/shop?category=${category.slug}`,
          },
        },
      })
    }
  }

  return entries
}
