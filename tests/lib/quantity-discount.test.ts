import { describe, it, expect } from 'vitest'
import {
  findApplicableTier,
  calculateQuantityDiscount,
  calculateReturnRefundWithDiscount,
  type QuantityDiscountTier,
} from '@/lib/quantity-discount'

const TIERS: QuantityDiscountTier[] = [
  { product_id: 'p1', min_quantity: 3, discount_type: 'percentage', discount_value: 10, is_active: true },
  { product_id: 'p1', min_quantity: 5, discount_type: 'percentage', discount_value: 15, is_active: true },
  { product_id: 'p1', min_quantity: 10, discount_type: 'percentage', discount_value: 20, is_active: true },
]

const FIXED_TIERS: QuantityDiscountTier[] = [
  { product_id: 'p2', min_quantity: 2, discount_type: 'fixed', discount_value: 5, is_active: true },
  { product_id: 'p2', min_quantity: 5, discount_type: 'fixed', discount_value: 10, is_active: true },
]

describe('quantity-discount', () => {
  describe('findApplicableTier', () => {
    it('returns null when quantity is below all tiers', () => {
      expect(findApplicableTier(TIERS, 1)).toBeNull()
    })

    it('returns the matching tier at exact min_quantity', () => {
      const tier = findApplicableTier(TIERS, 3)
      expect(tier?.min_quantity).toBe(3)
    })

    it('returns the highest qualifying tier', () => {
      const tier = findApplicableTier(TIERS, 7)
      expect(tier?.min_quantity).toBe(5)
    })

    it('returns the top tier when quantity exceeds all', () => {
      const tier = findApplicableTier(TIERS, 100)
      expect(tier?.min_quantity).toBe(10)
    })

    it('ignores inactive tiers', () => {
      const mixed: QuantityDiscountTier[] = [
        { product_id: 'p1', min_quantity: 2, discount_type: 'percentage', discount_value: 50, is_active: false },
        { product_id: 'p1', min_quantity: 5, discount_type: 'percentage', discount_value: 10, is_active: true },
      ]
      expect(findApplicableTier(mixed, 3)).toBeNull()
    })

    it('returns null for empty tiers array', () => {
      expect(findApplicableTier([], 10)).toBeNull()
    })
  })

  describe('calculateQuantityDiscount', () => {
    it('returns zero discount when no tier applies', () => {
      const result = calculateQuantityDiscount(50, 1, TIERS)
      expect(result.discountPerItem).toBe(0)
      expect(result.finalPrice).toBe(50)
      expect(result.tier).toBeNull()
    })

    it('calculates percentage discount correctly', () => {
      const result = calculateQuantityDiscount(100, 5, TIERS)
      expect(result.discountPerItem).toBe(15)
      expect(result.finalPrice).toBe(85)
      expect(result.tier?.min_quantity).toBe(5)
    })

    it('calculates fixed discount correctly', () => {
      const result = calculateQuantityDiscount(30, 2, FIXED_TIERS)
      expect(result.discountPerItem).toBe(5)
      expect(result.finalPrice).toBe(25)
    })

    it('caps fixed discount at original price', () => {
      const hugeTier: QuantityDiscountTier[] = [
        { product_id: 'p3', min_quantity: 1, discount_type: 'fixed', discount_value: 999, is_active: true },
      ]
      const result = calculateQuantityDiscount(10, 1, hugeTier)
      expect(result.discountPerItem).toBe(10)
      expect(result.finalPrice).toBe(0)
    })

    it('handles rounding for percentage discounts', () => {
      const result = calculateQuantityDiscount(29.99, 3, TIERS)
      expect(result.discountPerItem).toBe(3)
      expect(result.finalPrice).toBe(26.99)
    })
  })

  describe('calculateReturnRefundWithDiscount', () => {
    it('refunds at full price when no tiers apply', () => {
      const result = calculateReturnRefundWithDiscount({
        productId: 'p1',
        originalPrice: 50,
        originalTotalQty: 2,
        alreadyReturnedQty: 0,
        returningNowQty: 1,
        totalPaidForProduct: 100,
        alreadyRefundedForProduct: 0,
        tiers: [],
      })
      expect(result.refundAmount).toBe(50)
      expect(result.remainingQty).toBe(1)
    })

    it('detects tier lapse on return', () => {
      const result = calculateReturnRefundWithDiscount({
        productId: 'p1',
        originalPrice: 100,
        originalTotalQty: 5,
        alreadyReturnedQty: 0,
        returningNowQty: 3,
        totalPaidForProduct: 425,
        alreadyRefundedForProduct: 0,
        tiers: TIERS,
      })
      expect(result.discountLapsed).toBe(true)
      expect(result.remainingQty).toBe(2)
    })

    it('never returns a negative refund', () => {
      const result = calculateReturnRefundWithDiscount({
        productId: 'p1',
        originalPrice: 100,
        originalTotalQty: 10,
        alreadyReturnedQty: 8,
        returningNowQty: 1,
        totalPaidForProduct: 800,
        alreadyRefundedForProduct: 799,
        tiers: TIERS,
      })
      expect(result.refundAmount).toBeGreaterThanOrEqual(0)
    })
  })
})
