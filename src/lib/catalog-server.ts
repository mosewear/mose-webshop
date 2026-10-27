import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createAnonClient } from '@/lib/supabase/server'
import { SHOP_PRODUCT_SELECT, PDP_PRODUCT_SELECT } from '@/lib/catalog-select'

// Public RLS-scoped presentation data only. Checkout independently validates
// current price, availability and stock; this cache never authorizes a purchase.
// Throw on failure so ISR retains its last good response instead of caching an
// empty catalogue or incorrectly returning 404 during a database outage.
export const getShopCatalog = cache(unstable_cache(async () => {
  const client = createAnonClient()
  const signal = AbortSignal.timeout(8000)
  const [products, categories] = await Promise.all([
    client.from('products').select(SHOP_PRODUCT_SELECT)
      .eq('is_active', true).eq('status', 'active')
      .order('display_order', { ascending: true }).order('created_at', { ascending: false }).abortSignal(signal),
    client.from('categories').select('id, name, name_en, slug').eq('status', 'active').order('name').abortSignal(signal),
  ])
  if (products.error) throw new Error('Public catalogue unavailable', { cause: products.error })
  if (categories.error) throw new Error('Public categories unavailable', { cause: categories.error })
  return { products: products.data.map(product => ({ ...product, images: [...(product.images ?? [])].sort((a, b) => (a.position ?? 999) - (b.position ?? 999)) })), categories: categories.data }
}, ['public-shop-catalog-v1'], { revalidate: 60, tags: ['public-catalog'] }))

export const getCatalogProduct = cache(unstable_cache(async (slug: string) => {
  const { data, error } = await createAnonClient().from('products').select(PDP_PRODUCT_SELECT)
    .eq('slug', slug).eq('is_active', true).eq('status', 'active')
    .abortSignal(AbortSignal.timeout(8000)).maybeSingle()
  if (error) throw new Error('Public product unavailable', { cause: error })
  if (!data) return null
  return { ...data,
    product_images: [...data.product_images].sort((a, b) => a.position - b.position),
    product_variants: [...data.product_variants].sort((a, b) => a.display_order - b.display_order),
  }
}, ['public-product-v1'], { revalidate: 60, tags: ['public-catalog'] }))
