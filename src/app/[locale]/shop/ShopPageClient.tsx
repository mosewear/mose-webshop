'use client'

import { useLiveAvailability } from '@/hooks/useLiveAvailability'

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, Search, SlidersHorizontal, X, RectangleVertical, Columns2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { SHOP_PRODUCT_SELECT } from '@/lib/catalog-select'
import {
  catalogDimensions,
  emptyCatalogFilters,
  filterCatalog,
  catalogTiles,
  matchesCatalogProduct,
  productPriceRange,
  type CatalogCategory,
  type CatalogFilters,
  type CatalogProduct,
  type CatalogSort,
} from '@/lib/catalog-filters'
import { shopCategoryOrder, shopCategoryImages, sportProductSlugs } from '@/lib/catalog-merchandising'
import { formatColorLabel } from '@/lib/product-display'
import { formatPrice } from '@/lib/format-price'
import { useWishlist } from '@/store/wishlist'
import { useCatalogFilters } from '@/components/shop/useCatalogFilters'
import { useCatalogTracking } from '@/components/shop/useCatalogTracking'
import CatalogProductCard from '@/components/shop/CatalogProductCard'
import RecentlyViewed from '@/components/RecentlyViewed'
import ShopCategoryNav from '@/components/shop/ShopCategoryNav'
import { getImageForColor } from '@/lib/product-display'
import DetailBlok from '@/components/shop/DetailBlok'
import DualRangeSlider from '@/components/DualRangeSlider'
import { getSiteSettings } from '@/lib/settings'
import { trackPixelEvent } from '@/lib/facebook-pixel'

export type ShopProduct = CatalogProduct
export type ShopCategory = CatalogCategory
const fieldClass =
  'min-h-11 w-full border-2 border-gray-300 bg-white px-3 py-3 text-base font-semibold text-black transition-colors focus:border-brand-primary focus:outline-2 focus:outline-offset-2 focus:outline-brand-primary sm:text-sm'

function FilterGroup({ title, selection, mobile, initiallyOpen = false, children }: {
  title: string; selection?: string; mobile: boolean; initiallyOpen?: boolean; children: ReactNode
}) {
  const [open, setOpen] = useState(initiallyOpen)
  const id = useId()
  if (!mobile) return <fieldset><legend className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-900">{title}</legend>{children}</fieldset>
  return <section className="border-b border-black/15 pb-4">
    <h3><button type="button" aria-label={selection ? `${title}: ${selection}` : title} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)} className="flex min-h-11 w-full items-center justify-between gap-3 text-left focus-visible:outline-2 focus-visible:outline-brand-primary">
      <span className="text-sm font-bold uppercase tracking-wide">{title}</span>
      <span className="ml-auto max-w-[60%] truncate text-xs text-gray-600">{selection}</span>
      <ChevronDown size={18} aria-hidden="true" className={open ? 'shrink-0 rotate-180' : 'shrink-0'} />
    </button></h3>
    <fieldset id={id} hidden={!open} className="pt-3"><legend className="sr-only">{title}</legend>{children}</fieldset>
  </section>
}

export default function ShopPageClient({
  initialProducts,
  initialCategories,
  initialFilters = emptyCatalogFilters,
}: {
  initialProducts?: CatalogProduct[]
  initialCategories?: CatalogCategory[]
  initialFilters?: CatalogFilters
}) {
  const locale = useLocale(),
    t = useTranslations('shop.catalog'),
    page = useTranslations('shop')
  // Server props can change during an RSC refresh without remounting this
  // component. Keep them authoritative; local state serves only the client
  // fallback when no complete server catalog was supplied.
  const [fallbackProducts, setFallbackProducts] = useState<CatalogProduct[]>([]),
    [fallbackCategories, setFallbackCategories] = useState<CatalogCategory[]>([]),
    [fallbackLoading, setFallbackLoading] = useState(true),
    [fallbackError, setFallbackError] = useState('')
  const products = useLiveAvailability(initialProducts ?? fallbackProducts),
    categories = initialCategories ?? fallbackCategories,
    serverCatalog = initialProducts !== undefined && initialCategories !== undefined,
    loading = !serverCatalog && fallbackLoading,
    error = serverCatalog ? '' : fallbackError
  const [compactView, setCompactView] = useState(true)
  const [showCategoryLabels, setShowCategoryLabels] = useState(true)
  useEffect(() => {
    let stopped = false
    void getSiteSettings()
      .then((settings) => {
        if (!stopped)
          setShowCategoryLabels(settings.show_category_labels ?? true)
      })
      .catch(() => {})
    return () => {
      stopped = true
    }
  }, [])
  const { filters, update } = useCatalogFilters(initialFilters)
  const [mobileOpen, setMobileOpen] = useState(false),
    dialog = useRef<HTMLDialogElement>(null)
  const { loadWishlist } = useWishlist()
  useEffect(() => {
    void loadWishlist()
  }, [loadWishlist])
  useEffect(() => {
    if (serverCatalog) return
    setFallbackLoading(true)
    let stopped = false
    const abort = new AbortController()
    async function load() {
      try {
        const db = createClient()
        const [p, c] = await Promise.all([
          db
            .from('products')
            .select(SHOP_PRODUCT_SELECT)
            .eq('is_active', true)
            .eq('status', 'active')
            .order('display_order')
            .abortSignal(abort.signal),
          db
            .from('categories')
            .select('id,name,name_en,slug')
            .eq('status', 'active')
            .order('name')
            .abortSignal(abort.signal),
        ])
        if (p.error || c.error) throw Error()
        if (!stopped) {
          setFallbackProducts(p.data as CatalogProduct[])
          setFallbackCategories(c.data)
          setFallbackError('')
        }
      } catch {
        if (!stopped) setFallbackError(t('loadError'))
      } finally {
        if (!stopped) setFallbackLoading(false)
      }
    }
    void load()
    return () => {
      stopped = true
      abort.abort()
    }
  }, [serverCatalog, t])
  useEffect(() => {
    if (mobileOpen && !dialog.current?.open) dialog.current?.showModal()
    else if (!mobileOpen && dialog.current?.open) dialog.current?.close()
    const previous = document.body.style.overflow
    if (mobileOpen) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [mobileOpen])
  const name = (c: CatalogCategory) =>
    locale === 'en' ? c.name_en || c.name : c.name
  const categoryChoices = useMemo(
    () =>
      categories.filter((c) =>
        products.some((p) => p.category?.slug === c.slug),
      ).sort((a, b) => {
        const rank = (slug: string) => {
          const index = shopCategoryOrder.indexOf(slug)
          return index < 0 ? shopCategoryOrder.length : index
        }
        return rank(a.slug) - rank(b.slug)
      }),
    [categories, products],
  )
  const hasSport = products.some(p => sportProductSlugs.has(p.slug))
  const navigationItems = [
    { slug: 'all', label: t('all') },
    ...[...categoryChoices.map(c => ({ slug: c.slug, label: name(c) })),
      ...(hasSport ? [{ slug: 'sport', label: t('sport') }] : [])]
      .sort((a, b) => {
        const rank = (slug: string) => {
          const index = shopCategoryOrder.indexOf(slug)
          return index < 0 ? shopCategoryOrder.length - 1 : index
        }
        return rank(a.slug) - rank(b.slug)
      })
      .map(item => ({ ...item, image: getImageForColor(
        (products.find(p => p.slug === shopCategoryImages[item.slug]) ?? products.find(p => p.category?.slug === item.slug))?.images, null,
      ) })),
  ]
  const selectedNavigation = filters.collection === 'sport' ? 'sport' : filters.category
  const selectedTitle = navigationItems.find(item => item.slug === selectedNavigation)?.label
  useEffect(() => {
    if (
      !loading &&
      filters.category !== 'all' &&
      !categoryChoices.some((c) => c.slug === filters.category)
    )
      update({ category: 'all' }, 'replace')
  }, [categoryChoices, filters.category, loading, update])
  const filtered = useMemo(
    () => filterCatalog(products, filters, locale),
    [products, filters, locale],
  )
  const tiles = useMemo(
    () =>
      catalogTiles(filtered, filters),
    [filtered, filters],
  )
  const { trackSelect } = useCatalogTracking({ tiles, filters, locale })
  useEffect(() => {
    if (!filters.q) return
    const timer = window.setTimeout(
      () => trackPixelEvent('Search', { search_string: filters.q }),
      600,
    )
    return () => window.clearTimeout(timer)
  }, [filters.q])
  const dimensions = useMemo(
    () =>
      catalogDimensions(
        products.filter(
          (p) =>
            (filters.category === 'all' || p.category?.slug === filters.category) &&
            (filters.collection !== 'sport' || sportProductSlugs.has(p.slug)),
        ),
      ),
    [products, filters.category, filters.collection],
  )
  const bounds = useMemo(
    () =>
      products.length
        ? [
            Math.floor(Math.min(...products.map(p => productPriceRange(p).min))),
            Math.ceil(Math.max(...products.map(p => productPriceRange(p).max))),
          ]
        : [0, 500],
    [products],
  )
  const activeCount =
    (filters.category === 'all' ? 0 : 1) +
    (filters.collection ? 1 : 0) +
    (filters.q.trim() ? 1 : 0) +
    (filters.min !== null || filters.max !== null ? 1 : 0) +
    filters.sizes.length +
    filters.colors.length +
    (filters.stock ? 1 : 0)
  const reset = () => update({ ...emptyCatalogFilters, collection: undefined, sizes: [], colors: [] })
  const refinementCount = activeCount - (filters.category === 'all' ? 0 : 1) - (filters.collection ? 1 : 0)
  const resetRefinements = () => update({ ...emptyCatalogFilters, category: filters.category, collection: filters.collection, sizes: [], colors: [] })
  const toggle = (field: 'sizes' | 'colors', value: string) =>
    update({
      [field]: filters[field].includes(value)
        ? filters[field].filter((x) => x !== value)
        : [...filters[field], value],
    })
  const normalizePrice = () => {
    if (
      filters.min !== null &&
      filters.max !== null &&
      filters.min > filters.max
    )
      update({ min: filters.max, max: filters.min }, 'replace')
  }
  const searchField = (
    <label className="block">
      <span className="mb-3 block text-sm font-bold uppercase tracking-wide text-gray-900">
        {t('search')}
      </span>
      <div className="relative">
        <input
          type="search"
          value={filters.q}
          onChange={(e) => update({ q: e.target.value }, 'typing')}
          placeholder={t('searchPlaceholder')}
          className={fieldClass + ' pr-12'}
        />
        <Search
          size={20}
          aria-hidden="true"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </div>
    </label>
  )
  const sortField = (
    <label className="block">
      <span className="mb-3 block text-sm font-bold uppercase tracking-wide text-gray-900">
        {t('sort')}
      </span>
      <select
        aria-label={t('sort')}
        value={filters.sort}
        onChange={(e) => update({ sort: e.target.value as CatalogSort })}
        className={fieldClass}
      >
        {(
          ['featured', 'newest', 'price-asc', 'price-desc', 'name'] as const
        ).map((value) => (
          <option key={value} value={value}>
            {t(value)}
          </option>
        ))}
      </select>
    </label>
  )
  const filterPanel = (prefix: string) => (
    <div className={prefix === 'mobile' ? 'space-y-4' : 'space-y-6'}>
      {sortField}
      {!!dimensions.sizes.length && (
        <FilterGroup mobile={prefix === 'mobile'} title={t('sizes')} selection={filters.sizes.join(', ')} initiallyOpen>
          <div className="flex flex-wrap gap-2">
            {dimensions.sizes.map((size) => {
              const checked = filters.sizes.includes(size),
                count = filterCatalog(
                  products,
                  { ...filters, sizes: [size] },
                  locale,
                ).length
              return (
                <label
                  key={size}
                  className={`relative flex min-h-11 min-w-11 cursor-pointer items-center justify-center border-2 px-3 text-xs font-bold uppercase tracking-wide ${checked ? 'border-brand-primary bg-brand-primary text-white' : 'border-gray-300 bg-white text-black'} ${!count && !checked ? 'cursor-not-allowed opacity-35' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked}
                    disabled={!count && !checked}
                    onChange={() => toggle('sizes', size)}
                  />
                  <span
                    className="absolute inset-0 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-primary"
                    aria-hidden="true"
                  />
                  <span>{size === 'ONE SIZE' ? t('oneSize') : size}</span>
                  <span className="sr-only"> ({count})</span>
                </label>
              )
            })}
          </div>
        </FilterGroup>
      )}
      {!!dimensions.colors.length && (
        <FilterGroup mobile={prefix === 'mobile'} title={t('colors')} selection={filters.colors.map(color => formatColorLabel(dimensions.colors.find(c => c.key === color)?.label ?? color, locale)).join(', ')}>
          <div className={prefix === 'mobile' ? 'space-y-2' : 'max-h-64 space-y-1 overflow-y-auto'}>
            {dimensions.colors.map((color) => {
              const checked = filters.colors.includes(color.key),
                count = filterCatalog(
                  products,
                  { ...filters, colors: [color.key] },
                  locale,
                ).length
              return (
                <label
                  key={color.key}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 border-2 px-3 text-xs font-bold uppercase tracking-wide ${!count && !checked ? 'cursor-not-allowed border-gray-200 text-gray-400' : checked ? 'border-brand-primary bg-brand-primary/5 text-black' : 'border-gray-300 hover:border-black'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!count && !checked}
                    onChange={() => toggle('colors', color.key)}
                    className="h-4 w-4 accent-brand-primary"
                  />
                  <span className="flex-1">
                    {formatColorLabel(color.label, locale)}
                  </span>
                  <span className="text-xs text-gray-500">{count}</span>
                </label>
              )
            })}
          </div>
        </FilterGroup>
      )}
      <FilterGroup mobile={prefix === 'mobile'} title={t('price')} selection={filters.min !== null || filters.max !== null ? `${formatPrice(filters.min ?? bounds[0], locale)} – ${formatPrice(filters.max ?? bounds[1], locale)}` : undefined}>
        <DualRangeSlider
          min={bounds[0]}
          max={Math.max(bounds[0] + 1, bounds[1])}
          value={[filters.min ?? bounds[0], filters.max ?? bounds[1]]}
          onChange={([min, max]) =>
            update(
              {
                min: min === bounds[0] ? null : min,
                max: max === bounds[1] ? null : max,
              },
              'replace',
            )
          }
          step={1}
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-500">
            {t('fromPrice')}
            <input
              id={`${prefix}-minimum`}
              type="number"
              inputMode="decimal"
              min="0"
              max="100000"
              step="1"
              aria-label={t('minimum')}
              placeholder={String(bounds[0])}
              value={filters.min ?? ''}
              onBlur={normalizePrice}
              onChange={(e) =>
                update(
                  {
                    min:
                      e.target.value === ''
                        ? null
                        : Math.max(0, Math.min(100000, Number(e.target.value))),
                  },
                  'typing',
                )
              }
              className={fieldClass + ' mt-1'}
            />
          </label>
          <label className="text-xs text-gray-500">
            {t('toPrice')}
            <input
              id={`${prefix}-maximum`}
              type="number"
              inputMode="decimal"
              min="0"
              max="100000"
              step="1"
              aria-label={t('maximum')}
              placeholder={String(bounds[1])}
              value={filters.max ?? ''}
              onBlur={normalizePrice}
              onChange={(e) =>
                update(
                  {
                    max:
                      e.target.value === ''
                        ? null
                        : Math.max(0, Math.min(100000, Number(e.target.value))),
                  },
                  'typing',
                )
              }
              className={fieldClass + ' mt-1'}
            />
          </label>
        </div>
      </FilterGroup>
      <div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold">
          <input type="checkbox" checked={filters.stock} onChange={(e) => update({ stock: e.target.checked })} className="h-5 w-5 shrink-0 accent-brand-primary" />
          {t('available')}
        </label>
        <p className="pl-8 text-xs leading-relaxed text-gray-600">{t('availableHelpShort')}</p>
      </div>
      {searchField}
      {prefix !== 'mobile' && activeCount > 0 && (
        <button
          type="button"
          onClick={reset}
          className="min-h-11 w-full border-2 border-black bg-white px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-black hover:text-white"
        >
          {t('reset')}
        </button>
      )}
    </div>
  )
  const chips: Array<{ key: string; label: string; clear: () => void }> = []
  if (filters.collection === 'sport') chips.push({ key: 'collection', label: t('sport'), clear: () => update({ collection: undefined }) })
  if (filters.q.trim())
    chips.push({
      key: 'q',
      label: `“${filters.q.trim()}”`,
      clear: () => update({ q: '' }),
    })
  if (filters.min !== null || filters.max !== null)
    chips.push({
      key: 'price',
      label: `${formatPrice(filters.min ?? bounds[0], locale)} – ${formatPrice(filters.max ?? bounds[1], locale)}`,
      clear: () => update({ min: null, max: null }),
    })
  for (const size of filters.sizes)
    chips.push({
      key: 'size-' + size,
      label: size,
      clear: () => toggle('sizes', size),
    })
  for (const color of filters.colors)
    chips.push({
      key: 'color-' + color,
      label: formatColorLabel(
        dimensions.colors.find((c) => c.key === color)?.label ?? color,
        locale,
      ),
      clear: () => toggle('colors', color),
    })
  if (filters.stock)
    chips.push({
      key: 'stock',
      label: t('available'),
      clear: () => update({ stock: false }),
    })
  return (
    <div className="bg-white">
      <header className="border-b border-black/15 bg-[#F5F4F1]">
        <div className="mx-auto max-w-[1440px] px-4 pb-2 lg:px-6 pt-3 md:pt-5">
          <h1 className="mb-2 font-display text-2xl uppercase leading-none md:text-4xl">{selectedNavigation === 'all' ? page('title') : selectedTitle ?? page('title')}</h1>
          <ShopCategoryNav
            items={navigationItems}
            active={selectedNavigation}
            onSelect={selection => update({ category: selection === 'sport' ? 'all' : selection, collection: selection === 'sport' ? 'sport' : undefined })}
            label={t('category')}
            previousLabel={t('previousCategories')}
            nextLabel={t('nextCategories')}
          />
        </div>
      </header>
      <div className="relative z-10 mx-auto max-w-[1440px] px-3 pb-4 pt-2 sm:px-4 lg:px-6 md:pb-8 md:pt-4">
        <div className="mb-3 flex min-h-11 items-center justify-between gap-3 border-b border-black/20">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label={`${t('filters')} & ${t('sort')}`} aria-haspopup="dialog" aria-controls="catalog-filter-dialog" className="order-3 flex min-h-11 shrink-0 items-center justify-center gap-2 bg-white pl-3 text-[11px] font-bold text-black focus-visible:outline-2 focus-visible:outline-brand-primary">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            <span className="lg:hidden">{t('filters')}<span className="hidden min-[360px]:inline"> &amp; {t('sort')}</span></span><span className="hidden lg:inline">{t('filters')}</span>
            {activeCount > 0 && <span className="bg-brand-primary px-1.5 py-0.5 text-xs text-white">{activeCount}</span>}
          </button>
          <label className="order-2 ml-auto hidden items-center gap-3 text-xs font-semibold lg:flex">
            <span>{t('sort')}</span>
            <select aria-label={t('sort')} value={filters.sort} onChange={event => update({sort: event.target.value as CatalogSort})} className="min-h-11 max-w-52 border-0 bg-white pr-6 text-sm font-semibold text-black focus-visible:outline-2 focus-visible:outline-brand-primary">
              {(['featured', 'newest', 'price-asc', 'price-desc', 'name'] as const).map(value => <option key={value} value={value}>{t(value)}</option>)}
            </select>
          </label>
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <p role="status" aria-live="polite" className="whitespace-nowrap text-xs text-gray-700 md:text-sm">
            {loading ? t('loading') : t('models', {count: filtered.length})}
          </p>
          <div role="group" aria-label={t('view.label')} className="flex shrink-0 sm:hidden">
            {[false, true].map(compact => <button key={String(compact)} type="button" aria-label={t(compact ? 'view.compact' : 'view.large')} aria-pressed={compactView === compact} onClick={() => setCompactView(compact)} className={`flex h-11 w-11 items-center justify-center border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-brand-primary ${compactView === compact ? 'border-brand-primary text-black' : 'border-transparent text-gray-500'}`}>
              {compact ? <Columns2 size={18} aria-hidden="true" /> : <RectangleVertical size={18} aria-hidden="true" />}
            </button>)}
          </div>
          </div>
        </div>
        {!!chips.length && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {chips.map((chip) => (
              <button
                type="button"
                key={chip.key}
                onClick={chip.clear}
                aria-label={t('removeFilter', { filter: chip.label })}
                className="flex min-h-11 shrink-0 items-center gap-2 border-2 border-gray-300 border-l-brand-primary bg-gray-100 px-3 text-xs font-bold uppercase tracking-wide hover:border-black"
              >
                {chip.label}
                <X size={12} aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              onClick={reset}
              className="min-h-11 shrink-0 px-2 text-xs font-semibold underline underline-offset-4"
            >
              {t('reset')}
            </button>
          </div>
        )}
        <div className="min-w-0">
          <section aria-label={t('collection')} className="min-w-0">
            {error ? (
              <div
                role="alert"
                className="border border-gray-300 bg-[#f5f4f1] p-6 text-sm"
              >
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 min-h-11 font-semibold underline"
                >
                  {t('retry')}
                </button>
              </div>
            ) : !loading && !tiles.length ? (
              <div className="border border-gray-200 p-8 text-center sm:p-12">
                <h2 className="font-display text-xl uppercase tracking-wide">
                  {t('emptyTitle')}
                </h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-600">
                  {t('emptyBody')}
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="mose-button mose-button--secondary mt-6"
                >
                  {t('reset')}
                </button>
              </div>
            ) : (
              <div className={`-mx-3 grid gap-x-1 gap-y-5 sm:mx-0 sm:grid-cols-2 sm:gap-x-2 md:gap-x-4 md:gap-y-7 lg:grid-cols-3 xl:grid-cols-4 ${compactView ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {tiles.map((tile, index) => (
                  <CatalogProductCard
                    key={tile.tileKey}
                    tile={tile}
                    filters={filters}
                    largeMobile={!compactView}
                    imageSizes={`${compactView ? '(max-width: 639px) calc((100vw - 4px) / 2)' : '(max-width: 639px) 100vw'}, (max-width: 1023px) calc((100vw - 48px) / 2), (max-width: 1279px) calc((100vw - 80px) / 3), (max-width: 1439px) calc((100vw - 96px) / 4), 336px`}
                    index={index}
                    allowedColors={dimensions.colors.filter(c => matchesCatalogProduct(tile.product, filters, c.label)).map(c => c.key)}
                    onProductClick={(selectedTile) => trackSelect(selectedTile, index)}
                    priority={index < 2}
                    showCategoryLabels={showCategoryLabels}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
        {!loading && selectedNavigation === 'all' && refinementCount === 0 && <DetailBlok />}
        <div>
          <RecentlyViewed />
        </div>
      </div>
      <dialog
        id="catalog-filter-dialog"
        ref={dialog}
        onClose={() => setMobileOpen(false)}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          )).filter(control => control.getClientRects().length > 0)
          const first = controls[0], last = controls[controls.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
        aria-labelledby="catalog-filter-title"
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-md flex-col border-0 bg-white p-0 shadow-2xl backdrop:bg-black/70 open:flex sm:w-[92%] sm:border-l-2 sm:border-black"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-black bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <h2
            id="catalog-filter-title"
            className="font-display text-xl uppercase tracking-wide"
          >
            {t('filters')} &amp; {t('sort')}
          </h2>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label={t('close')}
            className="flex min-h-11 min-w-11 items-center justify-center border-2 border-black bg-white text-black transition-colors hover:bg-black hover:text-white"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {filterPanel('mobile')}
        </div>
        <footer className="shrink-0 border-t-2 border-black bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p role="status" aria-live="polite" className="sr-only">{t('models', {count: filtered.length})}</p>
          <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetRefinements}
            disabled={refinementCount === 0 && filters.sort === 'featured'}
            className="min-h-12 shrink-0 px-1 py-3 text-xs font-bold text-black underline underline-offset-4 disabled:cursor-default disabled:text-gray-400"
          >
            {t('resetRefinements')}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="mose-button mose-button--secondary flex-1"
          >
            {t('viewResults', { count: filtered.length })}
          </button>
          </div>
        </footer>
      </dialog>
    </div>
  )
}
