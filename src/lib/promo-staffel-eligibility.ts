import type { SupabaseClient } from '@supabase/supabase-js'
import type { CartItem } from '@/store/cart'
import {
  computeCartStaffelBreakdown,
  type ProductQtyTierRow,
} from '@/lib/cart-staffel-display'

/** Accepts cart lines from client (mixed key shapes). */
export function normalizePromoCartLine(raw: unknown): {
  cartLine: CartItem
} | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const productId = String(o.product_id ?? o.productId ?? '').trim()
  const unitPrice = Number(o.unit_price ?? o.price)
  const quantity = Math.floor(Number(o.quantity))
  const variantId = String(o.variant_id ?? o.variantId ?? '').trim() || `synthetic-${productId}`
  const name = String(o.product_name ?? o.name ?? 'Product').trim() || 'Product'
  const isGiftCard = Boolean(o.is_gift_card ?? (o as any).isGiftCard)

  if (!productId || !Number.isFinite(unitPrice) || !Number.isFinite(quantity) || quantity < 1) {
    return null
  }

  // Gift cards are excluded from staffel and promo eligibility calculations.
  if (isGiftCard) {
    return null
  }

  const cartLine: CartItem = {
    productId,
    variantId,
    slug: String(o.slug ?? ''),
    name,
    size: String(o.size ?? ''),
    color: String(o.color ?? ''),
    colorHex: String(o.colorHex ?? '#000000'),
    price: unitPrice,
    quantity,
    image: String(o.image ?? ''),
    sku: String(o.sku ?? ''),
    stock: Number(o.stock ?? 999) || 999,
    isPresale: Boolean(o.isPresale ?? o.is_presale),
    presaleExpectedDate: o.presaleExpectedDate as string | undefined,
    presaleStock: o.presaleStock as number | undefined,
  }
  return { cartLine }
}

/**
 * Euro staffel savings currently active for this cart (0 = no tier discount applied yet).
 * Same rules as checkout / cart drawer (per-line tiers, sale products excluded).
 */
export async function computeActiveStaffelSavingsEuros(
  supabase: SupabaseClient,
  rawItems: unknown[]
): Promise<number> {
  const cartLines: CartItem[] = []
  for (const raw of rawItems) {
    const n = normalizePromoCartLine(raw)
    if (n) cartLines.push(n.cartLine)
  }
  if (cartLines.length === 0) return 0

  const productIds = [...new Set(cartLines.map((i) => i.productId))]

  const { data: tiers } = await supabase
    .from('product_quantity_discounts')
    .select('product_id, min_quantity, discount_type, discount_value, is_active')
    .in('product_id', productIds)
    .eq('is_active', true)

  const { data: products } = await supabase
    .from('products')
    .select('id, sale_price, base_price')
    .in('id', productIds)

  if (!tiers?.length) return 0

  const tierRows: ProductQtyTierRow[] = tiers.map((t) => ({
    product_id: t.product_id,
    min_quantity: t.min_quantity,
    discount_type: t.discount_type,
    discount_value: t.discount_value,
    is_active: t.is_active,
  }))

  const saleByProductId: Record<string, boolean> = {}
  products?.forEach((p) => {
    if (p.sale_price != null && p.base_price != null && p.sale_price < p.base_price) {
      saleByProductId[p.id] = true
    }
  })

  return computeCartStaffelBreakdown(cartLines, tierRows, saleByProductId).totalSavings
}
