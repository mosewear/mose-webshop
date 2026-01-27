import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export async function generateProductMetadata(slug: string): Promise<Metadata> {
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
      title: 'Product niet gevonden',
      description: 'Het door jou gezochte product bestaat niet meer.',
    }
  }

  // Get primary image or first image
  const primaryImage = product.product_images?.find((img: any) => img.is_primary) || product.product_images?.[0]
  const imageUrl = primaryImage?.url || '/logomose.png'

  // Use custom meta or generate from product data
  const title = product.meta_title || `${product.name} - MOSE`
  const description = product.meta_description || 
    `${product.description?.substring(0, 155)}...`

  // Price for structured data
  const price = product.sale_price || product.base_price

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://mosewear.com/product/${slug}`,
      images: [
        {
          url: imageUrl,
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
      images: [imageUrl],
    },
    alternates: {
      canonical: `/product/${slug}`,
    },
  }
}

