/** Retail quantity cap, not a claim of physical supplier inventory. */
export const MAX_ORDER_QUANTITY = 10
export type VariantAvailability = {
  is_available?: boolean | null
  stock_quantity?: number | null
  presale_enabled?: boolean | null
  presale_stock_quantity?: number | null
  fulfillment_mode?: 'local_stock' | 'made_to_order' | null
  supplier_orderable?: boolean | null
  supplier_checked_at?: string | null
}
export function isMadeToOrderAvailable(variant: VariantAvailability, now = Date.now()) {
  const observed = Date.parse(variant.supplier_checked_at ?? '')
  return variant.fulfillment_mode === 'made_to_order' && variant.is_available === true &&
    variant.supplier_orderable === true && Number.isFinite(observed) && observed <= now + 60_000 && now - observed <= 900_000
}
export function availableVariant(variant: VariantAvailability, now = Date.now()) {
  if (variant.fulfillment_mode === 'made_to_order') return isMadeToOrderAvailable(variant, now)
  return variant.is_available === true && ((variant.stock_quantity ?? 0) > 0 ||
    (variant.presale_enabled === true && (variant.presale_stock_quantity ?? 0) > 0))
}
export function variantQuantityLimit(variant: VariantAvailability, now = Date.now()) {
  if (variant.fulfillment_mode === 'made_to_order') return isMadeToOrderAvailable(variant, now) ? MAX_ORDER_QUANTITY : 0
  if (variant.is_available !== true) return 0
  return Math.max(0, variant.stock_quantity ?? 0) + (variant.presale_enabled === true ? Math.max(0, variant.presale_stock_quantity ?? 0) : 0)
}

/** Schema.org has a dedicated MadeToOrder value; never advertise physical stock for POD. */
export function offerAvailability(variants: VariantAvailability[], isGiftCard = false, now = Date.now()) {
  if (isGiftCard || variants.some(v => v.fulfillment_mode !== 'made_to_order' && v.is_available === true && (v.stock_quantity ?? 0) > 0)) return 'https://schema.org/InStock'
  if (variants.some(v => isMadeToOrderAvailable(v, now))) return 'https://schema.org/MadeToOrder'
  if (variants.some(v => v.fulfillment_mode !== 'made_to_order' && availableVariant(v, now))) return 'https://schema.org/PreOrder'
  return 'https://schema.org/OutOfStock'
}
