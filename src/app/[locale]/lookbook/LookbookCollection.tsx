'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/routing'
import {
  availableVariant,
  catalogTiles,
  colorKey,
  emptyCatalogFilters,
  filterCatalog,
  productPriceRange,
  type CatalogProduct,
} from '@/lib/catalog-filters'
import { buildPdpHref, formatColorLabel, getImageForColor, type ShopTile } from '@/lib/product-display'
import { formatPrice } from '@/lib/format-price'
import { BLUR_DATA_URL } from '@/lib/blur-placeholder'

/** One photograph and a short factual caption, without shop controls. */
function CollectionPhotograph({tile, priority}: {tile: ShopTile<CatalogProduct>; priority: boolean}) {
  const locale = useLocale()
  const shop = useTranslations('shop.catalog')
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const {product, color} = tile
  const name = (locale === 'en' ? product.name_en || product.name : product.name).replace(/^MOSE\s+/i, '')
  const colorLabel = color ? formatColorLabel(color, locale) : null
  const href = buildPdpHref(product.slug, color)
  const price = productPriceRange(product, color)
  const image = getImageForColor(product.images, color)
  const orderable = product.is_gift_card || product.variants?.some(v => availableVariant(v) && (!color || colorKey(v.color ?? '') === colorKey(color)))
  return <figure className="min-w-0">
    <Link href={href} aria-label={colorLabel ? `${name}, ${colorLabel}` : name} className="relative block aspect-[4/5] overflow-hidden border-2 border-black bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary">
      <Image
        src={failedSource === image ? '/placeholder-product.svg' : image}
        alt={colorLabel ? `${name}, ${colorLabel}` : name}
        fill
        sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1439px) calc((100vw - 88px) / 2), 676px"
        priority={priority}
        quality={90}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        className="object-cover object-center"
        onError={() => setFailedSource(image)}
      />
    </Link>
    <figcaption className="flex items-start justify-between gap-3 pt-3">
      <div className="min-w-0">
        <h2 className="text-sm font-bold uppercase tracking-wide md:text-base"><Link href={href} className="hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-primary">{name}</Link></h2>
        {colorLabel && <p className="mt-1 text-xs text-gray-600">{colorLabel}</p>}
        {!orderable && <p className="mt-1 text-xs font-bold uppercase text-gray-600">{shop('unavailable')}</p>}
      </div>
      <p className="shrink-0 text-sm font-bold md:text-base">
        {(product.is_gift_card || price.min !== price.max) && <span className="mr-1 text-xs">{shop('from')}</span>}
        {formatPrice(price.min, locale)}
      </p>
    </figcaption>
  </figure>
}

// The server catalogue already includes only active products. The explicit
// guard also prevents stale draft rows from rendering if supplied during a refresh.
export default function LookbookCollection({products}: {products: Array<CatalogProduct & {is_active?: boolean; status?: string | null}>}) {
  const t = useTranslations('lookbook.collection')
  const locale = useLocale()
  const published = products.filter(p => p.is_active !== false && (!p.status || p.status === 'active'))
  const tiles = catalogTiles(filterCatalog(published, emptyCatalogFilters, locale), emptyCatalogFilters)
  if (!tiles.length) return null
  return <section aria-label={t('ariaLabel')} className="bg-white">
    <div className="mx-auto max-w-[1440px] px-4 pb-10 md:px-8 md:pb-16">
      <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2 md:gap-y-12">
        {tiles.map((tile, index) => <CollectionPhotograph key={tile.tileKey} tile={tile} priority={index === 0} />)}
      </div>
      <Link href="/shop" className="mt-8 inline-flex min-h-12 items-center gap-4 border-b-2 border-black py-3 text-sm font-bold uppercase tracking-wide hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-primary">
        {t('browse')}<ArrowRight size={20} aria-hidden="true" />
      </Link>
    </div>
  </section>
}
