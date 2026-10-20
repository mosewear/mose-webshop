'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/routing'
import Image from 'next/image'
import { getRecentlyViewed, type RecentlyViewedProduct } from '@/lib/recentlyViewed'
import { createClient } from '@/lib/supabase/client'
import { useTranslations, useLocale } from 'next-intl'
import { formatPrice } from '@/lib/format-price'

interface Product {
  id: string
  name: string
  name_en: string | null
  slug: string
  base_price: number
  sale_price: number | null
  product_images: Array<{
    url: string
    alt_text: string | null
    is_primary: boolean
    media_type: 'image' | 'video'
  }>
}

export default function RecentlyViewed({ currentProductId }: { currentProductId?: string }) {
  const t = useTranslations('product.recentlyViewed')
  const locale = useLocale()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadRecentlyViewed()
  }, [currentProductId])

  async function loadRecentlyViewed() {
    try {
      const recentIds = getRecentlyViewed()
      
      // Filter out current product
      const filtered = currentProductId 
        ? recentIds.filter(p => p.id !== currentProductId)
        : recentIds
      
      if (filtered.length === 0) {
        setLoading(false)
        return
      }

      // Fetch product data
      const supabase = createClient()
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          name_en,
          slug,
          base_price,
          sale_price,
          product_images(url, alt_text, is_primary, media_type)
        `)
        .in('id', filtered.map(p => p.id))
        // Alleen gepubliceerde producten. Dit filter ontbrak, waardoor een
        // product dat op concept staat hier gewoon met prijs en al in de winkel
        // verscheen zodra iemand de pagina ooit had geopend. Het horloge stond
        // zo op de productpagina terwijl het niet te koop is.
        .eq('is_active', true)
        .eq('status', 'active')

      if (error) throw error

      // Sort by recently viewed order
      const sorted = filtered
        .map(recent => data?.find(p => p.id === recent.id))
        .filter(Boolean) as Product[]

      setProducts(sorted)
    } catch (error) {
      console.error('Error loading recently viewed:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || products.length === 0) {
    return null
  }

  return (
    <div className="mt-12 md:mt-16 border-t-2 border-gray-200 pt-8 md:pt-12">
      <h2 className="text-2xl md:text-3xl font-display mb-6 text-center md:text-left uppercase tracking-wide">
        {t('title')}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
        {products.map((product) => {
          const imageOnly = product.product_images.filter(img => img.media_type !== 'video')
          const primaryImage = imageOnly.find(img => img.is_primary) 
            || imageOnly[0]

          const hasDiscount = product.sale_price && product.sale_price < product.base_price

          return (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              className="group block"
            >
              <div className="bg-white border-2 border-black overflow-hidden transition-all duration-300 hover:shadow-xl md:hover:-translate-y-2">
                <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                  <Image
                    src={failedImages.has(product.id) ? '/placeholder-product.svg' : (primaryImage?.url || '/placeholder-product.svg')}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 16vw"
                    quality={90}
                    className="object-cover object-center group-hover:scale-110 transition-transform duration-700"
                    onError={() => setFailedImages(prev => new Set(prev).add(product.id))}
                  />
                </div>
                <div className="p-2 md:p-3">
                  <h3 className="font-bold text-xs md:text-sm mb-1 line-clamp-2 min-h-[2rem]">
                    {locale === 'en' && product.name_en ? product.name_en : product.name}
                  </h3>
                  {/* Via formatPrice, net als de rest van de winkel. Hier stond
                      `toFixed(2)`, wat twee dingen fout deed: ronde bedragen
                      kregen nullen achter de komma (€150.00 waar de shoppagina
                      €150 toont) en het decimaalteken was een punt in plaats van
                      een komma. */}
                  {hasDiscount && product.sale_price ? (
                    <div className="flex items-center gap-2">
                      <p className="text-sm md:text-base font-bold text-red-600">
                        {formatPrice(product.sale_price, locale)}
                      </p>
                      <p className="text-xs text-gray-500 line-through">
                        {formatPrice(product.base_price, locale)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm md:text-base font-bold">
                      {formatPrice(product.base_price, locale)}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}


