import { beforeEach, describe, expect, it, vi } from 'vitest'
import { availableVariant, isMadeToOrderAvailable, offerAvailability, variantQuantityLimit } from '@/lib/variant-availability'
vi.hoisted(() => {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } })
})
import { cartItemQuantityLimit, useCart, type CartItem } from '@/store/cart'
const now = Date.parse('2026-10-30T12:00:00Z')
const made = { fulfillment_mode: 'made_to_order' as const, supplier_orderable: true, supplier_checked_at: '2026-10-30T11:59:00Z', is_available: true, stock_quantity: 0, presale_enabled: false, presale_stock_quantity: 0 }
const item: CartItem = { productId: 'p', variantId: 'v', slug: 'barrel', name: 'Barrel', size: 'M', color: 'Black', colorHex: '#000', quantity: 1, price: 79, image: '/p.webp', stock: 0, sku: 'sku', isMadeToOrder: true }
beforeEach(() => useCart.setState({ items: [] }))
describe('made-to-order availability and cart quantity', () => {
  it('requires released fresh supplier evidence, never invented physical units', () => {
    expect(isMadeToOrderAvailable(made, now)).toBe(true)
    expect(availableVariant(made, now)).toBe(true)
    expect(variantQuantityLimit(made, now)).toBe(10)
    expect(made.stock_quantity).toBe(0)
    for (const variant of [{ ...made, supplier_orderable: false }, { ...made, is_available: false }, { ...made, supplier_checked_at: '2026-10-30T11:40:00Z' }, { ...made, supplier_checked_at: '2026-10-30T13:00:00Z' }]) {
      expect(availableVariant(variant, now)).toBe(false)
      expect(variantQuantityLimit(variant, now)).toBe(0)
    }
    expect(availableVariant({ is_available: true, stock_quantity: 0, presale_enabled: false, presale_stock_quantity: 20 }, now)).toBe(false)
  })
  it('uses the dedicated MadeToOrder schema without calling zero-stock goods InStock', () => {
    expect(offerAvailability([made], false, now)).toBe('https://schema.org/MadeToOrder')
    expect(offerAvailability([{ ...made, supplier_orderable: false }], false, now)).toBe('https://schema.org/OutOfStock')
    expect(offerAvailability([{ is_available: true, stock_quantity: 2 }], false, now)).toBe('https://schema.org/InStock')
    expect(offerAvailability([{ is_available: true, stock_quantity: 0, presale_enabled: true, presale_stock_quantity: 2 }], false, now)).toBe('https://schema.org/PreOrder')
  })
  it('adds a supplier-backed zero-stock item and caps first add, repeat add and updates at 10', () => {
    useCart.getState().addItem({ ...item, quantity: 20 })
    expect(useCart.getState().items[0]).toMatchObject({ quantity: 10, stock: 0, isMadeToOrder: true })
    useCart.getState().updateQuantity('v', 3)
    useCart.getState().addItem({ ...item, quantity: 9 })
    expect(useCart.getState().items[0].quantity).toBe(10)
    useCart.getState().updateQuantity('v', 100)
    expect(useCart.getState().items[0].quantity).toBe(10)
    useCart.getState().setItems([{ ...item, quantity: 50 }])
    expect(useCart.getState().items[0].quantity).toBe(10)
  })
  it('preserves actual local/presale caps and never treats zero physical stock as unlimited', () => {
    expect(cartItemQuantityLimit({ stock: 0 })).toBe(0)
    expect(cartItemQuantityLimit({ stock: 2 })).toBe(2)
    expect(cartItemQuantityLimit({ stock: 0, isPresale: true, presaleStock: 4 })).toBe(4)
    expect(cartItemQuantityLimit({ stock: 0, isGiftCard: true })).toBeNull()
    useCart.getState().addItem({ ...item, isMadeToOrder: false, stock: 2, quantity: 5 })
    expect(useCart.getState().items[0].quantity).toBe(2)
  })
})
