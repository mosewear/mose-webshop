export type LoyaltyTier = 'bronze' | 'silver' | 'gold'

export type TierBenefit = 'discount_5_percent' | 'discount_10_percent'

interface TierConfig {
  min: number
  max: number
  name: string
  discountPercent: number
  benefits: TierBenefit[]
}

export const LOYALTY_CONFIG: {
  pointsPerEuro: number
  redemptionRate: number
  redemptionMinPoints: number
  tiers: Record<LoyaltyTier, TierConfig>
} = {
  pointsPerEuro: 1,
  redemptionRate: 5,
  redemptionMinPoints: 100,
  tiers: {
    bronze: {
      min: 0,
      max: 499,
      name: 'Bronze',
      discountPercent: 0,
      benefits: [],
    },
    silver: {
      min: 500,
      max: 999,
      name: 'Silver',
      discountPercent: 5,
      benefits: ['discount_5_percent'],
    },
    gold: {
      min: 1000,
      max: Infinity,
      name: 'Gold',
      discountPercent: 10,
      benefits: ['discount_10_percent'],
    },
  },
}

export function calculateTier(lifetimePoints: number): LoyaltyTier {
  if (lifetimePoints >= LOYALTY_CONFIG.tiers.gold.min) return 'gold'
  if (lifetimePoints >= LOYALTY_CONFIG.tiers.silver.min) return 'silver'
  return 'bronze'
}

export function calculatePointsForOrder(orderTotal: number): number {
  return Math.floor(orderTotal * LOYALTY_CONFIG.pointsPerEuro)
}

export function calculateRedemptionValue(points: number): number {
  const redeemableUnits = Math.floor(points / LOYALTY_CONFIG.redemptionMinPoints)
  return redeemableUnits * LOYALTY_CONFIG.redemptionRate
}

export function getTierDiscountPercent(tier: LoyaltyTier): number {
  return LOYALTY_CONFIG.tiers[tier].discountPercent
}

/**
 * Calculate the euro amount of the tier-based discount for a given eligible
 * subtotal. Rounded to 2 decimals. Returns 0 when amount is non-positive or
 * the tier has no discount.
 */
export function calculateTierDiscount(tier: LoyaltyTier, eligibleSubtotal: number): number {
  const pct = getTierDiscountPercent(tier)
  if (pct <= 0 || eligibleSubtotal <= 0) return 0
  return Math.round(eligibleSubtotal * pct) / 100
}

export function getProgressToNextTier(lifetimePoints: number) {
  const currentTier = calculateTier(lifetimePoints)

  if (currentTier === 'gold') {
    return {
      currentTier,
      nextTier: null as LoyaltyTier | null,
      progress: 100,
      pointsNeeded: 0,
    }
  }

  const nextTier: LoyaltyTier = currentTier === 'bronze' ? 'silver' : 'gold'
  const nextTierConfig = LOYALTY_CONFIG.tiers[nextTier]
  const currentTierConfig = LOYALTY_CONFIG.tiers[currentTier]

  const pointsIntoCurrentTier = lifetimePoints - currentTierConfig.min
  const tierRange = nextTierConfig.min - currentTierConfig.min
  const progress = Math.min(100, Math.round((pointsIntoCurrentTier / tierRange) * 100))
  const pointsNeeded = nextTierConfig.min - lifetimePoints

  return {
    currentTier,
    nextTier,
    progress,
    pointsNeeded,
  }
}
