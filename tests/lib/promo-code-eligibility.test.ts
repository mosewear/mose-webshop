import { describe, it, expect } from 'vitest'
import {
  computePromoEligibility,
  type PromoEligibilityLine,
  type PromoEligibilityPromoCode,
} from '@/lib/promo-code-eligibility'

const code10pct: PromoEligibilityPromoCode = {
  code: 'MOSE10',
  discount_type: 'percentage',
  discount_value: 10,
  min_order_value: 0,
  applies_to_sale_items: false,
}

const code10pctOnSale: PromoEligibilityPromoCode = {
  ...code10pct,
  code: 'FLASH10',
  applies_to_sale_items: true,
}

const code5eurFixed: PromoEligibilityPromoCode = {
  code: 'CINCO',
  discount_type: 'fixed',
  discount_value: 5,
  min_order_value: 0,
  applies_to_sale_items: false,
}

const regularLine: PromoEligibilityLine = {
  productId: 'tee',
  unitPrice: 30,
  quantity: 2,
  basePrice: 30,
  salePrice: null,
}

const saleLine: PromoEligibilityLine = {
  productId: 'hoodie-sale',
  unitPrice: 60,
  quantity: 1,
  basePrice: 100,
  salePrice: 60,
}

const giftCardLine: PromoEligibilityLine = {
  productId: 'gc',
  unitPrice: 50,
  quantity: 1,
  basePrice: 50,
  salePrice: null,
  isGiftCard: true,
}

describe('computePromoEligibility', () => {
  it('applies a 10% promo to a fully non-sale cart', () => {
    const r = computePromoEligibility(code10pct, [regularLine])
    expect(r.eligible).toBe(true)
    expect(r.eligibleSubtotal).toBe(60)
    expect(r.excludedOnSaleSubtotal).toBe(0)
    expect(r.discountAmount).toBe(6)
  })

  it('excludes sale lines when applies_to_sale_items=false', () => {
    const r = computePromoEligibility(code10pct, [regularLine, saleLine])
    expect(r.eligible).toBe(true)
    expect(r.eligibleSubtotal).toBe(60) // tee only
    expect(r.excludedOnSaleSubtotal).toBe(60) // hoodie
    expect(r.discountAmount).toBe(6)
  })

  it('includes sale lines when applies_to_sale_items=true', () => {
    const r = computePromoEligibility(code10pctOnSale, [regularLine, saleLine])
    expect(r.eligible).toBe(true)
    expect(r.eligibleSubtotal).toBe(120)
    expect(r.excludedOnSaleSubtotal).toBe(0)
    expect(r.discountAmount).toBe(12)
  })

  it('rejects when every line is on sale and code does not stack', () => {
    const r = computePromoEligibility(code10pct, [saleLine])
    expect(r.eligible).toBe(false)
    expect(r.reason).toBe('all_lines_on_sale')
    expect(r.errorMessage).toContain('Korting op korting')
  })

  it('accepts an all-sale cart when code stacks', () => {
    const r = computePromoEligibility(code10pctOnSale, [saleLine])
    expect(r.eligible).toBe(true)
    expect(r.discountAmount).toBe(6)
  })

  it('gift cards never participate but never block the promo', () => {
    const r = computePromoEligibility(code10pct, [regularLine, giftCardLine])
    expect(r.eligible).toBe(true)
    expect(r.eligibleSubtotal).toBe(60)
    expect(r.giftCardSubtotal).toBe(50)
    expect(r.discountAmount).toBe(6)
  })

  it('an all-gift-card cart is not eligible', () => {
    const r = computePromoEligibility(code10pct, [giftCardLine])
    expect(r.eligible).toBe(false)
    expect(r.reason).toBe('no_eligible_lines')
  })

  it('blocks below min_order_value (eligible-only counter, no sale stacking)', () => {
    const r = computePromoEligibility(
      { ...code10pct, min_order_value: 100 },
      [regularLine, saleLine], // 60 eligible, 60 sale
    )
    expect(r.eligible).toBe(false)
    expect(r.reason).toBe('min_order_not_met')
    expect(r.errorMessage).toContain('zonder korting')
  })

  it('passes min_order_value when including sale items via toggle', () => {
    const r = computePromoEligibility(
      { ...code10pctOnSale, min_order_value: 100 },
      [regularLine, saleLine], // 60 eligible + 60 sale = 120
    )
    expect(r.eligible).toBe(true)
    expect(r.discountAmount).toBe(12)
  })

  it('fixed discount is capped at eligible subtotal', () => {
    const r = computePromoEligibility(
      { ...code5eurFixed, discount_value: 1000 },
      [regularLine],
    )
    expect(r.discountAmount).toBe(60) // capped at €60
  })

  it('fixed discount applies cleanly when below eligible subtotal', () => {
    const r = computePromoEligibility(code5eurFixed, [regularLine])
    expect(r.discountAmount).toBe(5)
  })

  it('skips lines with non-finite unit price without crashing', () => {
    const r = computePromoEligibility(code10pct, [
      regularLine,
      { ...regularLine, productId: 'bad', unitPrice: Number.NaN },
    ])
    expect(r.eligibleSubtotal).toBe(60)
    expect(r.discountAmount).toBe(6)
  })

  it('handles a sale_price of 0 as "no sale" (defensive)', () => {
    const r = computePromoEligibility(code10pct, [
      { ...regularLine, basePrice: 30, salePrice: 0 },
    ])
    expect(r.eligibleSubtotal).toBe(60)
    expect(r.discountAmount).toBe(6)
  })

  it('returns rounded values (2 decimals)', () => {
    const r = computePromoEligibility(
      { ...code10pct, discount_value: 12.345 },
      [regularLine],
    )
    expect(r.discountAmount).toBeCloseTo(7.41, 2)
  })
})
