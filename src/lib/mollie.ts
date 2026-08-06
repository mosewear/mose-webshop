import createMollieClient, {
  Locale,
  PaymentMethod,
} from '@mollie/api-client'
import { getPublicSiteUrl } from '@/lib/site-url'

export type StorefrontPaymentMethod =
  | 'ideal'
  | 'card'
  | 'klarna'
  | 'bancontact'
  | 'paypal'

/** Narrow shape we use after payments.create / payments.get */
export type MolliePaymentLike = {
  id: string
  status: string
  method?: string | null
  amount: { value: string; currency: string }
  amountRefunded?: { value: string; currency: string }
  paidAt?: string | null
  metadata?: Record<string, unknown> | null
  getCheckoutUrl: () => string | null
}

let cachedClient: ReturnType<typeof createMollieClient> | null = null

export function getMollieClient() {
  const apiKey = process.env.MOLLIE_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('MOLLIE_API_KEY is not configured')
  }
  if (!cachedClient) {
    cachedClient = createMollieClient({ apiKey })
  }
  return cachedClient
}

/** Mollie amounts must be a string with exactly 2 decimal places. */
export function formatMollieAmount(euros: number): string {
  if (!Number.isFinite(euros)) return '0.00'
  return (Math.round(euros * 100) / 100).toFixed(2)
}

export function toMollieMethod(method: StorefrontPaymentMethod): PaymentMethod {
  const map: Record<StorefrontPaymentMethod, PaymentMethod> = {
    ideal: PaymentMethod.ideal,
    card: PaymentMethod.creditcard,
    klarna: PaymentMethod.klarna,
    bancontact: PaymentMethod.bancontact,
    paypal: PaymentMethod.paypal,
  }
  return map[method]
}

/** Map Mollie payment method back to our storefront labels. */
export function fromMollieMethod(method: string | null | undefined): string {
  if (!method) return 'unknown'
  if (method === 'creditcard') return 'card'
  return method
}

export function mapMollieStatusToPaymentStatus(
  status: string
): 'pending' | 'paid' | 'failed' | 'expired' {
  switch (status) {
    case 'paid':
      return 'paid'
    case 'failed':
    case 'canceled':
      return 'failed'
    case 'expired':
      return 'expired'
    case 'pending':
    case 'open':
    case 'authorized':
    default:
      return 'pending'
  }
}

export function mollieLocale(locale: string): Locale {
  return locale === 'en' ? Locale.en_US : Locale.nl_NL
}

export function getMollieWebhookUrl(): string {
  return `${getPublicSiteUrl().replace(/\/$/, '')}/api/mollie-webhook`
}

export function getOrderPaymentRedirectUrl(orderId: string, locale: string): string {
  const base = getPublicSiteUrl().replace(/\/$/, '')
  const loc = locale === 'en' ? 'en' : 'nl'
  return `${base}/${loc}/checkout/payment-status?order_id=${encodeURIComponent(orderId)}`
}

export function getReturnPaymentRedirectUrl(returnId: string, locale: string): string {
  const base = getPublicSiteUrl().replace(/\/$/, '')
  const loc = locale === 'en' ? 'en' : 'nl'
  return `${base}/${loc}/returns/${encodeURIComponent(returnId)}?payment=return`
}

/**
 * Mollie's create()/get() overloads sometimes resolve to `Promise & void` in TS.
 * Normalize to a usable Payment-like object.
 */
export async function asMolliePayment(value: unknown): Promise<MolliePaymentLike> {
  return (await Promise.resolve(value)) as MolliePaymentLike
}
