import type { SupabaseClient } from '@supabase/supabase-js'

export class LegacyCatalogError extends Error {
  constructor(public code: string) { super(code) }
}
type SubmittedLine = Record<string, unknown>
const cents = (value: unknown): number => {
  if ((typeof value !== 'number' && typeof value !== 'string') || !/^\d+(\.\d{1,2})?$/.test(String(value))) throw new LegacyCatalogError('INVALID_PRICE')
  const result = Math.round(Number(value) * 100)
  if (!Number.isSafeInteger(result)) throw new LegacyCatalogError('INVALID_PRICE')
  return result
}

/** Authoritative prices/identity before any customer/order/promo mutation. */
export async function authorizeLegacyCatalog(db: SupabaseClient, submitted: unknown) {
  if (!Array.isArray(submitted) || submitted.length < 1 || submitted.length > 100) throw new LegacyCatalogError('INVALID_CART')
  const lines = submitted as SubmittedLine[]
  if (lines.some(line => !line || typeof line !== 'object' || typeof line.product_id !== 'string' ||
    !Number.isSafeInteger(line.quantity) || Number(line.quantity) < 1 || Number(line.quantity) > 100)) throw new LegacyCatalogError('INVALID_CART')
  const ids = [...new Set(lines.map(line => line.product_id as string))]
  const { data: products, error } = await db.from('products').select('id,name,is_active,status,is_gift_card,base_price,sale_price,allows_custom_amount,gift_card_min_amount,gift_card_max_amount').in('id', ids)
  if (error || !products || products.length !== ids.length) throw new LegacyCatalogError('PRODUCT_UNAVAILABLE')
  const variantIds = [...new Set(lines.map(line => line.variant_id).filter((id): id is string => typeof id === 'string' && id.length > 0))]
  const variantResult = variantIds.length
    ? await db.from('product_variants').select('id,product_id,size,color,sku,is_available,price_adjustment').in('id', variantIds)
    : { data: [], error: null }
  if (variantResult.error || !variantResult.data) throw new LegacyCatalogError('CATALOG_UNAVAILABLE')
  const byProduct = new Map(products.map(p => [p.id, p]))
  const byVariant = new Map(variantResult.data.map(v => [v.id, v]))
  return lines.map(line => {
    const product = byProduct.get(line.product_id)
    if (!product || product.is_active !== true || product.status !== 'active') throw new LegacyCatalogError('PRODUCT_UNAVAILABLE')
    const gift = product.is_gift_card === true
    if (Boolean(line.is_gift_card) !== gift) throw new LegacyCatalogError('PRODUCT_KIND_CHANGED')
    const variant = typeof line.variant_id === 'string' ? byVariant.get(line.variant_id) : undefined
    const base = cents(product.base_price)
    let price: number
    if (gift) {
      const amount = line.gift_card_amount ?? (line.gift_card_metadata as Record<string, unknown> | undefined)?.amount ?? line.unit_price
      price = cents(amount)
      if (variant) {
        if (variant.product_id !== product.id || variant.is_available !== true) throw new LegacyCatalogError('VARIANT_UNAVAILABLE')
        const denomination = base + Math.round(Number(variant.price_adjustment ?? 0) * 100)
        if (price !== denomination) throw new LegacyCatalogError('GIFT_AMOUNT_CHANGED')
      } else {
        const min = cents(product.gift_card_min_amount ?? 10), max = cents(product.gift_card_max_amount ?? 500)
        if (product.allows_custom_amount !== true || price < min || price > max) throw new LegacyCatalogError('GIFT_AMOUNT_UNAVAILABLE')
      }
    } else {
      if (!variant || variant.product_id !== product.id || variant.is_available !== true) throw new LegacyCatalogError('VARIANT_UNAVAILABLE')
      const adjustment = Number(variant.price_adjustment ?? 0)
      if (!Number.isFinite(adjustment) || Math.round(adjustment * 100) / 100 !== adjustment) throw new LegacyCatalogError('INVALID_PRICE')
      const sale = product.sale_price === null ? null : cents(product.sale_price)
      price = (sale !== null && sale < base ? sale : base) + Math.round(adjustment * 100)
    }
    if (!Number.isSafeInteger(price) || price <= 0) throw new LegacyCatalogError('INVALID_PRICE')
    // Reject changed/tampered amounts so an old cart cannot silently authorize
    // a different total. Quantity discounts are recomputed after this boundary.
    if (cents(line.unit_price) !== price || (line.price_at_purchase !== undefined && cents(line.price_at_purchase) !== price)) throw new LegacyCatalogError('PRICE_CHANGED')
    return { ...line, product_id: product.id, variant_id: gift ? null : variant!.id,
      product_name: product.name, size: variant?.size ?? null, color: variant?.color ?? null, sku: variant?.sku ?? null,
      is_gift_card: gift, quantity: Number(line.quantity), unit_price: price / 100,
      price_at_purchase: price / 100, subtotal: price * Number(line.quantity) / 100,
      ...(gift ? { gift_card_amount: price / 100, gift_card_metadata: { ...(line.gift_card_metadata && typeof line.gift_card_metadata === 'object' ? line.gift_card_metadata : {}), amount: price / 100 } } : {}),
    }
  })
}
