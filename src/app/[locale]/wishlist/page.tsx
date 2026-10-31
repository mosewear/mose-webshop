'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useWishlist } from '@/store/wishlist'
import { createClient } from '@/lib/supabase/client'
import { SHOP_PRODUCT_SELECT } from '@/lib/catalog-select'
import { catalogTiles, emptyCatalogFilters, type CatalogProduct } from '@/lib/catalog-filters'
import { useLiveAvailability } from '@/hooks/useLiveAvailability'
import { Link } from '@/i18n/routing'
import CatalogProductCard from '@/components/shop/CatalogProductCard'
import PaginaKop from '@/components/layout/PaginaKop'
import { buttonVariants } from '@/components/ui/Button'

export default function WishlistPage() {
  const { items, loadWishlist, isLoading } = useWishlist()
  const t = useTranslations('wishlist'), catalog = useTranslations('shop.catalog')
  const [source, setSource] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true), [failed, setFailed] = useState(false), [retry, setRetry] = useState(0)
  const ids = items.map(item => item.product_id).sort().join(',')
  const products = useLiveAvailability(source)
  useEffect(() => { void loadWishlist() }, [loadWishlist])
  useEffect(() => {
    let stopped = false
    const abort = new AbortController()
    if (!ids) { setSource([]); setLoading(false); setFailed(false); return }
    setLoading(true); setFailed(false)
    void (async () => {
      try {
        const { data, error } = await createClient().from('products').select(SHOP_PRODUCT_SELECT)
          .in('id', ids.split(',')).eq('is_active', true).eq('status', 'active')
          .abortSignal(AbortSignal.any([abort.signal, AbortSignal.timeout(8000)]))
        if (error) throw error
        if (!stopped) setSource(data as CatalogProduct[])
      } catch { if (!stopped) setFailed(true) }
      finally { if (!stopped) setLoading(false) }
    })()
    return () => { stopped = true; abort.abort() }
  }, [ids, retry])

  return <>
    <PaginaKop titel={t('title')} ondertitel={items.length ? t('itemCount', { count: items.length }) : undefined} />
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      {loading || isLoading ? <p role="status" className="py-12 text-center text-sm text-gray-600">{t('loading')}</p>
        : failed ? <div role="alert" className="border border-black p-6"><p>{catalog('loadError')}</p><button type="button" onClick={() => setRetry(n => n + 1)} className="mt-4 min-h-11 font-semibold underline">{catalog('retry')}</button></div>
        : !products.length ? <div className="border-2 border-black bg-white px-6 py-12 text-center">
          <Heart className="mx-auto mb-6 h-10 w-10" aria-hidden="true" />
          <h2 className="font-display text-3xl uppercase">{t('empty.title')}</h2>
          <p className="mx-auto mb-6 mt-3 max-w-md text-sm leading-relaxed text-gray-600">{t('empty.description')}</p>
          <Link href="/shop" className={buttonVariants({ variant: 'primary', size: 'sm' })}>{t('empty.cta')}</Link>
        </div> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalogTiles(products, emptyCatalogFilters).map(tile => <CatalogProductCard key={tile.tileKey} tile={tile} largeMobile imageSizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc((100vw - 48px) / 2), 400px" />)}
        </div>}
    </div>
  </>
}
