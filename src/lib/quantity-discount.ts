export interface QuantityDiscountTier {
  id?: string
  product_id: string
  min_quantity: number
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  is_active: boolean
}

export interface DiscountResult {
  discountPerItem: number
  tier: QuantityDiscountTier | null
  originalPrice: number
  finalPrice: number
}

/**
 * Find the applicable tier for a given quantity.
 * Returns the tier with the highest min_quantity that the quantity meets.
 */
export function findApplicableTier(
  tiers: QuantityDiscountTier[],
  quantity: number
): QuantityDiscountTier | null {
  const activeTiers = tiers
    .filter(t => t.is_active && quantity >= t.min_quantity)
    .sort((a, b) => b.min_quantity - a.min_quantity)
  return activeTiers[0] || null
}

/**
 * Calculate the per-item discount for a product based on quantity and tiers.
 * Returns the discount amount per item and the applicable tier.
 */
export function calculateQuantityDiscount(
  originalPrice: number,
  quantity: number,
  tiers: QuantityDiscountTier[]
): DiscountResult {
  const tier = findApplicableTier(tiers, quantity)

  if (!tier) {
    return { discountPerItem: 0, tier: null, originalPrice, finalPrice: originalPrice }
  }

  let discountPerItem: number
  if (tier.discount_type === 'percentage') {
    discountPerItem = Math.round(originalPrice * (tier.discount_value / 100) * 100) / 100
  } else {
    discountPerItem = Math.min(tier.discount_value, originalPrice)
  }

  return {
    discountPerItem,
    tier,
    originalPrice,
    finalPrice: Math.round((originalPrice - discountPerItem) * 100) / 100,
  }
}

export interface ReturnRefundInput {
  productId: string
  originalPrice: number
  originalTotalQty: number
  alreadyReturnedQty: number
  returningNowQty: number
  totalPaidForProduct: number
  alreadyRefundedForProduct: number
  tiers: QuantityDiscountTier[]
}

export interface ReturnRefundResult {
  refundAmount: number
  oldTierLabel: string | null
  newTierLabel: string | null
  discountLapsed: boolean
  remainingQty: number
  newPricePerItem: number
}

function tierLabel(tier: QuantityDiscountTier | null): string | null {
  if (!tier) return null
  if (tier.discount_type === 'percentage') return `${tier.discount_value}% korting (${tier.min_quantity}+ stuks)`
  return `€${tier.discount_value.toFixed(2)} korting (${tier.min_quantity}+ stuks)`
}

/**
 * Calculate the correct refund amount when returning items,
 * accounting for quantity discount tier changes.
 */
export function calculateReturnRefundWithDiscount(input: ReturnRefundInput): ReturnRefundResult {
  const {
    originalPrice,
    originalTotalQty,
    alreadyReturnedQty,
    returningNowQty,
    totalPaidForProduct,
    alreadyRefundedForProduct,
    tiers,
  } = input

  const currentQty = originalTotalQty - alreadyReturnedQty
  const remainingQty = currentQty - returningNowQty

  const currentTier = findApplicableTier(tiers, currentQty)
  const newTier = findApplicableTier(tiers, remainingQty)

  let newPricePerItem: number
  if (newTier) {
    if (newTier.discount_type === 'percentage') {
      newPricePerItem = Math.round(originalPrice * (1 - newTier.discount_value / 100) * 100) / 100
    } else {
      newPricePerItem = Math.round((originalPrice - Math.min(newTier.discount_value, originalPrice)) * 100) / 100
    }
  } else {
    newPricePerItem = originalPrice
  }

  const newTotalForRemaining = Math.round(remainingQty * newPricePerItem * 100) / 100
  const effectivePaid = Math.round((totalPaidForProduct - alreadyRefundedForProduct) * 100) / 100
  const refundAmount = Math.round((effectivePaid - newTotalForRemaining) * 100) / 100

  const discountLapsed = (currentTier?.min_quantity || 0) > (newTier?.min_quantity || 0)
    || (currentTier !== null && newTier === null)

  return {
    refundAmount: Math.max(0, refundAmount),
    oldTierLabel: tierLabel(currentTier),
    newTierLabel: tierLabel(newTier),
    discountLapsed,
    remainingQty,
    newPricePerItem,
  }
}
