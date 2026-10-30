'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  catalogFilterParams,
  parseCatalogFilters,
  type CatalogFilters,
} from '@/lib/catalog-filters'
export function useCatalogFilters(initial: CatalogFilters) {
  const [filters, setFilters] = useState(initial),
    current = useRef(initial),
    typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sync = useCallback(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current)
    const next = parseCatalogFilters(
      new URLSearchParams(window.location.search),
    )
    current.current = next
    setFilters(next)
  }, [])
  // The server supplies the initial URL state, so hydration needs no corrective render.
  useEffect(() => {
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      if (typingTimer.current) clearTimeout(typingTimer.current)
    }
  }, [sync])
  const update = useCallback(
    (
      patch: Partial<CatalogFilters>,
      mode: 'push' | 'replace' | 'typing' = 'push',
    ) => {
      if (typingTimer.current && mode === 'push') {
        const p = catalogFilterParams(
          current.current,
          new URLSearchParams(window.location.search),
        )
        const q = p.toString()
        window.history.replaceState(
          null,
          '',
          window.location.pathname + (q ? '?' + q : '') + window.location.hash,
        )
      }
      const next = { ...current.current, ...patch }
      current.current = next
      setFilters(next)
      if (typingTimer.current) clearTimeout(typingTimer.current)
      typingTimer.current = null
      const write = () => {
        typingTimer.current = null
        const p = catalogFilterParams(
          current.current,
          new URLSearchParams(window.location.search),
        )
        const query = p.toString()
        const url =
          window.location.pathname +
          (query ? '?' + query : '') +
          window.location.hash
        if (
          url !==
          window.location.pathname +
            window.location.search +
            window.location.hash
        )
          window.history[mode === 'push' ? 'pushState' : 'replaceState'](
            null,
            '',
            url,
          )
      }
      if (mode === 'typing') typingTimer.current = setTimeout(write, 350)
      else write()
    },
    [],
  )
  return { filters, update }
}
