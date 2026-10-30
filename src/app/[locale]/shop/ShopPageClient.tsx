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
  matchesCatalogProduct,
  productPrice,
  type CatalogCategory,
  type CatalogFilters,
  type CatalogProduct,
  type CatalogSort,
} from '@/lib/catalog-filters'
import { expandToShopTiles, formatColorLabel } from '@/lib/product-display'
import { formatPrice } from '@/lib/format-price'
import { useWishlist } from '@/store/wishlist'
import { useCatalogFilters } from '@/components/shop/useCatalogFilters'
import CatalogProductCard from '@/components/shop/CatalogProductCard'
import PaginaKop from '@/components/layout/PaginaKop'
import RecentlyViewed from '@/components/RecentlyViewed'
import { trackPixelEvent } from '@/lib/facebook-pixel'

export type ShopProduct = CatalogProduct
export type ShopCategory = CatalogCategory
const fieldClass =
  'min-h-11 w-full border border-gray-300 bg-white px-3 text-sm text-black focus:border-black focus:outline-2 focus:outline-offset-2 focus:outline-brand-primary'

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
  const [products, setProducts] = useState(initialProducts ?? []),
    [categories, setCategories] = useState(initialCategories ?? []),
    [loading, setLoading] = useState(!initialProducts),
    [error, setError] = useState('')
  const { filters, update } = useCatalogFilters(initialFilters)
  const [mobileOpen, setMobileOpen] = useState(false),
    dialog = useRef<HTMLDialogElement>(null)
  const { loadWishlist } = useWishlist()
  useEffect(() => {
    void loadWishlist()
  }, [loadWishlist])
  useEffect(() => {
    if (initialProducts && initialCategories) return
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
          setProducts(p.data as CatalogProduct[])
          setCategories(c.data)
          setError('')
        }
      } catch {
        if (!stopped) setError(t('loadError'))
      } finally {
        if (!stopped) setLoading(false)
      }
    }
    void load()
    return () => {
      stopped = true
      abort.abort()
    }
  }, [initialProducts, initialCategories, t])
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
      ),
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
      expandToShopTiles(filtered).filter((tile) =>
        matchesCatalogProduct(tile.product, filters, tile.color),
      ),
    [filtered, filters],
  )
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
            Math.floor(Math.min(...products.map(productPrice))),
            Math.ceil(Math.max(...products.map(productPrice))),
          ]
        : [0, 500],
    [products],
  )
  const countCategory = (slug: string) =>
    filterCatalog(products, { ...filters, category: slug }, locale).length
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
  const categorySelect = (
    <label className="block text-xs font-semibold">
      <span className="mb-2 block">{t('category')}</span>
      <select
        value={filters.category}
        onChange={(e) => update({ category: e.target.value })}
        className={fieldClass}
      >
        <option value="all">
          {t('all')} ({products.length})
        </option>
        {categoryChoices.map((c) => (
          <option key={c.id} value={c.slug}>
            {name(c)} (
            {products.filter((p) => p.category?.slug === c.slug).length})
          </option>
        ))}
      </select>
    </label>
  )
  const filterPanel = (prefix: string) => (
    <div className="space-y-6">
      {prefix === 'mobile' && categorySelect}
      <p className="text-xs leading-relaxed text-gray-500">{t('filterHelp')}</p>
      {!!dimensions.sizes.length && (
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">{t('sizes')}</legend>
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
                  className={`relative flex min-h-11 min-w-11 cursor-pointer items-center justify-center border px-3 text-xs font-semibold ${checked ? 'border-black bg-black text-white' : 'border-gray-300 bg-white text-black'} ${!count && !checked ? 'cursor-not-allowed opacity-35' : ''}`}
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
          <legend className="mb-3 text-sm font-semibold">{t('colors')}</legend>
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
                  className={`flex min-h-11 cursor-pointer items-center gap-3 text-sm ${!count && !checked ? 'cursor-not-allowed text-gray-400' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!count && !checked}
                    onChange={() => toggle('colors', color.key)}
                    className="h-4 w-4 accent-black"
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
        <legend className="mb-3 text-sm font-semibold">{t('price')}</legend>
        <div className="grid grid-cols-2 gap-3">
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
      <label className="flex min-h-11 cursor-pointer items-center gap-3 border-t border-gray-200 pt-3 text-sm">
        <input
          type="checkbox"
          checked={filters.stock}
          onChange={(e) => update({ stock: e.target.checked })}
          className="h-4 w-4 accent-black"
        />
        {t('available')}
      </label>
      {activeCount > 0 && (
        <button
          type="button"
          onClick={reset}
          className="min-h-11 text-sm font-semibold underline underline-offset-4"
        >
          {t('reset')}
        </button>
      )}
    </div>
  )
  const chips: Array<{ key: string; label: string; clear: () => void }> = []
  if (filters.category !== 'all')
    chips.push({
      key: 'category',
      label: name(
        categoryChoices.find((c) => c.slug === filters.category) ?? {
          id: '',
          slug: '',
          name: filters.category,
        },
      ),
      clear: () => update({ category: 'all' }),
    })
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
      <PaginaKop titel={page('title')} ondertitel={page('heroSubtitle')}>
        <div className="lg:hidden">{categorySelect}</div>
        <nav
          aria-label={t('category')}
          className="hidden flex-wrap gap-2 lg:flex"
        >
          {[{ id: 'all', slug: 'all', name: t('all') }, ...categoryChoices].map(
            (c) => (
              <button
                type="button"
                key={c.id}
                aria-pressed={filters.category === c.slug}
                onClick={() => update({ category: c.slug })}
                className={`min-h-11 border px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${filters.category === c.slug ? 'border-black bg-black text-white' : 'border-gray-300 bg-white hover:border-black'}`}
              >
                {name(c)}{' '}
                <span className="ml-1 opacity-60">{countCategory(c.slug)}</span>
              </button>
            ),
          )}
        </nav>
      </PaginaKop>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <div className="mb-5 grid grid-cols-2 items-end gap-3 lg:grid-cols-[1fr_240px]">
          <label className="relative col-span-2 block lg:col-span-1">
            <span className="sr-only">{t('search')}</span>
            <Search
              size={18}
              aria-hidden="true"
              className="absolute left-3 top-3.5 text-gray-500"
            />
            <input
              type="search"
              value={filters.q}
              onChange={(e) => update({ q: e.target.value }, 'typing')}
              placeholder={t('searchPlaceholder')}
              className={fieldClass + ' pl-10'}
            />
          </label>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-haspopup="dialog"
            aria-controls="catalog-filter-dialog"
            className="flex min-h-11 items-center justify-center gap-2 border border-black px-3 text-sm font-semibold lg:hidden"
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            {t('filters')}
            {activeCount > 0 && (
              <span className="rounded-full bg-black px-2 text-xs text-white">
                {activeCount}
              </span>
            )}
          </button>
          <label className="text-xs font-semibold">
            <span className="sr-only">{t('sort')}</span>
            <select
              aria-label={t('sort')}
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as CatalogSort })}
              className={fieldClass}
            >
              {(
                [
                  'featured',
                  'newest',
                  'price-asc',
                  'price-desc',
                  'name',
                ] as const
              ).map((s) => (
                <option key={s} value={s}>
                  {t(s)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!!chips.length && (
          <div className="mb-5 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                type="button"
                key={chip.key}
                onClick={chip.clear}
                aria-label={t('removeFilter', { filter: chip.label })}
                className="flex min-h-10 items-center gap-2 border border-gray-200 bg-[#f5f4f1] px-3 text-xs hover:border-black"
              >
                {chip.label}
                <X size={12} aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              onClick={reset}
              className="min-h-10 px-2 text-xs font-semibold underline underline-offset-4"
            >
              {t('reset')}
            </button>
          </div>
        )}
        <div className="grid gap-8 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-9">
          <aside className="hidden lg:block" aria-label={t('filters')}>
            {filterPanel('desktop')}
          </aside>
          <section aria-label={t('collection')} className="min-w-0">
            <p
              role="status"
              aria-live="polite"
              className="mb-5 text-xs text-gray-500"
            >
              {loading ? t('loading') : t('results', { count: tiles.length })}
              {!loading &&
                tiles.length !== filtered.length &&
                ` · ${t('models', { count: filtered.length })}`}
            </p>
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
                <h2 className="font-display text-2xl uppercase">
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
              <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-5 sm:gap-y-7 xl:grid-cols-3">
                {tiles.map((tile, index) => (
                  <CatalogProductCard
                    key={tile.tileKey}
                    tile={tile}
                    priority={index < 3}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
        <div className="mt-12 border-t border-gray-200 pt-8">
          <RecentlyViewed />
        </div>
      </div>
      <dialog
        id="catalog-filter-dialog"
        ref={dialog}
        onClose={() => setMobileOpen(false)}
        aria-labelledby="catalog-filter-title"
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-[min(100%,420px)] max-w-none flex-col border-0 border-l border-gray-200 bg-white p-0 shadow-xl backdrop:bg-black/50 open:flex"
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2
            id="catalog-filter-title"
            className="font-display text-2xl uppercase"
          >
            {t('filters')}
          </h2>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label={t('close')}
            className="flex min-h-11 min-w-11 items-center justify-center"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          {filterPanel('mobile')}
        </div>
        <footer className="border-t border-gray-200 p-5">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="min-h-12 w-full bg-black px-4 py-3 text-sm font-semibold text-white"
          >
            {t('viewResults', { count: tiles.length })}
          </button>
        </footer>
      </dialog>
    </div>
  )
}
