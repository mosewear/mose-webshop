'use client'
import Image from 'next/image'
import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { useWishlist } from '@/store/wishlist'
import { formatPrice } from '@/lib/format-price'
import { BLUR_DATA_URL } from '@/lib/blur-placeholder'
import {
  buildPdpHref,
  formatColorLabel,
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

export default function CatalogProductCard({
  tile,
  priority = false,
}: {
  tile: ShopTile<CatalogProduct>
  priority?: boolean
}) {
  const locale = useLocale(),
    t = useTranslations('shop.catalog'),
    [hover, setHover] = useState(false),
    [failed, setFailed] = useState(false),
    [saving, setSaving] = useState(false)
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist()
  const p = tile.product,
    name = locale === 'en' ? p.name_en || p.name : p.name,
    title = name.replace(/^MOSE\s+/i, ''),
    saved = isInWishlist(p.id)
  const image = getImageForColor(p.images, tile.color),
    second = getHoverImageForColor(p.images, tile.color, image)
  const inStock = (p.variants ?? []).some(
    (v) =>
      availableVariant(v) &&
      (!tile.color || colorKey(v.color ?? '') === colorKey(tile.color)),
  )
  const colors = getUniqueColors(p.variants),
    price = productPrice(p),
    sale = p.sale_price !== null && p.sale_price < p.base_price
  const href = buildPdpHref(p.slug, tile.color)
  return (
    <article
      className="group relative flex h-full min-w-0 flex-col"
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <Link
        href={href}
        className="relative block aspect-[3/4] overflow-hidden bg-[#f2f1ee] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary"
        aria-label={
          tile.color ? `${name}, ${formatColorLabel(tile.color, locale)}` : name
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
          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 350px"
          quality={90}
          priority={priority}
          className="object-cover transition-transform duration-500 motion-reduce:transition-none md:group-hover:scale-[1.025]"
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
            sizes="(max-width: 1023px) 33vw, 350px"
            quality={90}
            className="hidden object-cover md:block"
          />
        )}
        {sale && (
          <span className="absolute left-2 top-2 bg-black px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            {t('sale')}
          </span>
        )}
        {!p.is_gift_card && !inStock && (
          <span className="absolute bottom-2 left-2 bg-white/95 px-2 py-1 text-[10px] font-semibold text-gray-800">
            {t('unavailable')}
          </span>
        )}
      </Link>
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
        className="absolute right-2 top-2 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/95 text-black shadow-sm focus-visible:outline-2 focus-visible:outline-brand-primary disabled:opacity-50"
      >
        <Heart
          size={18}
          fill={saved ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
      </button>
      <div className="flex flex-1 flex-col gap-1.5 py-3">
        <Link
          href={href}
          className="font-semibold text-[13px] leading-snug text-black underline-offset-4 hover:underline sm:text-[15px]"
        >
          {title}
        </Link>
        {tile.color && (
          <p className="text-xs text-gray-500">
            {formatColorLabel(tile.color, locale)}
          </p>
        )}
        <p className="flex flex-wrap items-baseline gap-2 text-sm font-semibold sm:text-base">
          {p.is_gift_card && (
            <span className="text-xs font-normal text-gray-600">
              {t('from')}
            </span>
          )}
          <span>{formatPrice(price, locale)}</span>
          {sale && (
            <del className="text-xs font-normal text-gray-500">
              {formatPrice(p.base_price, locale)}
            </del>
          )}
        </p>
        {!tile.color && colors.length > 1 && (
          <div
            className="-ml-1 flex flex-wrap items-center"
            aria-label={t('colors')}
          >
            {colors.slice(0, 6).map((c) => (
              <Link
                key={c.color}
                href={buildPdpHref(p.slug, c.color)}
                aria-label={`${name}, ${formatColorLabel(c.color, locale)}`}
                title={formatColorLabel(c.color, locale)}
                className="flex min-h-11 min-w-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-brand-primary"
              >
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 rounded-full border border-black/20"
                  style={{ backgroundColor: c.color_hex || '#d1d5db' }}
                />
              </Link>
            ))}
            {colors.length > 6 && (
              <Link href={href} className="p-2 text-xs text-gray-500">
                +{colors.length - 6}
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
