/** Shopify native order-percentage discounts truncate the aggregate eligible
 * amount to currency cents, then distribute that amount across lines. Keep the
 * percentage native so changing a cart still recalculates its percentage.
 * Decimal integer arithmetic avoids an extra binary floating-point truncation.
 * This deliberately does not change legacy Mollie rounding or per-item staffels.
 */
export function shopifyPercentageDiscountCents(subtotalCents: number, percentage: number): number {
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0 || subtotalCents > 100_000_000 ||
      !Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new Error('BENEFITS_INVALID_PERCENTAGE')
  }
  const [mantissa, exponent = '0'] = String(percentage).toLowerCase().split('e')
  const [whole, fraction = ''] = mantissa.split('.')
  const scale = fraction.length - Number(exponent)
  const numerator = BigInt(subtotalCents) * BigInt(whole + fraction) * (BigInt(10) ** BigInt(Math.max(-scale, 0)))
  const denominator = BigInt(100) * (BigInt(10) ** BigInt(Math.max(scale, 0)))
  return Number(numerator / denominator)
}
