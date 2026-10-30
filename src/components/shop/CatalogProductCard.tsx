'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Heart } from 'lucide-react'
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
  colorKey,
  productPrice,
  type CatalogProduct,
} from '@/lib/catalog-filters'

/** Existing MOSE card design, with accessible sibling links/buttons. */
export default function CatalogProductCard({
  tile,
  priority = false,
  showCategoryLabels = true,
}: {
  tile: ShopTile<CatalogProduct>
  priority?: boolean
  showCategoryLabels?: boolean
}) {
  const locale = useLocale(),
    t = useTranslations('shop.catalog'),
    shop = useTranslations('shop')
  const [hover, setHover] = useState(false),
    [failed, setFailed] = useState(false),
    [saving, setSaving] = useState(false)
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist()
  const p = tile.product,
    name = locale === 'en' ? p.name_en || p.name : p.name,
    title = name.replace(/^MOSE\s+/i, ''),
    saved = isInWishlist(p.id)
  const image = getImageForColor(p.images, tile.color),
    second = getHoverImageForColor(p.images, tile.color, image)
  const inStock =
    p.is_gift_card ||
    (p.variants ?? []).some(
      (v) =>
        availableVariant(v) &&
        (!tile.color || colorKey(v.color ?? '') === colorKey(tile.color)),
    )
  const stock = getColorStock(p.variants, tile.color),
    colors = getUniqueColors(p.variants),
    price = productPrice(p),
    sale = p.sale_price !== null && p.sale_price < p.base_price
  const href = buildPdpHref(p.slug, tile.color),
    category =
      locale === 'en'
        ? p.category?.name_en || p.category?.name
        : p.category?.name
  return (
    <article
      className="group flex h-full min-w-0 flex-col overflow-hidden border-2 border-black bg-white transition-all duration-300 md:hover:-translate-y-2 motion-reduce:transform-none motion-reduce:transition-none"
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
    >
      <div className="relative aspect-[3/4.2] flex-shrink-0 overflow-hidden bg-gray-100 md:aspect-[3/4]">
        <Link
          href={href}
          className="absolute inset-0 block focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-brand-primary"
          aria-label={
            tile.color
              ? `${name}, ${formatColorLabel(tile.color, locale)}`
              : name
          }
        >
          <Image
            src={failed ? '/placeholder-product.svg' : image}
            alt={
              tile.color
                ? `${name}, ${formatColorLabel(tile.color, locale)}`
                : name
            }
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 420px"
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
              sizes="(max-width: 1280px) 33vw, 420px"
              quality={90}
              className="hidden object-cover object-center md:block"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 md:group-hover:opacity-100" />
        </Link>
        <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col items-start gap-2 md:left-4 md:top-4">
          {sale && (
            <span className="border-2 border-black bg-black px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              -{Math.round((1 - price / p.base_price) * 100)}%
            </span>
          )}
        </div>
        {showCategoryLabels && category && (
          <span className="pointer-events-none absolute right-4 top-4 hidden border-2 border-black bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-sm md:block">
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
              if (saved) await removeFromWishlist(p.id)
              else await addToWishlist(p.id)
            } finally {
              setSaving(false)
            }
          }}
          className={`absolute bottom-2 right-2 z-20 flex h-11 w-11 items-center justify-center border-2 border-black backdrop-blur-sm transition-all focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-brand-primary disabled:opacity-50 md:bottom-4 md:right-4 md:h-12 md:w-12 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 ${saved ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white/90 text-black hover:bg-brand-primary hover:text-white'}`}
        >
          <Heart
            size={24}
            strokeWidth={2.5}
            fill={saved ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        </button>
      </div>
      <div className="flex flex-1 flex-col p-2 md:p-4">
        <h3 className="mb-1 line-clamp-2 text-xs font-bold uppercase tracking-wide transition-colors group-hover:text-brand-primary md:mb-2 md:text-lg">
          <Link
            href={href}
            className="focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            {title}
          </Link>
        </h3>
        {tile.color ? (
          <div className="mb-2 flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-3 w-3 border-2 border-black md:h-4 md:w-4"
              style={{ backgroundColor: tile.color_hex || '#000000' }}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700 md:text-xs">
              {formatColorLabel(tile.color, locale)}
            </span>
          </div>
        ) : (
          colors.length > 1 && (
            <div
              className="-ml-2 mb-2 flex flex-wrap items-center"
              aria-label={t('colors')}
            >
              {colors.map((c) => (
                <Link
                  key={c.color}
                  href={buildPdpHref(p.slug, c.color)}
                  aria-label={`${name}, ${formatColorLabel(c.color, locale)}`}
                  title={formatColorLabel(c.color, locale)}
                  className="flex min-h-11 min-w-8 items-center justify-center focus-visible:outline-2 focus-visible:outline-brand-primary"
                >
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 border-2 border-black md:h-4 md:w-4"
                    style={{ backgroundColor: c.color_hex || '#000000' }}
                  />
                </Link>
              ))}
              <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-700 md:text-xs">
                {shop('colorCount', { count: colors.length })}
              </span>
            </div>
          )
        )}
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          {p.is_gift_card && (
            <span className="text-xs font-bold">{t('from')}</span>
          )}
          <span
            className={`text-lg font-bold md:text-2xl ${sale ? 'text-brand-primary-hover' : 'text-black'}`}
          >
            {formatPrice(price, locale)}
          </span>
          {sale && (
            <del className="text-xs text-gray-500 md:text-sm">
              {formatPrice(p.base_price, locale)}
            </del>
          )}
        </div>
      </div>
    </article>
  )
}
