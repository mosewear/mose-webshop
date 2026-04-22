/**
 * Shared helpers for sorting product variants consistently in admin views.
 * Primary axis is color (alphabetical NL), secondary axis is size (clothing order).
 *
 * Sizes are ordered using a standard clothing scale (XS → 4XL). Non-clothing
 * sizes (pure numbers or unknown labels) fall back to numeric / alphabetical
 * comparison so any value is handled gracefully.
 */

export const SIZE_ORDER: readonly string[] = [
  'XXS',
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  '2XL',
  '3XL',
  '4XL',
  '5XL',
]

const normalize = (value: string | null | undefined): string =>
  (value ?? '').trim().toUpperCase()

export function compareSizes(a: string, b: string): number {
  const ua = normalize(a)
  const ub = normalize(b)

  if (ua === ub) return 0

  const ia = SIZE_ORDER.indexOf(ua)
  const ib = SIZE_ORDER.indexOf(ub)

  if (ia !== -1 && ib !== -1) return ia - ib
  if (ia !== -1) return -1
  if (ib !== -1) return 1

  const na = Number.parseFloat(ua)
  const nb = Number.parseFloat(ub)
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb

  return ua.localeCompare(ub, 'nl', { sensitivity: 'base', numeric: true })
}

export function compareColors(a: string, b: string): number {
  const ca = (a ?? '').trim()
  const cb = (b ?? '').trim()
  return ca.localeCompare(cb, 'nl', { sensitivity: 'base' })
}

export interface VariantSortKeys {
  size: string
  color: string
  product?: { name?: string | null } | null
}

export function compareVariantsByColorSize<T extends VariantSortKeys>(
  a: T,
  b: T
): number {
  const byColor = compareColors(a.color, b.color)
  if (byColor !== 0) return byColor
  return compareSizes(a.size, b.size)
}

export function compareVariantsByProductColorSize<T extends VariantSortKeys>(
  a: T,
  b: T
): number {
  const pa = (a.product?.name ?? '').trim()
  const pb = (b.product?.name ?? '').trim()
  const byProduct = pa.localeCompare(pb, 'nl', { sensitivity: 'base' })
  if (byProduct !== 0) return byProduct
  return compareVariantsByColorSize(a, b)
}

export function sortVariantsByColorSize<T extends VariantSortKeys>(
  list: readonly T[]
): T[] {
  return [...list].sort(compareVariantsByColorSize)
}

export function sortVariantsByProductColorSize<T extends VariantSortKeys>(
  list: readonly T[]
): T[] {
  return [...list].sort(compareVariantsByProductColorSize)
}
