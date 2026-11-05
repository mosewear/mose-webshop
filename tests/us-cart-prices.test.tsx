import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
const mock = vi.hoisted(() => ({ isUs: true, state: 'ready', prices: { a: 91, b: 57 } as Record<string, number> }))
vi.mock('@/hooks/useMoseUsPrices', () => ({ useMoseUsPrices: () => ({ isUs: mock.isUs, state: mock.state, price: (id: string) => mock.prices[id], amount: (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) }) }))
import { useMoseCartPrices } from '@/hooks/useMoseCartPrices'
const items = [{ variantId: 'a', price: 79, quantity: 2 }, { variantId: 'b', price: 49, quantity: 1 }]
beforeEach(() => { mock.isUs = true; mock.state = 'ready'; mock.prices = { a: 91, b: 57 } })
afterEach(cleanup)
describe('cart market display', () => {
  it('uses Shopify USD for every quantity and subtotal without changing EUR cart values', () => {
    const { result } = renderHook(() => useMoseCartPrices(items, 'en'))
    expect(result.current.lineLabel(items[0])).toBe('$182.00')
    expect(result.current.subtotalLabel).toBe('$239.00')
    expect(items[0].price).toBe(79)
  })
  it('does not show a partial USD subtotal when a line has no quote', () => {
    mock.prices = { a: 91 }; mock.state = 'loading'
    const { result } = renderHook(() => useMoseCartPrices(items, 'en'))
    expect(result.current.subtotalLabel).toBe('Checking USD price…')
    expect(result.current.lineLabel(items[1])).not.toContain('€')
  })
  it('preserves EUR prices for Netherlands and Belgium', () => {
    mock.isUs = false
    const { result } = renderHook(() => useMoseCartPrices(items, 'nl'))
    expect(result.current.subtotalLabel).toBe('€207,00')
    expect(result.current.lineLabel(items[0])).toBe('€158,00')
  })
  it('does not count EUR gift cards as USD merchandise', () => {
    const { result } = renderHook(() => useMoseCartPrices([{ ...items[0], isGiftCard: true }], 'en'))
    expect(result.current.subtotalLabel).toBe('USD price unavailable')
  })
})
