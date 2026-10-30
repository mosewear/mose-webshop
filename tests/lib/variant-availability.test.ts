import { expect, it } from 'vitest'
import { availableVariant, isMadeToOrderAvailable, variantQuantityLimit } from '@/lib/variant-availability'
it('represents fresh supplier orderability independently from zero physical stock and fails closed when stale', () => {
  const now = Date.now()
  const variant = { is_available: true, stock_quantity: 0, presale_stock_quantity: 0, fulfillment_mode: 'made_to_order' as const,
    supplier_orderable: true, supplier_checked_at: new Date(now).toISOString() }
  expect(availableVariant(variant, now)).toBe(true)
  expect(variant.stock_quantity).toBe(0)
  expect(variantQuantityLimit(variant, now)).toBe(10)
  expect(isMadeToOrderAvailable(variant, now + 900001)).toBe(false)
  expect(variantQuantityLimit(variant, now + 900001)).toBe(0)
  expect(availableVariant({ ...variant, supplier_orderable: false }, now)).toBe(false)
  expect(availableVariant({ ...variant, fulfillment_mode: 'local_stock' }, now)).toBe(false)
})
