'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Heart, Plus } from 'lucide-react'
import dynamic from 'next/dynamic'
const CatalogQuickAdd = dynamic(() => import('./CatalogQuickAdd'), {ssr: false})
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { useWishlist } from '@/store/wishlist'
import { formatPrice } from '@/lib/format-price'
import { BLUR_DATA_URL } from '@/lib/blur-placeholder'
import PresaleBadge from '@/components/PresaleBadge'
import {
  buildPdpHref,
  formatColorLabel,
  getColorStock,
  getHoverImageForColor,
  getImageForColor,
  getUniqueColors,
  type ShopTile,
} from '@/lib/product-display'
import {
  availableVariant,
  catalogVariants,
  emptyCatalogFilters,
  type CatalogFilters,
  colorKey,
  productPriceRange,
  type CatalogProduct,
} from '@/lib/catalog-filters'

/** Existing MOSE card design, with accessible sibling links/buttons. */
export default function CatalogProductCard({
  tile,
  priority = false,
  showCategoryLabels = true,
  index,
  onProductClick,
  allowedColors,
  filters = emptyCatalogFilters,
  imageSizes,
}: {
  tile: ShopTile<CatalogProduct>
  priority?: boolean
  showCategoryLabels?: boolean
  allowedColors?: string[]
  filters?: CatalogFilters
  imageSizes?: string
  index?: number
  onProductClick?: (tile: ShopTile<CatalogProduct>) => void
}) {
  const locale = useLocale(),
    t = useTranslations('shop.catalog'),
    shop = useTranslations('shop')
  const [hover, setHover] = useState(false),
    [failed, setFailed] = useState(false),
    [saving, setSaving] = useState(false),
    [quickOpen, setQuickOpen] = useState(false)
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist()
  const p = tile.product,
    name = locale === 'en' ? p.name_en || p.name : p.name,
    title = name.replace(/^MOSE\s+/i, ''),
    saved = isInWishlist(p.id)
  const [preferredColor, setSelectedColor] = useState(tile.color)
  const selectedColor = preferredColor && (!allowedColors || allowedColors.includes(colorKey(preferredColor))) ? preferredColor : tile.color
  const [feedback, setFeedback] = useState('')
  const image = getImageForColor(p.images, selectedColor),
    second = getHoverImageForColor(p.images, selectedColor, image)
  useEffect(() => {
    setFailed(false)
  }, [image])
  const matchingVariants = catalogVariants(p, filters, selectedColor)
  const inStock = p.is_gift_card || matchingVariants.some(variant => availableVariant(variant))
  const stock = getColorStock(matchingVariants.filter(v => v.is_available === true), selectedColor),
    colors = getUniqueColors(p.variants),
    priceRange = productPriceRange(p, selectedColor, filters),
    price = priceRange.min,
    originalPrice = p.base_price + price - (p.sale_price ?? p.base_price),
    sale = p.sale_price !== null && price < originalPrice
  const href = buildPdpHref(p.slug, selectedColor),
    category =
      locale === 'en'
        ? p.category?.name_en || p.category?.name
        : p.category?.name
  return (
    <article
      data-catalog-index={index}
      data-catalog-color={selectedColor ?? ''}
      data-catalog-product-id={p.id}
      className="group relative flex h-full min-w-0 flex-col overflow-hidden border border-black bg-white"
      onPointerEnter={(event) => { if (event.pointerType !== 'touch') setHover(true) }}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHover(false) }}
    >
      <div className="relative aspect-[3/4] flex-shrink-0 overflow-hidden bg-gray-100 md:aspect-[3/4]">
        <Link
          href={href}
          onClick={() => onProductClick?.({ ...tile, color: selectedColor })}
          className="absolute inset-0 block focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-brand-primary"
          aria-label={
            selectedColor
              ? `${name}, ${formatColorLabel(selectedColor, locale)}`
              : name
          }
        >
          <Image
            src={failed ? '/placeholder-product.svg' : image}
            alt={
              selectedColor
                ? `${name}, ${formatColorLabel(selectedColor, locale)}`
                : name
            }
            fill
            sizes={imageSizes ?? "(max-width: 767px) calc((100vw - 40px) / 2), (max-width: 1023px) calc((100vw - 56px) / 2), (max-width: 1279px) calc((100vw - 312px) / 3), 304px"}
            quality={90}
            priority={priority}
            className="object-cover object-center"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            onError={() => setFailed(true)}
          />
          {hover && second && !failed && (
            <Image
              src={second}
              alt=""
              aria-hidden="true"
              fill
              sizes={imageSizes ?? "(max-width: 1023px) calc((100vw - 56px) / 2), (max-width: 1279px) calc((100vw - 312px) / 3), 304px"}
              quality={90}
              className="hidden object-cover object-center md:block"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 md:group-hover:opacity-100" />
        </Link>
        <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col items-start gap-2 md:left-4 md:top-4">
          {sale && (
            <span className="border-2 border-black bg-black px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              -{Math.round((1 - price / originalPrice) * 100)}%
            </span>
          )}
        </div>
        {showCategoryLabels && category && !sale && (
          <span className="pointer-events-none absolute left-2 top-2 hidden bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm md:block">
            {category}
          </span>
        )}
        {!p.is_gift_card && !inStock && (
          <span className="pointer-events-none absolute bottom-2 left-2 bg-red-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white md:bottom-4 md:left-4 md:px-4 md:py-2 md:text-xs">
            {shop('outOfStock')}
          </span>
        )}
        {!p.is_gift_card &&
          stock.has_presale &&
          inStock &&
          stock.stock_quantity === 0 && (
            <div className="pointer-events-none absolute bottom-2 left-2 md:bottom-4 md:left-4">
              <PresaleBadge variant="compact" />
            </div>
          )}
        {!p.is_gift_card &&
          inStock &&
          stock.stock_quantity > 0 &&
          stock.stock_quantity < 5 && (
            <span className="pointer-events-none absolute bottom-2 left-2 bg-orange-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white md:bottom-4 md:left-4 md:px-4 md:py-2 md:text-xs">
              {shop('lastItems')}
            </span>
          )}
        <button
          type="button"
          aria-label={t(saved ? 'removeSaved' : 'save', { name })}
          aria-pressed={saved}
          disabled={saving}
          onClick={async () => {
            setSaving(true)
            try {
              const notify = (message: string) => setFeedback(t(message))
              if (saved) await removeFromWishlist(p.id, notify)
              else await addToWishlist(p.id, notify)
            } finally {
              setSaving(false)
            }
          }}
          className={`absolute right-1 top-1 z-20 flex h-11 w-11 items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-brand-primary disabled:opacity-50 ${saved ? 'bg-white/95 text-brand-primary' : 'bg-white/90 text-black hover:text-brand-primary'}`}
        >
          <Heart
            size={19}
            strokeWidth={1.8}
            fill={saved ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        </button>
        {!p.is_gift_card && <button type="button" aria-label={t('quickAdd', {name})} aria-haspopup="dialog" onClick={() => setQuickOpen(true)} className="absolute bottom-2 right-2 z-20 flex h-11 w-11 items-center justify-center border border-black bg-black text-white transition-colors hover:bg-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"><Plus size={21} strokeWidth={1.7} aria-hidden="true"/></button>}
      </div>
      <div className="flex flex-1 flex-col px-2 py-2.5 md:px-3 md:py-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-[11px] font-bold uppercase leading-snug tracking-wide group-hover:text-brand-primary md:text-sm">
            <Link href={href} onClick={() => onProductClick?.({ ...tile, color: selectedColor })} className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-brand-primary">{title}</Link>
          </h3>
          <div className="shrink-0 text-right text-xs font-bold leading-snug md:text-sm">
            {(p.is_gift_card || priceRange.min !== priceRange.max) && <span className="block text-[10px] font-normal">{t('from')}</span>}
            <span className={sale ? 'text-brand-primary-hover' : 'text-black'}>{formatPrice(price, locale)}</span>
            {sale && <del className="block text-[10px] font-normal text-gray-500">{formatPrice(originalPrice, locale)}</del>}
          </div>
        </div>
        {colors.length > 0 && <div>
          <div className="-ml-2 flex flex-wrap" role="group" aria-label={t('colors')}>
            {colors.map(c => <button type="button" key={c.color}
              aria-label={`${name}, ${formatColorLabel(c.color, locale)}`} aria-pressed={selectedColor === c.color}
              disabled={!!allowedColors && !allowedColors.includes(colorKey(c.color))} title={formatColorLabel(c.color, locale)}
              onClick={() => { setSelectedColor(c.color); setFailed(false); setHover(false) }}
              className="relative z-10 flex h-11 w-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-35">
              <span aria-hidden="true" className={`h-3 w-3 border border-black md:h-3.5 md:w-3.5 ${selectedColor === c.color ? 'outline outline-1 outline-offset-4 outline-black' : ''}`} style={{backgroundColor:c.color_hex || '#000000'}} />
            </button>)}
          </div>
          {selectedColor && <p className="text-[10px] uppercase tracking-wide text-gray-600 md:text-xs" aria-live="polite">{formatColorLabel(selectedColor, locale)}</p>}
        </div>}
        {feedback && <p role="status" className="mt-1 text-xs text-gray-700">{feedback}</p>}
      </div>
      {quickOpen && <CatalogQuickAdd product={p} initialColor={selectedColor} onClose={() => setQuickOpen(false)}/>}

    </article>
  )
}
