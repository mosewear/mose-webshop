// @vitest-environment node
import { beforeEach, expect, it } from 'vitest'
import { authorizeLegacyCatalog } from '@/lib/legacy-checkout-catalog'
const product = { id: 'p', name: 'Authoritative hoodie', is_active: true, status: 'active', is_gift_card: false, base_price: 79, sale_price: null }
const variant = { id: 'v', product_id: 'p', size: 'XL', color: 'Black', sku: 'real-sku', is_available: true, price_adjustment: 10 }
const line = { product_id: 'p', variant_id: 'v', quantity: 1, unit_price: 89, price_at_purchase: 89, product_name: 'Spoofed', is_gift_card: false }
const mock = { products: [product] as Record<string, unknown>[], variants: [variant] as Record<string, unknown>[] }
const db = { from: (table: string) => ({ select: () => ({ in: async () => ({ data: table === 'products' ? mock.products : mock.variants, error: null }) }) }) }
beforeEach(() => { mock.products = [{ ...product }]; mock.variants = [{ ...variant }] })
it('uses the actual parent, price, sku, size and colour rather than client identity', async () => {
  const [checked] = await authorizeLegacyCatalog(db as never, [line])
  expect(checked).toMatchObject({ product_name: product.name, sku: variant.sku, size: 'XL', color: 'Black', unit_price: 89, subtotal: 89 })
})
it.each([
  ['tampered price', { ...line, unit_price: 0.01 }],
  ['tampered purchase price', { ...line, price_at_purchase: 0.01 }],
  ['gift-card spoof', { ...line, is_gift_card: true }],
  ['negative quantity', { ...line, quantity: -1 }],
  ['fractional quantity', { ...line, quantity: 1.5 }],
])('rejects %s before side effects', async (_label, bad) => {
  await expect(authorizeLegacyCatalog(db as never, [bad])).rejects.toThrow()
})
it('rejects a variant belonging to a different product and a newly drafted product', async () => {
  mock.variants[0].product_id = 'other'
  await expect(authorizeLegacyCatalog(db as never, [line])).rejects.toThrow('VARIANT_UNAVAILABLE')
  mock.variants = [{ ...variant }]
  mock.products[0].status = 'draft'
  await expect(authorizeLegacyCatalog(db as never, [line])).rejects.toThrow('PRODUCT_UNAVAILABLE')
})
it('validates custom digital value against the current product bounds without stock fiction', async () => {
  mock.products = [{ ...product, is_gift_card: true, allows_custom_amount: true, gift_card_min_amount: 20, gift_card_max_amount: 1000 }]
  const gift = { ...line, variant_id: null, is_gift_card: true, unit_price: 50, price_at_purchase: 50, gift_card_amount: 50 }
  expect((await authorizeLegacyCatalog(db as never, [gift]))[0]).toMatchObject({ unit_price: 50, is_gift_card: true, variant_id: null })
  await expect(authorizeLegacyCatalog(db as never, [{ ...gift, unit_price: 10, price_at_purchase: 10, gift_card_amount: 10 }])).rejects.toThrow('GIFT_AMOUNT_UNAVAILABLE')
})
