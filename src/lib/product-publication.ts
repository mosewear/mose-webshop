/** Draft imports may carry a zero placeholder until a retail price is approved. */
export function needsRetailPrice(product: { base_price: number | string; is_gift_card?: boolean | null }): boolean {
  return !product.is_gift_card && (!Number.isFinite(Number(product.base_price)) || Number(product.base_price) <= 0)
}
