import { z } from 'zod'
import { TAPSTITCH_PRODUCT_SOURCES } from '@/lib/tapstitch-products'
import type { MappedVariant } from './policy'

const productSchema = z.object({
  id: z.string().min(1), status: z.string(), is_active: z.boolean(), is_gift_card: z.boolean(),
  base_price: z.unknown(), sale_price: z.unknown(),
})
const variantSchema = z.object({
  id: z.string().min(1), product_id: z.string().min(1), is_available: z.boolean(),
  price_adjustment: z.unknown(), presale_enabled: z.boolean().nullable(), presale_stock_quantity: z.number().int().nonnegative().nullable(),
})

function decimalCents(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  const amount = String(value)
  if (!/^-?\d+(\.\d{1,2})?$/.test(amount)) return null
  const negative = amount.startsWith('-')
  const [whole, fraction = ''] = (negative ? amount.slice(1) : amount).split('.')
  const cents = (Number(whole) * 100 + Number(fraction.padEnd(2, '0'))) * (negative ? -1 : 1)
  return Number.isSafeInteger(cents) ? cents : null
}

/** Decimal arithmetic shared by readiness and the actual checkout authorization. */
export function localVariantPriceCents(product: { base_price?: unknown; sale_price?: unknown }, variant: { price_adjustment?: unknown }): number | null {
  const base = decimalCents(product.base_price)
  const sale = product.sale_price == null ? null : decimalCents(product.sale_price)
  const adjustment = variant.price_adjustment == null ? 0 : decimalCents(variant.price_adjustment)
  if (base === null || base <= 0 || adjustment === null || (product.sale_price != null && sale === null)) return null
  const price = (sale !== null && sale > 0 && sale < base ? sale : base) + adjustment
  return Number.isSafeInteger(price) && price > 0 ? price : null
}

type CheckoutLine = { localVariantId: string; expectedPriceCents: number }
/** Server records are read fresh. Cached pages, client IDs and enabled mappings cannot publish a draft. */
export function assertCurrentLocalCatalog(lines: CheckoutLine[], variantRows: unknown[], productRows: unknown[], mappings: Pick<MappedVariant, 'mose_variant_id' | 'fulfillment_owner' | 'supplier_model'>[] = []): void {
  const variants = z.array(variantSchema).parse(variantRows)
  const products = z.array(productSchema).parse(productRows)
  const byVariant = new Map(variants.map(variant => [variant.id, variant]))
  const byProduct = new Map(products.map(product => [product.id, product]))
  if (byVariant.size !== variants.length || byProduct.size !== products.length) throw new Error('LOCAL_CATALOG_AMBIGUOUS')
  for (const line of lines) {
    const variant = byVariant.get(line.localVariantId)
    const product = variant ? byProduct.get(variant.product_id) : undefined
    if (!variant || variant.is_available !== true || !product || product.status !== 'active' || product.is_active !== true || product.is_gift_card !== false) {
      throw new Error('LOCAL_PRODUCT_UNAVAILABLE')
    }
    const supplierSource = TAPSTITCH_PRODUCT_SOURCES[product.id]
    if (supplierSource) {
      const owner = mappings.filter(mapping => mapping.mose_variant_id === variant.id)
      if (owner.length !== 1 || owner[0].fulfillment_owner !== 'tapstitch' || owner[0].supplier_model !== supplierSource.sourceCode) {
        throw new Error('SUPPLIER_ROUTING_MISMATCH')
      }
    }
    // Presale delivery promises and digital issuance must pass their own migration gates first.
    if (variant.presale_enabled && (variant.presale_stock_quantity ?? 0) > 0) throw new Error('PRESALE_NOT_RELEASED')
    const currentPrice = localVariantPriceCents(product, variant)
    if (currentPrice === null || currentPrice !== line.expectedPriceCents) throw new Error('LOCAL_PRICE_CHANGED')
  }
}
