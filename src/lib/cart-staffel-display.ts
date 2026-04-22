import type { CartItem } from '@/store/cart'
import { calculateQuantityDiscount, type QuantityDiscountTier } from '@/lib/quantity-discount'

export type ProductQtyTierRow = {
  product_id: string
  min_quantity: number
  discount_type: string
  discount_value: number
  is_active?: boolean | null
}

function toTiers(rows: ProductQtyTierRow[]): QuantityDiscountTier[] {
  return rows.map((r) => ({
    product_id: r.product_id,
    min_quantity: r.min_quantity,
    discount_type: r.discount_type === 'percentage' ? 'percentage' : 'fixed',
    discount_value: Number(r.discount_value) || 0,
    is_active: r.is_active !== false,
  }))
}

export type StaffelHint = {
  productId: string
  productName: string
  needed: number
  discountLabel: string
}

export type CartStaffelBreakdown = {
  totalSavings: number
  lineSavingByVariantId: Record<string, number>
  hints: StaffelHint[]
}

/**
 * Staffel / quantity discount breakdown for cart UI — matches checkout logic
 * (per line original price × shared product quantity for tier lookup).
 */
export function computeCartStaffelBreakdown(
  items: CartItem[],
  tierRows: ProductQtyTierRow[],
  saleByProductId: Record<string, boolean>
): CartStaffelBreakdown {
  const lineSavingByVariantId: Record<string, number> = {}
  const hints: StaffelHint[] = []
  if (!items.length || !tierRows.length) {
    return { totalSavings: 0, lineSavingByVariantId, hints }
  }

  const tiersByProduct: Record<string, QuantityDiscountTier[]> = {}
  for (const row of tierRows) {
    if (!row.product_id) continue
    if (!tiersByProduct[row.product_id]) tiersByProduct[row.product_id] = []
    tiersByProduct[row.product_id].push(toTiers([row])[0])
  }

  const grouped: Record<string, { totalQty: number; indices: number[] }> = {}
  items.forEach((item, index) => {
    if (!grouped[item.productId]) grouped[item.productId] = { totalQty: 0, indices: [] }
    grouped[item.productId].totalQty += item.quantity
    grouped[item.productId].indices.push(index)
  })

  let totalSavings = 0

  for (const [productId, group] of Object.entries(grouped)) {
    if (saleByProductId[productId]) continue
    const tiers = tiersByProduct[productId]
    if (!tiers?.length) continue

    const productName =
      items.find((i) => i.productId === productId)?.name || 'Product'

    for (const idx of group.indices) {
      const item = items[idx]
      const res = calculateQuantityDiscount(item.price, group.totalQty, tiers)
      const lineSaving = Math.round(res.discountPerItem * item.quantity * 100) / 100
      if (lineSaving > 0) {
        lineSavingByVariantId[item.variantId] = lineSaving
        totalSavings += lineSaving
      }
    }

    const sortedTiers = [...tiers].filter((t) => t.is_active).sort((a, b) => a.min_quantity - b.min_quantity)
    const nextTier = sortedTiers.find((t) => t.min_quantity > group.totalQty)
    if (nextTier) {
      const needed = nextTier.min_quantity - group.totalQty
      const discountLabel =
        nextTier.discount_type === 'percentage'
          ? `${nextTier.discount_value}%`
          : `€${Number(nextTier.discount_value).toFixed(2)}`
      hints.push({ productId, productName, needed, discountLabel })
    }
  }

  totalSavings = Math.round(totalSavings * 100) / 100
  return { totalSavings, lineSavingByVariantId, hints }
}
