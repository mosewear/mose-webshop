import { describe, it, expect } from 'vitest'
import {
  LOYALTY_CONFIG,
  calculateTier,
  calculatePointsForOrder,
  calculateRedemptionValue,
  calculateTierDiscount,
  getTierDiscountPercent,
  getProgressToNextTier,
} from '@/lib/loyalty'

describe('loyalty', () => {
  describe('calculateTier', () => {
    it('returns bronze for 0 points', () => {
      expect(calculateTier(0)).toBe('bronze')
    })

    it('returns bronze for points below silver threshold', () => {
      expect(calculateTier(499)).toBe('bronze')
    })

    it('returns silver at exactly 500 points', () => {
      expect(calculateTier(500)).toBe('silver')
    })

    it('returns silver for points between 500 and 999', () => {
      expect(calculateTier(750)).toBe('silver')
    })

    it('returns gold at exactly 1000 points', () => {
      expect(calculateTier(1000)).toBe('gold')
    })

    it('returns gold for very high point values', () => {
      expect(calculateTier(50000)).toBe('gold')
    })
  })

  describe('calculatePointsForOrder', () => {
    it('returns floor of order total times points per euro', () => {
      expect(calculatePointsForOrder(49.99)).toBe(49)
    })

    it('returns 0 for zero-value order', () => {
      expect(calculatePointsForOrder(0)).toBe(0)
    })

    it('handles whole number totals', () => {
      expect(calculatePointsForOrder(100)).toBe(100)
    })

    it('floors fractional points', () => {
      expect(calculatePointsForOrder(29.95)).toBe(29)
    })
  })

  describe('calculateRedemptionValue', () => {
    it('returns 0 when below minimum redeemable points', () => {
      expect(calculateRedemptionValue(99)).toBe(0)
    })

    it('returns one unit at exactly minimum points', () => {
      expect(calculateRedemptionValue(100)).toBe(LOYALTY_CONFIG.redemptionRate)
    })

    it('does not count partial units', () => {
      expect(calculateRedemptionValue(250)).toBe(LOYALTY_CONFIG.redemptionRate * 2)
    })

    it('handles large point balances', () => {
      expect(calculateRedemptionValue(1000)).toBe(LOYALTY_CONFIG.redemptionRate * 10)
    })
  })

  describe('getProgressToNextTier', () => {
    it('returns silver as next tier for bronze', () => {
      const result = getProgressToNextTier(0)
      expect(result.currentTier).toBe('bronze')
      expect(result.nextTier).toBe('silver')
      expect(result.progress).toBe(0)
      expect(result.pointsNeeded).toBe(500)
    })

    it('calculates correct progress within bronze', () => {
      const result = getProgressToNextTier(250)
      expect(result.currentTier).toBe('bronze')
      expect(result.nextTier).toBe('silver')
      expect(result.progress).toBe(50)
      expect(result.pointsNeeded).toBe(250)
    })

    it('returns gold as next tier for silver', () => {
      const result = getProgressToNextTier(500)
      expect(result.currentTier).toBe('silver')
      expect(result.nextTier).toBe('gold')
      expect(result.pointsNeeded).toBe(500)
    })

    it('returns 100% progress and no next tier for gold', () => {
      const result = getProgressToNextTier(1000)
      expect(result.currentTier).toBe('gold')
      expect(result.nextTier).toBeNull()
      expect(result.progress).toBe(100)
      expect(result.pointsNeeded).toBe(0)
    })

    it('returns 100% progress for very high gold points', () => {
      const result = getProgressToNextTier(99999)
      expect(result.progress).toBe(100)
      expect(result.pointsNeeded).toBe(0)
    })
  })

  describe('getTierDiscountPercent', () => {
    it('returns 0 for bronze', () => {
      expect(getTierDiscountPercent('bronze')).toBe(0)
    })

    it('returns 5 for silver', () => {
      expect(getTierDiscountPercent('silver')).toBe(5)
    })

    it('returns 10 for gold', () => {
      expect(getTierDiscountPercent('gold')).toBe(10)
    })
  })

  describe('calculateTierDiscount', () => {
    it('returns 0 for bronze regardless of subtotal', () => {
      expect(calculateTierDiscount('bronze', 100)).toBe(0)
    })

    it('returns 5% of subtotal for silver', () => {
      expect(calculateTierDiscount('silver', 100)).toBe(5)
    })

    it('returns 10% of subtotal for gold', () => {
      expect(calculateTierDiscount('gold', 100)).toBe(10)
    })

    it('rounds to 2 decimals', () => {
      // 5% of 33.33 = 1.6665 -> rounds to 1.67
      expect(calculateTierDiscount('silver', 33.33)).toBe(1.67)
    })

    it('returns 0 for negative subtotal', () => {
      expect(calculateTierDiscount('gold', -50)).toBe(0)
    })

    it('returns 0 for zero subtotal', () => {
      expect(calculateTierDiscount('gold', 0)).toBe(0)
    })

    it('handles large subtotals', () => {
      expect(calculateTierDiscount('gold', 1234.56)).toBeCloseTo(123.46, 2)
    })
  })

  describe('LOYALTY_CONFIG tier benefits', () => {
    it('bronze has no benefits', () => {
      expect(LOYALTY_CONFIG.tiers.bronze.benefits).toEqual([])
    })

    it('silver grants a 5% discount benefit', () => {
      expect(LOYALTY_CONFIG.tiers.silver.discountPercent).toBe(5)
      expect(LOYALTY_CONFIG.tiers.silver.benefits).toContain('discount_5_percent')
    })

    it('gold grants a 10% discount benefit', () => {
      expect(LOYALTY_CONFIG.tiers.gold.discountPercent).toBe(10)
      expect(LOYALTY_CONFIG.tiers.gold.benefits).toContain('discount_10_percent')
    })
  })
})
