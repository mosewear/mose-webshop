import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ProductPageClient from './ProductPageClient'
import { getTranslations } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { mapLocalizedProduct } from '@/lib/i18n-db'

export const revalidate = 3600 // Revalidate every hour

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}): Promise<Metadata> {
  const { slug, locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select(`
      id,
      name,
      name_en,
      description,
      description_en,
      base_price,
      sale_price,
      meta_title,
      meta_description,
      category_id,
      product_images (
        url,
        alt_text,
        is_primary,
        position
      ),
      categories!inner (
        name,
        name_en,
        slug
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!product) {
    return {
      title: `${t('product.notFound')} - MOSE`,
      description: t('product.notFoundDesc'),
    }
  }

  // Map localized fields
  const localizedProduct = mapLocalizedProduct(product, locale)
  // Type assertion: categories!inner returns single object, not array
  const category = product.categories as any as { name: string; name_en?: string; slug: string }
  const localizedCategory = category 
    ? { ...category, name: locale === 'en' && category.name_en ? category.name_en : category.name }
    : null

  // Get primary image or first image
  const primaryImage = product.product_images?.find((img: any) => img.is_primary) || product.product_images?.[0]
  const imageUrl = primaryImage?.url || 'https://mosewear.com/logomose.png'

  // Use custom meta or generate from product data
  const title = product.meta_title || `${localizedProduct.name} - MOSE`
  const description = product.meta_description || 
    `${localizedProduct.description?.substring(0, 155)}${localizedProduct.description?.length > 155 ? '...' : ''}`
  
  return {
    title,
    description,
    keywords: [localizedProduct.name, 'MOSE', localizedCategory?.name, 'mannenkleding', 'premium basics', 'Groningen', 'lokaal gemaakt'].filter(Boolean) as string[],
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://mosewear.com/${locale}/product/${slug}`,
      images: [
        {
          url: imageUrl.startsWith('http') ? imageUrl : `https://mosewear.com${imageUrl}`,
          width: 1200,
          height: 1200,
          alt: primaryImage?.alt_text || localizedProduct.name,
        },
      ],
      siteName: 'MOSE',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl.startsWith('http') ? imageUrl : `https://mosewear.com${imageUrl}`],
    },
    alternates: {
      canonical: `/${locale}/product/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  // This will be handled dynamically, but we need to return locale structure
  return []
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}) {
  const { slug, locale: localeParam } = await params
  const supabase = await createClient()

  // Fetch product data for structured data
  const { data: product } = await supabase
    .from('products')
    .select(`
      id,
      name,
      name_en,
      description,
      description_en,
      base_price,
      sale_price,
      slug,
      category_id,
      product_images (
        url,
        alt_text,
        is_primary
      ),
      product_variants (
        stock_quantity,
        is_available
      ),
      categories!inner (
        name,
        name_en,
        slug
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  // Generate structured data for SEO
  let structuredData = null
  if (product) {
    // Map localized fields
    const localizedProduct = mapLocalizedProduct(product, localeParam)
    // Type assertion: categories!inner returns single object, not array
    const category = product.categories as any as { name: string; name_en?: string; slug: string }
    const localizedCategory = category 
      ? { ...category, name: localeParam === 'en' && category.name_en ? category.name_en : category.name }
      : null
    
    const primaryImage = product.product_images?.find((img: any) => img.is_primary) || product.product_images?.[0]
    const imageUrl = primaryImage?.url || 'https://mosewear.com/logomose.png'
    const price = product.sale_price || product.base_price
    
    // Check if product is in stock
    const inStock = product.product_variants?.some((v: any) => v.is_available && v.stock_quantity > 0)

    structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: localizedProduct.name,
      description: localizedProduct.description,
      image: imageUrl.startsWith('http') ? imageUrl : `https://mosewear.com${imageUrl}`,
      brand: {
        '@type': 'Brand',
        name: 'MOSE',
      },
      offers: {
        '@type': 'Offer',
        url: `https://mosewear.com/${localeParam}/product/${slug}`,
        priceCurrency: 'EUR',
        price: price,
        availability: inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        seller: {
          '@type': 'Organization',
          name: 'MOSE',
        },
      },
      category: category?.name,
    }

    // Add breadcrumbs
    const breadcrumbStructuredData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `https://mosewear.com/${localeParam}`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Shop',
          item: `https://mosewear.com/${localeParam}/shop`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: category?.name || 'Producten',
          item: `https://mosewear.com/${localeParam}/shop/${category?.slug || ''}`,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: product.name,
          item: `https://mosewear.com/${localeParam}/product/${slug}`,
        },
      ],
    }

    structuredData = [structuredData, breadcrumbStructuredData]
  }

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <ProductPageClient params={Promise.resolve({ slug, locale: localeParam })} />
    </>
  )
}
