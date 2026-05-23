/**
 * Smoke test: load VVA2000 + a known MOSE product mix from the live DB,
 * run the centralized eligibility helper, and assert the math matches
 * expectations end-to-end.
 *
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/verify-vva2000-eligibility.ts
 */

import { createClient } from '@supabase/supabase-js'
import {
  computePromoEligibility,
  type PromoEligibilityLine,
  type PromoEligibilityPromoCode,
} from '../src/lib/promo-code-eligibility'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local')
}
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

interface ProductRow {
  id: string
  name: string
  base_price: string | number
  sale_price: string | number | null
}

function num(v: string | number | null | undefined): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function fmt(v: number): string {
  return `€${v.toFixed(2)}`
}

function passOrFail(label: string, expected: number, actual: number): void {
  const ok = Math.abs(expected - actual) < 0.005
  console.log(`  ${ok ? '✅' : '❌'} ${label}: expected ${fmt(expected)}, got ${fmt(actual)}`)
  if (!ok) process.exitCode = 1
}

async function main() {
  // ── Load VVA2000 ────────────────────────────────────────────────────
  const { data: promoRow, error: promoErr } = await supabase
    .from('promo_codes')
    .select('code, discount_type, discount_value, min_order_value, applies_to_sale_items, is_active')
    .eq('code', 'VVA2000')
    .maybeSingle()

  if (promoErr || !promoRow) {
    throw new Error(`VVA2000 not found in DB: ${promoErr?.message}`)
  }

  console.log('VVA2000 live config:')
  console.log(JSON.stringify(promoRow, null, 2))
  console.log()

  const promo: PromoEligibilityPromoCode = {
    code: promoRow.code,
    discount_type: promoRow.discount_type as 'percentage' | 'fixed',
    discount_value: Number(promoRow.discount_value),
    min_order_value:
      promoRow.min_order_value != null ? Number(promoRow.min_order_value) : null,
    applies_to_sale_items: !!promoRow.applies_to_sale_items,
  }

  if (!promoRow.is_active) throw new Error('VVA2000 is not active in DB')
  if (promo.discount_type !== 'percentage' || Math.abs(promo.discount_value - 7.5) > 0.001) {
    throw new Error(`VVA2000 wrong shape: ${promo.discount_type} ${promo.discount_value}`)
  }
  if (!promo.applies_to_sale_items) {
    throw new Error('VVA2000 must have applies_to_sale_items=true')
  }

  // ── Load representative products ────────────────────────────────────
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, base_price, sale_price')
    .in('slug', ['mose-classic-sweater', 'mose-essential-hoodie', 'mose-automatisch-horloge'])

  if (prodErr || !products || products.length < 2) {
    throw new Error(`Could not load test products: ${prodErr?.message}`)
  }

  const byName = new Map<string, ProductRow>()
  for (const p of products as ProductRow[]) byName.set(p.name, p)
  const sweater = byName.get('MOSE Classic Sweater')!
  const hoodie = byName.get('MOSE Essential Hoodie')!
  const watch = byName.get('MOSE Automatisch Horloge')!

  const sweaterBase = num(sweater.base_price)!
  const sweaterSale = num(sweater.sale_price)!
  const hoodieBase = num(hoodie.base_price)!
  const hoodieSale = num(hoodie.sale_price)!
  const watchBase = num(watch.base_price)!

  console.log(`MOSE Classic Sweater: base ${fmt(sweaterBase)} sale ${fmt(sweaterSale)}`)
  console.log(`MOSE Essential Hoodie: base ${fmt(hoodieBase)} sale ${fmt(hoodieSale)}`)
  console.log(`MOSE Watch: base ${fmt(watchBase)} (no sale)`)
  console.log()

  // ── Scenario 1: cart full of sale items, VVA2000 should stack ──────
  console.log('Scenario 1: 1 sweater (sale) + 1 hoodie (sale)')
  {
    const lines: PromoEligibilityLine[] = [
      {
        productId: sweater.id,
        unitPrice: sweaterSale,
        quantity: 1,
        basePrice: sweaterBase,
        salePrice: sweaterSale,
      },
      {
        productId: hoodie.id,
        unitPrice: hoodieSale,
        quantity: 1,
        basePrice: hoodieBase,
        salePrice: hoodieSale,
      },
    ]
    const r = computePromoEligibility(promo, lines)
    const expectedSubtotal = sweaterSale + hoodieSale
    const expectedDiscount = Math.round(expectedSubtotal * 0.075 * 100) / 100
    passOrFail('eligible subtotal', expectedSubtotal, r.eligibleSubtotal)
    passOrFail('excluded subtotal', 0, r.excludedOnSaleSubtotal)
    passOrFail('discount', expectedDiscount, r.discountAmount)
    if (!r.eligible) throw new Error('Expected eligible=true')
    console.log()
  }

  // ── Scenario 2: mixed sale + non-sale cart ─────────────────────────
  console.log('Scenario 2: 1 sweater (sale) + 1 watch (no sale)')
  {
    const lines: PromoEligibilityLine[] = [
      {
        productId: sweater.id,
        unitPrice: sweaterSale,
        quantity: 1,
        basePrice: sweaterBase,
        salePrice: sweaterSale,
      },
      {
        productId: watch.id,
        unitPrice: watchBase,
        quantity: 1,
        basePrice: watchBase,
        salePrice: null,
      },
    ]
    const r = computePromoEligibility(promo, lines)
    const expectedSubtotal = sweaterSale + watchBase
    const expectedDiscount = Math.round(expectedSubtotal * 0.075 * 100) / 100
    passOrFail('eligible subtotal', expectedSubtotal, r.eligibleSubtotal)
    passOrFail('excluded subtotal', 0, r.excludedOnSaleSubtotal)
    passOrFail('discount', expectedDiscount, r.discountAmount)
    if (!r.eligible) throw new Error('Expected eligible=true')
    console.log()
  }

  // ── Scenario 3: same cart but with a non-stacking code ─────────────
  console.log('Scenario 3 (control): same cart, MOSE10 (no sale stacking)')
  {
    const nonStackPromo: PromoEligibilityPromoCode = {
      code: 'MOSE10',
      discount_type: 'percentage',
      discount_value: 10,
      min_order_value: 0,
      applies_to_sale_items: false,
    }
    const lines: PromoEligibilityLine[] = [
      {
        productId: sweater.id,
        unitPrice: sweaterSale,
        quantity: 1,
        basePrice: sweaterBase,
        salePrice: sweaterSale,
      },
      {
        productId: watch.id,
        unitPrice: watchBase,
        quantity: 1,
        basePrice: watchBase,
        salePrice: null,
      },
    ]
    const r = computePromoEligibility(nonStackPromo, lines)
    const expectedEligible = watchBase
    const expectedExcluded = sweaterSale
    const expectedDiscount = Math.round(expectedEligible * 0.1 * 100) / 100
    passOrFail('eligible subtotal', expectedEligible, r.eligibleSubtotal)
    passOrFail('excluded subtotal', expectedExcluded, r.excludedOnSaleSubtotal)
    passOrFail('discount', expectedDiscount, r.discountAmount)
    if (!r.eligible) throw new Error('Expected eligible=true (watch is eligible)')
    console.log()
  }

  // ── Scenario 4: all-sale cart with non-stacking code → rejected ────
  console.log('Scenario 4 (control): all-sale cart, MOSE10 → reject')
  {
    const nonStackPromo: PromoEligibilityPromoCode = {
      code: 'MOSE10',
      discount_type: 'percentage',
      discount_value: 10,
      min_order_value: 0,
      applies_to_sale_items: false,
    }
    const lines: PromoEligibilityLine[] = [
      {
        productId: sweater.id,
        unitPrice: sweaterSale,
        quantity: 1,
        basePrice: sweaterBase,
        salePrice: sweaterSale,
      },
    ]
    const r = computePromoEligibility(nonStackPromo, lines)
    if (r.eligible) {
      console.log('  ❌ Expected ineligible but got eligible')
      process.exitCode = 1
    } else if (r.reason !== 'all_lines_on_sale') {
      console.log(`  ❌ Expected reason=all_lines_on_sale, got ${r.reason}`)
      process.exitCode = 1
    } else {
      console.log(`  ✅ Correctly rejected with reason=${r.reason}`)
    }
    console.log()
  }

  console.log(process.exitCode ? '❌ Some assertions failed' : '✅ All assertions passed')
}

main().catch((err) => {
  console.error('Smoke test threw:', err)
  process.exit(1)
})
