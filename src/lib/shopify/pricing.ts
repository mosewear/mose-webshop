/** Scenario model, not an assertion of actual supplier quotes or net profit. All values in EUR. */
export interface PricingScenario {
  retailInclVat: number
  customerShippingInclVat: number
  vatRate: number
  landedProductCost: number
  supplierShippingCost: number
  paymentRate: number
  paymentFixed: number
  returnReserveRate: number
  overheadPerOrder: number
  acquisitionCost: number
  discountRate: number
}
export function contribution(s: PricingScenario) {
  for (const value of Object.values(s)) if (!Number.isFinite(value) || value < 0) throw new Error('INVALID_SCENARIO')
  if ([s.paymentRate, s.returnReserveRate, s.discountRate].some(rate => rate >= 1)) throw new Error('INVALID_RATE')
  const collected = s.retailInclVat * (1 - s.discountRate) + s.customerShippingInclVat
  const revenueExVat = collected / (1 + s.vatRate)
  const paymentCost = collected * s.paymentRate + s.paymentFixed
  const returnReserve = revenueExVat * s.returnReserveRate
  const beforeAds = revenueExVat - s.landedProductCost - s.supplierShippingCost - paymentCost - returnReserve - s.overheadPerOrder
  return {
    collected, revenueExVat, paymentCost, returnReserve, beforeAds,
    afterAds: beforeAds - s.acquisitionCost,
    breakEvenAcquisitionCost: beforeAds,
    contributionRate: revenueExVat > 0 ? (beforeAds - s.acquisitionCost) / revenueExVat : null,
  }
}
