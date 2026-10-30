import { act, renderHook, cleanup } from '@testing-library/react'
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { useCatalogFilters } from '@/components/shop/useCatalogFilters'
import { emptyCatalogFilters } from '@/lib/catalog-filters'
beforeEach(() => {
  vi.useFakeTimers()
  window.history.replaceState(null, '', '/nl/shop?utm_source=email')
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
it('restores all facets from browser navigation and cancels a stale pending search write', () => {
  const { result } = renderHook(() => useCatalogFilters(emptyCatalogFilters))
  act(() => result.current.update({ q: 'hoodie' }, 'typing'))
  act(() => {
    window.history.replaceState(
      null,
      '',
      '/nl/shop?category=broeken&size=L&color=blue&min=60&max=90&stock=1&sort=price-desc',
    )
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  act(() => vi.advanceTimersByTime(500))
  expect(result.current.filters).toMatchObject({
    category: 'broeken',
    q: '',
    sizes: ['L'],
    colors: ['blue'],
    min: 60,
    max: 90,
    stock: true,
    sort: 'price-desc',
  })
  expect(window.location.search).not.toContain('hoodie')
})
it('commits typing to the previous history entry before pushing a discrete category choice', () => {
  const { result } = renderHook(() => useCatalogFilters(emptyCatalogFilters))
  const replace = vi.spyOn(window.history, 'replaceState'),
    push = vi.spyOn(window.history, 'pushState')
  act(() => result.current.update({ q: 'hoodie' }, 'typing'))
  act(() => result.current.update({ category: 'hoodies' }))
  expect(String(replace.mock.calls.at(-1)?.[2])).toContain('q=hoodie')
  expect(String(replace.mock.calls.at(-1)?.[2])).not.toContain(
    'category=hoodies',
  )
  expect(String(push.mock.calls.at(-1)?.[2])).toContain('category=hoodies')
  expect(window.location.search).toContain('utm_source=email')
  replace.mockRestore()
  push.mockRestore()
})
