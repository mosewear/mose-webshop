'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useReportWebVitals } from 'next/web-vitals'
import { trackEvent as sendEvent } from '@/lib/analytics'
import { magMeten } from '@/lib/meting-uitsluiten'
import { catalogFilterParams, productPriceRange, type CatalogFilters, type CatalogProduct } from '@/lib/catalog-filters'
import type { ShopTile } from '@/lib/product-display'

type Tile = ShopTile<CatalogProduct>

function trackEvent(input: { event_name: string; properties: Record<string, unknown> }) {
  // Search remains in the shareable URL, but optional catalogue telemetry does
  // not copy the raw query to stored event properties or the event page URL.
  return sendEvent({ ...input, page_url: window.location.origin + window.location.pathname })
}

/** Optional catalogue measurement follows the existing all-cookies preference. */
export function catalogTrackingAllowed() {
  try {
    return magMeten().mag && window.localStorage.getItem('mose_cookie_consent') === 'all'
  } catch {
    return false
  }
}

/** Explicit actions complement existing PDP/cart events; no raw search terms. */
export function useCatalogTracking({ tiles, filters, locale }: {
  tiles: Tile[]
  filters: CatalogFilters
  locale: string
}) {
  const reportedVitals = useRef(new Map<string, number>())
  useReportWebVitals(useCallback((metric) => {
    if (!catalogTrackingAllowed() || !['LCP', 'INP', 'CLS'].includes(metric.name)) return
    const navigation = performance.getEntriesByType('navigation')[0]
    if (navigation && !new URL(navigation.name).pathname.match(/\/(nl|en)\/shop\/?$/)) return
    if (reportedVitals.current.get(metric.name) === metric.value) return
    reportedVitals.current.set(metric.name, metric.value)
    void trackEvent({ event_name: 'catalog_web_vital', properties: {
      metric_name: metric.name,
      metric_id: metric.id,
      value: metric.value,
      rating: metric.rating,
      navigation_type: metric.navigationType,
      locale,
      // Keep the metric ID so reporting can retain the latest value per page load.
      page_type: 'shop',
    } })
  }, [locale]))
  const context = catalogFilterParams(filters).toString()
  const [consentRevision, setConsentRevision] = useState(0)
  const lastResults = useRef<string | null>(null)
  const lastSearch = useRef<string | null>(null)
  const seen = useRef(new Set<string>())
  const latest = useRef({ tiles, filters })
  useEffect(() => { latest.current = { tiles, filters } }, [tiles, filters])

  useEffect(() => {
    const enabled = () => setConsentRevision((n) => n + 1)
    window.addEventListener('mose-tracking-enabled', enabled)
    return () => window.removeEventListener('mose-tracking-enabled', enabled)
  }, [])

  useEffect(() => {
    // Wait until typing settles, rather than reporting each intermediate result.
    const timer = window.setTimeout(() => {
      if (!catalogTrackingAllowed()) return
      const current = latest.current
      const signature = `${locale}:${context}:${current.tiles.map((t) => t.product.id).join(',')}`
      if (signature === lastResults.current) return
      const properties = {
        locale,
        result_count: current.tiles.length,
        category: current.filters.category,
        sizes: current.filters.sizes,
        colors: current.filters.colors,
        stock_only: current.filters.stock,
        min_price: current.filters.min,
        max_price: current.filters.max,
        sort: current.filters.sort,
        query_length: current.filters.q.trim().length,
      }
      void trackEvent({ event_name: lastResults.current === null ? 'catalog_results' : 'catalog_filter_change', properties })
      lastResults.current = signature
      const search = current.filters.q.trim()
      if (search && search !== lastSearch.current) {
        void trackEvent({ event_name: 'catalog_search_results', properties })
      }
      lastSearch.current = search
    }, 650)
    return () => window.clearTimeout(timer)
  }, [context, locale, tiles, consentRevision])

  useEffect(() => {
    let observer: IntersectionObserver | undefined
    let active = true
    // The visible result set must settle first; typing must not emit one set
    // of impressions for every keystroke or exhaust the shared ingest budget.
    const timer = window.setTimeout(() => {
      if (!catalogTrackingAllowed() || typeof IntersectionObserver === 'undefined') return
      observer = new IntersectionObserver((entries) => {
        if (!active) return
        const items: { product_id: string; color: string | null; position: number }[] = []
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.5 || !catalogTrackingAllowed()) continue
          const index = Number((entry.target as HTMLElement).dataset.catalogIndex)
          const element = entry.target as HTMLElement
          const tile = element.dataset.catalogProductId
            ? latest.current.tiles.find(t => t.product.id === element.dataset.catalogProductId)
            : latest.current.tiles[index]
          if (!tile) continue
          const key = `${locale}:${context}:${tile.product.id}`
          if (!seen.current.has(key)) {
            seen.current.add(key)
            items.push({ product_id: tile.product.id, color: element.dataset.catalogColor === undefined ? tile.color : element.dataset.catalogColor || null, position: index + 1 })
          }
          observer?.unobserve(entry.target)
        }
        // One request per observer delivery, not one request per visible card.
        if (items.length) void trackEvent({ event_name: 'catalog_product_impression', properties: {
          items, locale, list_id: 'shop', category: latest.current.filters.category,
        } })
      }, { threshold: 0.5 })
      document.querySelectorAll('[data-catalog-index]').forEach((node) => observer?.observe(node))
    }, 650)
    return () => { active = false; window.clearTimeout(timer); observer?.disconnect() }
  }, [context, locale, tiles, consentRevision])

  const trackSelect = useCallback((tile: Tile, index: number) => {
    if (!catalogTrackingAllowed()) return
    void trackEvent({ event_name: 'catalog_product_click', properties: {
      product_id: tile.product.id, color: tile.color, position: index + 1,
      price: productPriceRange(tile.product, tile.color, latest.current.filters).min,
      currency: 'EUR', locale, list_id: 'shop',
      category: latest.current.filters.category,
    } })
  }, [locale])

  return { trackSelect }
}
