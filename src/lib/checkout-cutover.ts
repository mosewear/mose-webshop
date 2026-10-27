/** Shopify cutover does not disable payments for already-created MOSE orders. */
export function shopifyCheckoutEnabled(): boolean {
  return process.env.SHOPIFY_CHECKOUT_ENABLED === 'true'
}

type HistoricalOrder = { created_at: unknown; payment_status: unknown; status: unknown }
export type LegacyPaymentDecision = 'allow' | 'cutover_not_configured' | 'not_historical' | 'not_payable'

export function legacyPaymentDecision(
  order: HistoricalOrder,
  enabled = shopifyCheckoutEnabled(),
  cutoverAt = process.env.SHOPIFY_CUTOVER_AT,
): LegacyPaymentDecision {
  if (!enabled) return 'allow'
  // Explicit offset required: never infer the server's timezone at migration.
  if (!cutoverAt || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(cutoverAt) ||
      !Number.isFinite(Date.parse(cutoverAt))) return 'cutover_not_configured'
  const createdAt = typeof order.created_at === 'string' ? Date.parse(order.created_at) : NaN
  if (!Number.isFinite(createdAt) || createdAt >= Date.parse(cutoverAt)) return 'not_historical'
  if (order.status === 'cancelled' || !['unpaid', 'pending', 'failed', 'expired'].includes(String(order.payment_status))) {
    return 'not_payable'
  }
  return 'allow'
}
