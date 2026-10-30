'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
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
import { formatColorLabel } from '@/lib/product-display'
import { formatPrice } from '@/lib/format-price'
import { useWishlist } from '@/store/wishlist'
import { useCatalogFilters } from '@/components/shop/useCatalogFilters'
import { useCatalogTracking } from '@/components/shop/useCatalogTracking'
import CatalogProductCard from '@/components/shop/CatalogProductCard'
import RecentlyViewed from '@/components/RecentlyViewed'
import ShopCategoryNav from '@/components/shop/ShopCategoryNav'
import DetailBlok from '@/components/shop/DetailBlok'
import DualRangeSlider from '@/components/DualRangeSlider'
import { getSiteSettings } from '@/lib/settings'
import { trackPixelEvent } from '@/lib/facebook-pixel'

export type ShopProduct = CatalogProduct
export type ShopCategory = CatalogCategory
const fieldClass =
  'min-h-11 w-full border-2 border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-black transition-colors focus:border-brand-primary focus:outline-2 focus:outline-offset-2 focus:outline-brand-primary'
const categoryOrder = ['hoodies', 't-shirts', 'longsleeves', 'sweaters', 'broeken', 'cadeaubonnen']

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
  const products = initialProducts ?? fallbackProducts,
    categories = initialCategories ?? fallbackCategories,
    serverCatalog = initialProducts !== undefined && initialCategories !== undefined,
    loading = !serverCatalog && fallbackLoading,
    error = serverCatalog ? '' : fallbackError
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
          const index = categoryOrder.indexOf(slug)
          return index < 0 ? categoryOrder.length : index
        }
        return rank(a.slug) - rank(b.slug)
      }),
    [categories, products],
  )
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
            filters.category === 'all' || p.category?.slug === filters.category,
        ),
      ),
    [products, filters.category],
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
    (filters.q.trim() ? 1 : 0) +
    (filters.min !== null || filters.max !== null ? 1 : 0) +
    filters.sizes.length +
    filters.colors.length +
    (filters.stock ? 1 : 0)
  const reset = () => update({ ...emptyCatalogFilters, sizes: [], colors: [] })
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
    <div className="space-y-6">
      {searchField}
      <label className="flex min-h-11 cursor-pointer items-center gap-3 border-2 border-gray-300 p-3 text-sm font-bold uppercase tracking-wide">
        <input
          type="checkbox"
          checked={filters.stock}
          onChange={(e) => update({ stock: e.target.checked })}
          className="h-4 w-4 accent-brand-primary"
        />
        {t('available')}
      </label>
      <p className="text-xs leading-relaxed text-gray-500">{t('availableHelp')}</p>
      {sortField}
      <p className="text-xs leading-relaxed text-gray-500">{t('filterHelp')}</p>
      {!!dimensions.sizes.length && (
        <fieldset>
          <legend className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-900">
            {t('sizes')}
          </legend>
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
        </fieldset>
      )}
      {!!dimensions.colors.length && (
        <fieldset>
          <legend className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-900">
            {t('colors')}
          </legend>
          <div className="max-h-64 space-y-1 overflow-y-auto">
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
        </fieldset>
      )}
      <fieldset>
        <legend className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-900">
          {t('price')}
        </legend>
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
      </fieldset>
      {activeCount > 0 && (
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
      <header className="border-b-2 border-black bg-[#F5F4F1]">
        <div className="mx-auto max-w-7xl px-4 pb-2 pt-3 md:pt-5">
          <h1 className="mb-2 font-display text-2xl uppercase leading-none md:text-4xl">{page('title')}</h1>
          <ShopCategoryNav
            items={[{slug: 'all', label: t('all')}, ...categoryChoices.map(c => ({slug: c.slug, label: name(c)}))]}
            active={filters.category}
            onSelect={category => update({category})}
            label={t('category')}
            previousLabel={t('previousCategories')}
            nextLabel={t('nextCategories')}
          />
        </div>
      </header>
      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-4 pt-2 md:pb-8 md:pt-4">
        <div className="mb-3 flex min-h-11 items-center justify-between gap-3 border-b-2 border-black pb-2 lg:justify-end">
          <button type="button" onClick={() => setMobileOpen(true)} aria-haspopup="dialog" aria-controls="catalog-filter-dialog" className="flex min-h-11 shrink-0 items-center justify-center gap-2 border-2 border-black bg-white px-3 text-xs font-bold uppercase tracking-wide text-black lg:hidden">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {t('filters')} &amp; {t('sort')}
            {activeCount > 0 && <span className="bg-brand-primary px-1.5 py-0.5 text-xs text-white">{activeCount}</span>}
          </button>
          <p role="status" aria-live="polite" className="text-right text-xs font-bold text-gray-900 md:text-sm">
            {loading ? t('loading') : t('models', {count: filtered.length})}
          </p>
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
        <div className="grid gap-8 lg:grid-cols-[256px_minmax(0,1fr)]">
          <aside className="hidden lg:block" aria-label={t('filters')}>
            <div className="lg:sticky lg:top-24">{filterPanel('desktop')}</div>
          </aside>
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
                  className="mt-6 min-h-11 bg-black px-6 py-3 text-sm font-semibold text-white"
                >
                  {t('reset')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3">
                {tiles.map((tile, index) => (
                  <CatalogProductCard
                    key={tile.tileKey}
                    tile={tile}
                    filters={filters}
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
        {!loading && <DetailBlok />}
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
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-[92%] max-w-sm flex-col border-0 border-l-4 border-black bg-white p-0 shadow-2xl backdrop:bg-black/80 open:flex"
      >
        <header className="flex items-center justify-between gap-3 border-b-2 border-black bg-white px-5 py-4">
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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          {filterPanel('mobile')}
        </div>
        <footer className="flex gap-3 border-t-2 border-black bg-white p-6">
          <button
            type="button"
            onClick={reset}
            className="min-h-12 flex-1 border-2 border-black bg-white px-3 py-3 text-sm font-bold uppercase tracking-wider text-black hover:bg-gray-100"
          >
            {t('reset')}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="min-h-12 flex-1 border-2 border-black bg-black px-3 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-gray-900"
          >
            {t('viewResults', { count: tiles.length })}
          </button>
        </footer>
      </dialog>
    </div>
  )
}
