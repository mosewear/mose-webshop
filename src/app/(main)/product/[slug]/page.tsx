import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ProductPageClient from './ProductPageClient'

export const revalidate = 3600 // Revalidate every hour

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      base_price,
      sale_price,
      meta_title,
      meta_description,
      product_images (
        url,
        alt_text,
        is_primary,
        position
      ),
      categories (
        name,
        slug
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!product) {
    return {
      title: 'Product niet gevonden - MOSE',
      description: 'Het door jou gezochte product bestaat niet meer.',
    }
  }

  // Get primary image or first image
  const primaryImage = product.product_images?.find((img: any) => img.is_primary) || product.product_images?.[0]
  const imageUrl = primaryImage?.url || 'https://mosewear.com/logomose.png'

  // Use custom meta or generate from product data
  const title = product.meta_title || `${product.name} - MOSE`
  const description = product.meta_description || 
    `${product.description?.substring(0, 155)}${product.description?.length > 155 ? '...' : ''}`

  // Get category for keywords
  const category = Array.isArray(product.categories) ? product.categories[0] : product.categories
  
  return {
    title,
    description,
    keywords: [product.name, 'MOSE', category?.name, 'mannenkleding', 'premium basics', 'Groningen', 'lokaal gemaakt'].filter(Boolean) as string[],
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://mosewear.com/product/${slug}`,
      images: [
        {
          url: imageUrl.startsWith('http') ? imageUrl : `https://mosewear.com${imageUrl}`,
          width: 1200,
          height: 1200,
          alt: primaryImage?.alt_text || product.name,
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
      canonical: `/product/${slug}`,
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch product data for structured data
  const { data: product } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      base_price,
      sale_price,
      slug,
      product_images (
        url,
        alt_text,
        is_primary
      ),
      product_variants (
        stock_quantity,
        is_available
      ),
      categories (
        name,
        slug
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  // Generate structured data for SEO
  let structuredData = null
  if (product) {
    const primaryImage = product.product_images?.find((img: any) => img.is_primary) || product.product_images?.[0]
    const imageUrl = primaryImage?.url || 'https://mosewear.com/logomose.png'
    const price = product.sale_price || product.base_price
    
    // Check if product is in stock
    const inStock = product.product_variants?.some((v: any) => v.is_available && v.stock_quantity > 0)

    // Get category data
    const category = Array.isArray(product.categories) ? product.categories[0] : product.categories

    structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: imageUrl.startsWith('http') ? imageUrl : `https://mosewear.com${imageUrl}`,
      brand: {
        '@type': 'Brand',
        name: 'MOSE',
      },
      offers: {
        '@type': 'Offer',
        url: `https://mosewear.com/product/${slug}`,
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
          item: 'https://mosewear.com',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Shop',
          item: 'https://mosewear.com/shop',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: category?.name || 'Producten',
          item: `https://mosewear.com/shop/${category?.slug || ''}`,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: product.name,
          item: `https://mosewear.com/product/${slug}`,
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
      <ProductPageClient params={Promise.resolve({ slug })} />
    </>
  )
}
