import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { useMoseUsPrices } from '@/hooks/useMoseUsPrices'

const localeState = vi.hoisted(() => ({ current: 'nl' }))
vi.mock('next-intl', () => ({ useLocale: () => localeState.current }))

beforeEach(() => {
  localeState.current = 'nl'
  vi.stubEnv('NEXT_PUBLIC_MOSE_US_MARKET_ENABLED', 'true')
  document.cookie = 'mose-country=US; path=/'
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({
      country: 'US', currency: 'USD',
      lines: [{ variantId: 'v1', unitAmount: '89.00' }],
    }),
  })))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  document.cookie = 'mose-country=; path=/; max-age=0'
})

describe('MOSE storefront currency by URL locale', () => {
  it('shows no USD on Dutch product pages even when US cookie persists', () => {
    const { result } = renderHook(() => useMoseUsPrices(['v1']))
    expect(result.current.isUs).toBe(false)
    expect(result.current.price('v1')).toBeUndefined()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('uses Shopify-confirmed USD on the English US storefront', async () => {
    localeState.current = 'en'
    const { result } = renderHook(() => useMoseUsPrices(['v1']))
    await waitFor(() => expect(result.current.price('v1')).toBe(89))
    expect(result.current.isUs).toBe(true)
    expect(result.current.amount(89)).toBe('$89.00')
  })

  it('immediately hides USD when switching from English to Dutch client-side', async () => {
    localeState.current = 'en'
    const { result, rerender } = renderHook(() => useMoseUsPrices(['v1']))
    await waitFor(() => expect(result.current.price('v1')).toBe(89))
    localeState.current = 'nl'
    rerender()
    expect(result.current.isUs).toBe(false)
    expect(result.current.price('v1')).toBeUndefined()
  })
})
