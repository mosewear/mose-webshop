'use client'

/**
 * Smart hybrid sticky variant-picker.
 *
 * Desktop-and-mobile sticky strip pinned to the bottom of the viewport that
 * keeps colour swatches, size pills, price and the primary CTA within reach
 * regardless of scroll position. Acts as a SECOND surface for the same
 * variant state living in `ProductPageClient` - everything is driven by
 * props so there is exactly one source of truth.
 *
 * Visibility rules:
 *   * Mobile (< md): visible once the user scrolls past a sentinel placed
 *     just above the main image gallery (so it never overlaps the hero).
 *   * Desktop (>= md): visible only while the main ATC button is OUT of
 *     viewport, so it never duplicates the in-page button.
 *   * Always hidden when the cart drawer is open.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { usePathname } from 'next/navigation'
import { useCartDrawer } from '@/store/cartDrawer'
import { formatPrice } from '@/lib/format-price'

interface AvailableColor {
  color: string
  hex: string | null
}

interface StickyVariantPickerProps {
  productId: string
  availableColors: AvailableColor[]
  availableSizes: string[]
  selectedColor: string
  selectedSize: string
  onSelectColor: (color: string) => void
  onSelectSize: (size: string) => void
  variants: Array<{
    size: string
    color: string
    is_available: boolean
    stock_quantity: number
    presale_stock_quantity: number
  }>
  finalPrice: number
  basePrice: number
  hasDiscount: boolean
  hasAnyStock: boolean
  isAdding: boolean
  hasVariantSelected: boolean
  onAddToCart: () => void
  /** ref to the main in-page ATC button. Used to hide on desktop while the
      main button is in view. */
  mainAtcRef: React.RefObject<HTMLButtonElement | null>
  translateColor: (color: string) => string
}

export default function StickyVariantPicker({
  productId,
  availableColors,
  availableSizes,
  selectedColor,
  selectedSize,
  onSelectColor,
  onSelectSize,
  variants,
  finalPrice,
  basePrice,
  hasDiscount,
  hasAnyStock,
  isAdding,
  hasVariantSelected,
  onAddToCart,
  mainAtcRef,
  translateColor,
}: StickyVariantPickerProps) {
  const t = useTranslations('product.sticky')
  const tProduct = useTranslations('product')
  const locale = useLocale()
  const { isOpen: isCartOpen } = useCartDrawer()
  const pathname = usePathname()

  const [mainAtcInView, setMainAtcInView] = useState(true)
  const [scrolledPastHero, setScrolledPastHero] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Hide on cart/checkout routes. usePathname runs on both server and
  // client so we never need a setState-in-effect roundtrip.
  const onAllowedRoute = !pathname.includes('/cart') && !pathname.includes('/checkout')

  // Desktop: track the main ATC button. Sticky shows when it's OUT of view.
  useEffect(() => {
    const node = mainAtcRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        setMainAtcInView(entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [mainAtcRef])

  // Mobile: drop a sentinel just above the gallery so the sticky only kicks
  // in once the hero is gone. Sentinel mount happens in ProductPageClient;
  // we look it up by data-attribute.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const findSentinel = () =>
      document.querySelector<HTMLDivElement>('[data-sticky-picker-sentinel]')

    let observer: IntersectionObserver | null = null
    let attempt = 0

    const attach = () => {
      const node = findSentinel()
      sentinelRef.current = node
      if (!node) {
        if (attempt < 20) {
          attempt += 1
          window.setTimeout(attach, 100)
        }
        return
      }
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (!entry) return
          // sentinel goes out of view => user is past the hero gallery
          setScrolledPastHero(!entry.isIntersecting)
        },
        { threshold: 0 }
      )
      observer.observe(node)
    }

    attach()
    return () => observer?.disconnect()
  }, [productId])

  const sizeAvailability = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const size of availableSizes) {
      const variantsForSize = variants.filter((v) => v.size === size)
      const available = variantsForSize.some(
        (v) =>
          v.is_available &&
          v.stock_quantity + (v.presale_stock_quantity || 0) > 0
      )
      map.set(size, available)
    }
    return map
  }, [availableSizes, variants])

  const colorAvailability = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const c of availableColors) {
      const variantsForColor = variants.filter((v) => v.color === c.color)
      const available = variantsForColor.some(
        (v) =>
          v.is_available &&
          v.stock_quantity + (v.presale_stock_quantity || 0) > 0
      )
      map.set(c.color, available)
    }
    return map
  }, [availableColors, variants])

  const ctaState: 'pickColor' | 'pickSize' | 'oos' | 'add' | 'adding' = (() => {
    if (isAdding) return 'adding'
    if (!hasAnyStock) return 'oos'
    if (availableColors.length > 1 && !selectedColor) return 'pickColor'
    if (availableSizes.length > 0 && !selectedSize) return 'pickSize'
    if (!hasVariantSelected) return 'pickSize'
    return 'add'
  })()

  // Desktop CTA toont prijs; mobile CTA niet (prijs staat al in PDP-body
  // en in de tweerijs layout willen we de groene knop niet visueel laten
  // concurreren met de prijsregel boven).
  const ctaLabelDesktop = (() => {
    switch (ctaState) {
      case 'adding':
        return t('adding')
      case 'oos':
        return tProduct('outOfStock')
      case 'pickColor':
        return t('pickColor')
      case 'pickSize':
        return t('pickSize')
      case 'add':
      default:
        return t('addToCartWithPrice', { price: formatPrice(finalPrice, locale) })
    }
  })()

  const ctaLabelMobile = (() => {
    switch (ctaState) {
      case 'adding':
        return t('adding')
      case 'oos':
        return tProduct('outOfStock')
      case 'pickColor':
        return t('pickColor')
      case 'pickSize':
        return t('pickSize')
      case 'add':
      default:
        return t('addToCartFull')
    }
  })()

  const ctaDisabled = ctaState === 'oos' || ctaState === 'adding'
  const ctaPulse = ctaState === 'pickColor' || ctaState === 'pickSize'

  const handleClick = () => {
    if (ctaState === 'pickColor') {
      const target = document.querySelector<HTMLElement>(
        '[data-color-section]'
      )
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (ctaState === 'pickSize') {
      const target = document.querySelector<HTMLElement>(
        '[data-variant-section]'
      )
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (ctaState === 'add') {
      onAddToCart()
    }
  }

  // Desktop visibility: only when the main ATC has scrolled out of view.
  // Mobile visibility: only after the hero gallery has scrolled past.
  // We render with display: none on the wrong viewport side, so a single
  // bar serves both worlds with appropriate styling per breakpoint.
  if (!onAllowedRoute || isCartOpen) return null

  const desktopVisible = !mainAtcInView
  const mobileVisible = scrolledPastHero

  return (
    <>
      {/* Desktop variant: visible when main ATC is out of view */}
      <div
        aria-hidden={!desktopVisible}
        className={`hidden md:block fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-black shadow-[0_-4px_20px_rgba(0,0,0,0.12)] transition-all duration-200 ${
          desktopVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <StickyContent
          variant="desktop"
          availableColors={availableColors}
          availableSizes={availableSizes}
          selectedColor={selectedColor}
          selectedSize={selectedSize}
          onSelectColor={onSelectColor}
          onSelectSize={onSelectSize}
          colorAvailability={colorAvailability}
          sizeAvailability={sizeAvailability}
          finalPrice={finalPrice}
          basePrice={basePrice}
          hasDiscount={hasDiscount}
          locale={locale}
          ctaLabel={ctaLabelDesktop}
          ctaState={ctaState}
          ctaDisabled={ctaDisabled}
          ctaPulse={ctaPulse}
          onClick={handleClick}
          translateColor={translateColor}
          tColorLabel={tProduct('color')}
          tSizeLabel={tProduct('size')}
        />
      </div>

      {/* Mobile variant: tweerijs layout. Rij 1 = selectors in gray-50,
          rij 2 = full-width brand-primary CTA zonder prijs. */}
      <div
        aria-hidden={!mobileVisible}
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-black shadow-[0_-4px_20px_rgba(0,0,0,0.12)] transition-all duration-200 ${
          mobileVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <StickyMobileTwoRow
          availableColors={availableColors}
          availableSizes={availableSizes}
          selectedColor={selectedColor}
          selectedSize={selectedSize}
          onSelectColor={onSelectColor}
          onSelectSize={onSelectSize}
          colorAvailability={colorAvailability}
          sizeAvailability={sizeAvailability}
          ctaLabel={ctaLabelMobile}
          ctaState={ctaState}
          ctaDisabled={ctaDisabled}
          ctaPulse={ctaPulse}
          onClick={handleClick}
          translateColor={translateColor}
          tColorLabel={t('colorLabel')}
          tSizeLabel={t('sizeLabel')}
        />
      </div>
    </>
  )
}

interface StickyContentProps {
  variant: 'desktop' | 'mobile'
  availableColors: AvailableColor[]
  availableSizes: string[]
  selectedColor: string
  selectedSize: string
  onSelectColor: (color: string) => void
  onSelectSize: (size: string) => void
  colorAvailability: Map<string, boolean>
  sizeAvailability: Map<string, boolean>
  finalPrice: number
  basePrice: number
  hasDiscount: boolean
  locale: string
  ctaLabel: string
  ctaState: 'pickColor' | 'pickSize' | 'oos' | 'add' | 'adding'
  ctaDisabled: boolean
  ctaPulse: boolean
  onClick: () => void
  translateColor: (color: string) => string
  tColorLabel: string
  tSizeLabel: string
}

// Desktop sticky: één rij met label + swatches + maten + prijs + CTA met
// prijs. Wordt alleen op md+ getoond.
function StickyContent({
  availableColors,
  availableSizes,
  selectedColor,
  selectedSize,
  onSelectColor,
  onSelectSize,
  colorAvailability,
  sizeAvailability,
  finalPrice,
  basePrice,
  hasDiscount,
  locale,
  ctaLabel,
  ctaState,
  ctaDisabled,
  ctaPulse,
  onClick,
  translateColor,
  tColorLabel,
  tSizeLabel,
}: StickyContentProps) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
      {/* Colour swatches */}
      {availableColors.length > 0 && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden lg:inline">
            {tColorLabel}
          </span>
          <div className="flex gap-2">
            {availableColors.map(({ color, hex }) => {
              const isSelected = selectedColor === color
              const available = colorAvailability.get(color) ?? true
              return (
                <button
                  key={color}
                  onClick={() => onSelectColor(color)}
                  disabled={!available}
                  className={`relative shrink-0 transition-all border-2 ${
                    isSelected
                      ? 'border-brand-primary w-8 h-8'
                      : available
                      ? 'border-gray-300 hover:border-black w-7 h-7'
                      : 'border-gray-200 w-7 h-7 opacity-50 cursor-not-allowed'
                  }`}
                  aria-label={translateColor(color)}
                  title={translateColor(color)}
                >
                  <span
                    className="block w-full h-full"
                    style={{ backgroundColor: hex || '#cccccc' }}
                  />
                  {!available && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="block w-[140%] h-[2px] bg-red-500/80 rotate-45" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {availableColors.length > 0 && availableSizes.length > 0 && (
        <span className="h-8 w-px bg-gray-200 shrink-0" />
      )}

      {/* Size pills */}
      {availableSizes.length > 0 && (
        <div className="flex items-center gap-2 shrink min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden lg:inline shrink-0">
            {tSizeLabel}
          </span>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide min-w-0">
            {availableSizes.map((size) => {
              const isSelected = selectedSize === size
              const available = sizeAvailability.get(size) ?? false
              return (
                <button
                  key={size}
                  onClick={() => available && onSelectSize(size)}
                  disabled={!available}
                  className={`shrink-0 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all border-2 ${
                    isSelected
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : available
                      ? 'border-black bg-white text-black hover:bg-black hover:text-white'
                      : 'border-gray-200 text-gray-300 cursor-not-allowed line-through bg-white'
                  }`}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Price */}
      <div className="flex flex-col items-end leading-tight shrink-0">
        {hasDiscount ? (
          <>
            <span className="text-base font-bold text-brand-primary">
              {formatPrice(finalPrice, locale)}
            </span>
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(basePrice, locale)}
            </span>
          </>
        ) : (
          <span className="text-base font-bold">
            {formatPrice(finalPrice, locale)}
          </span>
        )}
      </div>

      {/* Primary CTA */}
      <button
        onClick={onClick}
        disabled={ctaDisabled}
        className={`shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all border-2 ${
          ctaDisabled
            ? 'bg-gray-200 border-gray-200 text-gray-500 cursor-not-allowed'
            : ctaState === 'add'
            ? 'bg-brand-primary border-brand-primary text-white hover:bg-brand-primary-hover hover:border-brand-primary-hover active:scale-95'
            : 'bg-black border-black text-white hover:bg-gray-800 active:scale-95'
        } ${ctaPulse ? 'animate-pulse-subtle' : ''}`}
        aria-label={ctaLabel}
      >
        <ShoppingCart className="w-4 h-4 shrink-0" />
        <span className="truncate">{ctaLabel}</span>
      </button>
    </div>
  )
}

interface StickyMobileTwoRowProps {
  availableColors: AvailableColor[]
  availableSizes: string[]
  selectedColor: string
  selectedSize: string
  onSelectColor: (color: string) => void
  onSelectSize: (size: string) => void
  colorAvailability: Map<string, boolean>
  sizeAvailability: Map<string, boolean>
  ctaLabel: string
  ctaState: 'pickColor' | 'pickSize' | 'oos' | 'add' | 'adding'
  ctaDisabled: boolean
  ctaPulse: boolean
  onClick: () => void
  translateColor: (color: string) => string
  tColorLabel: string
  tSizeLabel: string
}

// Mobile sticky: tweerijs.
// Rij 1 (gray-50): KLEUR-label + swatches | MAAT-label + maatpills,
// genereuze tap-targets, horizontaal scrollbaar als het krap wordt.
// Rij 2 (brand-primary): full-width CTA zonder prijs.
function StickyMobileTwoRow({
  availableColors,
  availableSizes,
  selectedColor,
  selectedSize,
  onSelectColor,
  onSelectSize,
  colorAvailability,
  sizeAvailability,
  ctaLabel,
  ctaState,
  ctaDisabled,
  ctaPulse,
  onClick,
  translateColor,
  tColorLabel,
  tSizeLabel,
}: StickyMobileTwoRowProps) {
  const hasColors = availableColors.length > 0
  const hasSizes = availableSizes.length > 0
  const showRowOne = hasColors || hasSizes

  return (
    <div className="flex flex-col">
      {/* Row 1 — selectors */}
      {showRowOne && (
        <div className="bg-gray-50 border-b border-gray-200 px-3 py-2.5 flex items-center gap-2.5 overflow-x-auto scrollbar-hide">
          {hasColors && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {tColorLabel}
              </span>
              <div className="flex gap-1.5">
                {availableColors.map(({ color, hex }) => {
                  const isSelected = selectedColor === color
                  const available = colorAvailability.get(color) ?? true
                  return (
                    <button
                      key={color}
                      onClick={() => onSelectColor(color)}
                      disabled={!available}
                      className={`relative shrink-0 w-8 h-8 transition-all border-2 ${
                        isSelected
                          ? 'border-brand-primary ring-2 ring-brand-primary/30 ring-offset-1 ring-offset-gray-50'
                          : available
                          ? 'border-gray-300 active:border-black'
                          : 'border-gray-200 opacity-50 cursor-not-allowed'
                      }`}
                      aria-label={translateColor(color)}
                      aria-pressed={isSelected}
                      title={translateColor(color)}
                    >
                      <span
                        className="block w-full h-full"
                        style={{ backgroundColor: hex || '#cccccc' }}
                      />
                      {!available && (
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="block w-[140%] h-[2px] bg-red-500/80 rotate-45" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {hasColors && hasSizes && (
            <span className="h-7 w-px bg-gray-300 shrink-0" />
          )}

          {hasSizes && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {tSizeLabel}
              </span>
              <div className="flex gap-1.5">
                {availableSizes.map((size) => {
                  const isSelected = selectedSize === size
                  const available = sizeAvailability.get(size) ?? false
                  return (
                    <button
                      key={size}
                      onClick={() => available && onSelectSize(size)}
                      disabled={!available}
                      aria-pressed={isSelected}
                      className={`shrink-0 min-w-[36px] h-8 px-2.5 text-xs font-bold uppercase tracking-wider transition-all border-2 ${
                        isSelected
                          ? 'border-brand-primary bg-brand-primary text-white'
                          : available
                          ? 'border-black bg-white text-black active:bg-black active:text-white'
                          : 'border-gray-200 text-gray-300 cursor-not-allowed line-through bg-white'
                      }`}
                    >
                      {size}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Row 2 — full-width CTA */}
      <button
        onClick={onClick}
        disabled={ctaDisabled}
        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold uppercase tracking-wider transition-all ${
          ctaDisabled
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : ctaState === 'add'
            ? 'bg-brand-primary text-white active:bg-brand-primary-hover active:scale-[0.99]'
            : 'bg-black text-white active:bg-gray-800 active:scale-[0.99]'
        } ${ctaPulse ? 'animate-pulse-subtle' : ''}`}
        aria-label={ctaLabel}
      >
        <ShoppingCart className="w-4 h-4 shrink-0" />
        <span>{ctaLabel}</span>
      </button>
    </div>
  )
}
