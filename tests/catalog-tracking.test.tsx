import { StrictMode } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyCatalogFilters, type CatalogProduct } from '@/lib/catalog-filters'
import type { ShopTile } from '@/lib/product-display'

const mock = vi.hoisted(() => ({ track: vi.fn(), allowed: true, vital: null as null | ((m: unknown) => void), observers: [] as { callback: IntersectionObserverCallback; observe: ReturnType<typeof vi.fn> }[] }))
vi.mock('@/lib/analytics', () => ({ trackEvent: mock.track }))
vi.mock('@/lib/meting-uitsluiten', () => ({ magMeten: () => ({ mag: mock.allowed }) }))
vi.mock('next/web-vitals', () => ({ useReportWebVitals: (callback: (m: unknown) => void) => { mock.vital = callback } }))
import { useCatalogTracking } from '@/components/shop/useCatalogTracking'
const product: CatalogProduct = { id: 'hoodie', slug: 'hoodie', name: 'Hoodie', base_price: 79, sale_price: null, category_id: null, created_at: '2026-10-30', display_order: 1 }
const tile: ShopTile<CatalogProduct> = { tileKey: product.id, product, color: 'Zwart', color_hex: '#000' }
const tiles = [tile]
beforeEach(() => {
  vi.useFakeTimers()
  mock.track.mockReset()
  mock.allowed = true
  mock.observers = []
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), clear: () => storage.clear() })
  window.localStorage.setItem('mose_cookie_consent', 'all')
  vi.stubGlobal('IntersectionObserver', class {
    observe = vi.fn()
    disconnect = vi.fn()
    unobserve = vi.fn()
    constructor(callback: IntersectionObserverCallback) { mock.observers.push({ callback, observe: this.observe }) }
  })
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); document.body.innerHTML = '' })
const events = (name: string) => mock.track.mock.calls.filter(([arg]) => arg.event_name === name)

describe('optional catalogue measurements', () => {
  it('reports final search results once under StrictMode without raw query text', () => {
    const { rerender } = renderHook(({ q }) => useCatalogTracking({ tiles, filters: { ...emptyCatalogFilters, q }, locale: 'nl' }), { initialProps: { q: '' }, wrapper: StrictMode })
    act(() => vi.advanceTimersByTime(650))
    rerender({ q: 'hoo' })
    act(() => vi.advanceTimersByTime(300))
    rerender({ q: 'hoodie' })
    act(() => vi.advanceTimersByTime(650))
    expect(events('catalog_results')).toHaveLength(1)
    expect(events('catalog_filter_change')).toHaveLength(1)
    expect(events('catalog_search_results')).toHaveLength(1)
    expect(events('catalog_search_results')[0][0].properties).toMatchObject({ query_length: 6, result_count: 1 })
    expect(JSON.stringify(events('catalog_search_results'))).not.toContain('hoodie')
  })
  it('does not track necessary-only consent or excluded sessions, and starts after consent', () => {
    window.localStorage.setItem('mose_cookie_consent', 'necessary')
    const { result } = renderHook(() => useCatalogTracking({ tiles, filters: emptyCatalogFilters, locale: 'nl' }))
    act(() => vi.advanceTimersByTime(700))
    act(() => result.current.trackSelect(tile, 0))
    expect(mock.track).not.toHaveBeenCalled()
    act(() => {
      window.localStorage.setItem('mose_cookie_consent', 'all')
      window.dispatchEvent(new Event('mose-tracking-enabled'))
    })
    act(() => vi.advanceTimersByTime(650))
    expect(events('catalog_results')).toHaveLength(1)
    mock.allowed = false
    act(() => result.current.trackSelect(tile, 0))
    expect(events('catalog_product_click')).toHaveLength(0)
  })
  it('counts a half-visible model once and records the actual clicked colour and index', () => {
    const card = document.createElement('article')
    card.dataset.catalogIndex = '0'
    card.dataset.catalogProductId = 'hoodie'
    card.dataset.catalogColor = 'Wit'
    document.body.appendChild(card)
    const { result } = renderHook(() => useCatalogTracking({ tiles, filters: emptyCatalogFilters, locale: 'en' }))
    act(() => vi.advanceTimersByTime(650))
    const observer = mock.observers.at(-1)!
    expect(observer.observe).toHaveBeenCalledWith(card)
    const entry = { target: card, isIntersecting: true, intersectionRatio: 0.6 } as unknown as IntersectionObserverEntry
    const unobserve = vi.fn()
    act(() => {
      observer.callback([entry], { unobserve } as unknown as IntersectionObserver)
      observer.callback([entry], { unobserve } as unknown as IntersectionObserver)
      result.current.trackSelect({ ...tile, color: 'Wit' }, 0)
    })
    expect(events('catalog_product_impression')).toHaveLength(1)
    expect(events('catalog_product_impression')[0][0].properties.items).toEqual([{ product_id: 'hoodie', color: 'Wit', position: 1 }])
    expect(events('catalog_product_click')[0][0].properties).toMatchObject({ product_id: 'hoodie', color: 'Wit', position: 1, price: 79, locale: 'en' })
  })
  it('sends real vital samples with stable metric IDs for latest-value aggregation', () => {
    renderHook(() => useCatalogTracking({ tiles, filters: emptyCatalogFilters, locale: 'nl' }))
    act(() => mock.vital!({ name: 'LCP', id: 'page-id', value: 2400, rating: 'good', navigationType: 'navigate' }))
    expect(events('catalog_web_vital')[0][0].properties).toMatchObject({ metric_name: 'LCP', metric_id: 'page-id', value: 2400 })
  })
})

it('records the matching size-price variation on navigation, and ignores late observer callbacks after cleanup', () => {
  const adjustedTile = { ...tile, product: { ...product, base_price: 20, variants: [
    { color: 'Zwart', size: 'M', price_adjustment: 0, stock_quantity: 5, is_available: true },
    { color: 'Zwart', size: 'XL', price_adjustment: 30, stock_quantity: 1, is_available: true },
  ] } }
  const { result, unmount } = renderHook(() => useCatalogTracking({ tiles: [adjustedTile], filters: { ...emptyCatalogFilters, sizes: ['XL'] }, locale: 'nl' }))
  act(() => vi.advanceTimersByTime(650))
  const observer = mock.observers.at(-1)!
  act(() => result.current.trackSelect(adjustedTile, 0))
  expect(events('catalog_product_click')[0][0].properties.price).toBe(50)
  unmount()
  const card = document.createElement('article')
  card.dataset.catalogIndex = '0'
  observer.callback([{ target: card, isIntersecting: true, intersectionRatio: 1 } as unknown as IntersectionObserverEntry], {} as IntersectionObserver)
  expect(events('catalog_product_impression')).toHaveLength(0)
})
