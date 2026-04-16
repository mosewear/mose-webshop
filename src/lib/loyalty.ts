export const LOYALTY_CONFIG = {
  pointsPerEuro: 1,
  redemptionRate: 5,
  redemptionMinPoints: 100,
  tiers: {
    bronze: { min: 0, max: 499, name: 'Bronze', benefits: [] as string[] },
    silver: { min: 500, max: 999, name: 'Silver', benefits: ['free_shipping'] },
    gold: { min: 1000, max: Infinity, name: 'Gold', benefits: ['free_shipping', 'discount_5_percent'] },
  },
} as const

export type LoyaltyTier = 'bronze' | 'silver' | 'gold'

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
