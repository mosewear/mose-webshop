/**
 * Promo-code eligibility helper.
 *
 * Single source of truth for the no-stacking sale rule across:
 *   - /api/validate-promo-code   (cart drawer + checkout page check)
 *   - /api/checkout              (authoritative order creation)
 *   - ExpressCheckout            (Apple Pay / Google Pay shortcut)
 *
 * Inputs are kept deliberately minimal: a pure function over already-
 * fetched products + cart lines. The HTTP routes own DB I/O so the
 * helper stays trivially unit-testable.
 *
 * The toggle:
 *   `applies_to_sale_items=false` (default)  → sale lines are skipped
 *     for the eligible subtotal AND for min-order checks (legacy).
 *   `applies_to_sale_items=true`             → every line counts. Promo
 *     stacks on top of sale_price using each line's effective price.
 *
 * The staffel-vs-promo block is a separate no-stacking rule and is NOT
 * handled here — callers still need to verify staffel savings = 0
 * before applying any promo (see `computeActiveStaffelSavingsEuros`).
 *
 * Gift cards never count toward the promo discount and never block
 * application even when they're the only thing in the cart along with
 * a sale item — they're simply skipped (mirrors the gift-card carve-
 * out in `normalizePromoCartLine`).
 */

export interface PromoEligibilityPromoCode {
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_value: number | null
  applies_to_sale_items: boolean
}

export interface PromoEligibilityLine {
  productId: string
  productName?: string
  /** Unit price the customer is actually charged (sale_price if any, else base_price). */
  unitPrice: number
  quantity: number
  /** Pulled from products table — used to detect "has active sale". */
  basePrice: number | null
  salePrice: number | null
  /** Gift cards never participate in promo eligibility. */
  isGiftCard?: boolean
}

export type PromoIneligibleReason =
  | 'all_lines_on_sale'
  | 'min_order_not_met'
  | 'no_eligible_lines'

export interface PromoEligibilityResult {
  /** True when the promo can be applied to at least part of the cart. */
  eligible: boolean
  /** Subtotal of lines the promo actually applies to. */
  eligibleSubtotal: number
  /** Subtotal of lines excluded because they're on sale. 0 when the
   *  promo `applies_to_sale_items=true`. */
  excludedOnSaleSubtotal: number
  /** Subtotal of gift-card lines (always excluded). */
  giftCardSubtotal: number
  /** Final discount in EUR, capped at `eligibleSubtotal`. 0 when not eligible. */
  discountAmount: number
  /** Reason for ineligibility — null when `eligible=true`. */
  reason: PromoIneligibleReason | null
  /** Customer-facing NL message to show in the UI when eligible=false. */
  errorMessage: string | null
}

/**
 * Compute promo eligibility + discount for a cart against a single
 * promo code. Pure function: same input → same output.
 */
export function computePromoEligibility(
  promoCode: PromoEligibilityPromoCode,
  lines: PromoEligibilityLine[],
): PromoEligibilityResult {
  let eligibleSubtotal = 0
  let excludedOnSaleSubtotal = 0
  let giftCardSubtotal = 0

  for (const line of lines) {
    if (line.quantity <= 0 || !Number.isFinite(line.unitPrice)) continue
    const lineTotal = line.unitPrice * line.quantity

    if (line.isGiftCard) {
      giftCardSubtotal += lineTotal
      continue
    }

    const hasActiveSale =
      line.salePrice != null &&
      line.basePrice != null &&
      line.salePrice > 0 &&
      line.salePrice < line.basePrice

    if (hasActiveSale && !promoCode.applies_to_sale_items) {
      excludedOnSaleSubtotal += lineTotal
      continue
    }

    eligibleSubtotal += lineTotal
  }

  const round = (n: number): number => Math.round(n * 100) / 100

  if (eligibleSubtotal <= 0) {
    return {
      eligible: false,
      eligibleSubtotal: 0,
      excludedOnSaleSubtotal: round(excludedOnSaleSubtotal),
      giftCardSubtotal: round(giftCardSubtotal),
      discountAmount: 0,
      reason: excludedOnSaleSubtotal > 0 ? 'all_lines_on_sale' : 'no_eligible_lines',
      errorMessage:
        excludedOnSaleSubtotal > 0
          ? 'Korting op korting niet mogelijk. Deze kortingscode werkt alleen op producten zonder bestaande korting.'
          : 'Deze kortingscode kan niet worden toegepast op de huidige items.',
    }
  }

  const minOrder = promoCode.min_order_value ?? 0
  if (minOrder > 0 && eligibleSubtotal < minOrder) {
    const eurosOff = minOrder.toFixed(2).replace('.', ',')
    return {
      eligible: false,
      eligibleSubtotal: round(eligibleSubtotal),
      excludedOnSaleSubtotal: round(excludedOnSaleSubtotal),
      giftCardSubtotal: round(giftCardSubtotal),
      discountAmount: 0,
      reason: 'min_order_not_met',
      errorMessage: promoCode.applies_to_sale_items
        ? `Minimale bestelwaarde: €${eurosOff}.`
        : `Minimale bestelwaarde: €${eurosOff} (alleen items zonder korting tellen).`,
    }
  }

  let discountAmount = 0
  if (promoCode.discount_type === 'percentage') {
    discountAmount = (eligibleSubtotal * promoCode.discount_value) / 100
  } else if (promoCode.discount_type === 'fixed') {
    discountAmount = Math.min(promoCode.discount_value, eligibleSubtotal)
  }
  discountAmount = Math.min(discountAmount, eligibleSubtotal)

  return {
    eligible: true,
    eligibleSubtotal: round(eligibleSubtotal),
    excludedOnSaleSubtotal: round(excludedOnSaleSubtotal),
    giftCardSubtotal: round(giftCardSubtotal),
    discountAmount: round(discountAmount),
    reason: null,
    errorMessage: null,
  }
}
