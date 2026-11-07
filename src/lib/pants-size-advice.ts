/**
 * MOSE trousers and jeans sizing guidance. Shorts are deliberately excluded.
 * Include the complete pants category plus training trousers, which can live
 * in the separate sport category.
 */
export function isPantsProductForSizeAdvice(product: {
  slug?: string | null
  categorySlug?: string | null
}): boolean {
  const slug = (product.slug || '').toLowerCase().trim()
  const category = (product.categorySlug || '').toLowerCase().trim()
  if (!slug || /(?:^|-)shorts$/.test(slug)) return false
  return category === 'broeken' ||
    /(?:^|-)(?:pants|sweatpants|jeans|joggers|trousers)$/.test(slug)
}
