import { z } from 'zod'
import { nativeGiftLineSchema } from './native-gift-input'
import { MOSE_CHECKOUT_HOSTS } from './checkout-hosts'

export const SHOPIFY_API_VERSION = '2026-10'
export const SHOPIFY_STORE = 'hp5szr-te.myshopify.com'
export const PILOT_MODELS = [
  'RW0041-P001-V3', 'RT0028-C001-V2', 'MB0001-C001-V2', 'MB0057-C001-V2',
  'UB0083-C001-V2', 'MB0030-C001-V2', 'MB0010-C001-V2', 'UB0018-C001-V2',
  'R00099-C001-V6', 'UT0276-C001-V2', 'RT0086-C001-V4',
  'UT0289-P001-V4', 'UB0051-P001-V2', 'UT0320-P001-V2',
] as const

export const checkoutInput = z.object({
  locale: z.enum(['nl', 'en']),
  country: z.literal('NL'),
  attemptId: z.string().uuid(),
  promoCode: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/).optional(),
  loyaltyPoints: z.number().int().min(0).max(20_000_000).multipleOf(100).optional(),
  giftCards: z.array(nativeGiftLineSchema).max(30).optional(),
  lines: z.array(z.object({
    variantId: z.string().min(1).max(160).regex(/^[A-Za-z0-9_-]+$/),
    quantity: z.number().int().min(1).max(10),
  }).strict()).max(30),
}).strict().refine(input => input.lines.length + (input.giftCards?.length ?? 0) > 0 && input.lines.length + (input.giftCards?.length ?? 0) <= 30, 'INVALID_CART_SIZE')
export type CheckoutInput = z.infer<typeof checkoutInput>
export type FulfillmentOwner = 'mose' | 'tapstitch' | 'digital'
export type MappedVariant = {
  mose_variant_id: string
  shopify_variant_id: string
  fulfillment_owner: FulfillmentOwner
  supplier_model: string | null
  supplier_link_verified: boolean
  owner_release_authorized_at?: string | null
  owner_release_reference?: string | null
  fulfillment_mode?: 'local_stock' | 'made_to_order'
  sample_verified: boolean
  enabled: boolean
  price_eur_cents: number
}

/** Owner may explicitly release before quality samples; this never claims sample approval. */
export function supplierReleaseAuthorized(mapping: Pick<MappedVariant, 'sample_verified' | 'owner_release_authorized_at' | 'owner_release_reference'>, now = Date.now()) {
  if (mapping.sample_verified === true) return true
  const authorizedAt = Date.parse(mapping.owner_release_authorized_at ?? '')
  return Number.isFinite(authorizedAt) && authorizedAt <= now && (mapping.owner_release_reference?.trim().length ?? 0) >= 20
}

/** Local identity is never authority: every route/price comes from a released server mapping. */
export function authorizeLines(input: CheckoutInput, variants: MappedVariant[]) {
  const totals = new Map<string, number>()
  for (const line of input.lines) totals.set(line.variantId, (totals.get(line.variantId) ?? 0) + line.quantity)
  const result = [...totals].map(([localVariantId, quantity]) => {
    const match = variants.find(v => v.mose_variant_id === localVariantId)
    const supplierReady = match?.fulfillment_owner !== 'tapstitch' ||
      (match.supplier_link_verified && supplierReleaseAuthorized(match) && PILOT_MODELS.some(model => model === match.supplier_model))
    if (!match || !match.enabled || !supplierReady ||
      !['mose', 'tapstitch'].includes(match.fulfillment_owner) ||
      !/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(match.shopify_variant_id) ||
      !Number.isSafeInteger(match.price_eur_cents) || match.price_eur_cents <= 0 || quantity > 10) {
      throw new Error('VARIANT_NOT_RELEASED')
    }
    return { localVariantId, merchandiseId: match.shopify_variant_id, quantity, expectedPriceCents: match.price_eur_cents }
  })
  if (new Set(result.map(l => l.merchandiseId)).size !== result.length) throw new Error('DUPLICATE_MAPPING')
  return result.sort((a, b) => a.localVariantId.localeCompare(b.localVariantId))
}

export function isShopifyIdentity(value: unknown): boolean {
  return typeof value === 'string' && (value.startsWith('gid://shopify/') || value.startsWith('shopify:'))
}

/** Redirect only to the configured shop or a separately verified checkout domain. */
export function assertCheckoutUrl(value: string, extraHost?: string): string {
  const url = new URL(value)
  const allowed: string[] = [...MOSE_CHECKOUT_HOSTS]
  if (extraHost && /^[a-z0-9.-]+$/.test(extraHost)) allowed.push(extraHost)
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed.includes(url.hostname)) {
    throw new Error('INVALID_CHECKOUT_URL')
  }
  return url.href
}

export function moneyToCents(amount: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) throw new Error('INVALID_MONEY')
  const [whole, fraction = ''] = amount.split('.')
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(value)) throw new Error('INVALID_MONEY')
  return value
}
