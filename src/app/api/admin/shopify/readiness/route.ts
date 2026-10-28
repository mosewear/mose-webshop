import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceClient } from '@/lib/supabase/service'
import { summarizeReadiness, type IntegrationState } from '@/lib/shopify-readiness'
import { legacyPaymentDecision } from '@/lib/checkout-cutover'
import { attachReleaseAudit, auditShopifyRelease, type AuditProduct, type AuditVariant } from '@/lib/shopify-release-audit'
import { inventoryReadiness } from '@/lib/shopify/inventory'
import type { MappedVariant } from '@/lib/shopify/policy'
import { adminCredentialsConfigured } from '@/lib/shopify/admin-auth'

export const dynamic = 'force-dynamic'
export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' }
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) return NextResponse.json({ error: 'Geen toegang.' }, { status: 403, headers })
  const environment = {
    storefront: Boolean(process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN),
    admin: adminCredentialsConfigured(),
    session: (process.env.SHOPIFY_SESSION_SECRET?.length ?? 0) >= 32,
    webhook: Boolean(process.env.SHOPIFY_APP_CLIENT_SECRET),
    checkout: process.env.SHOPIFY_CHECKOUT_ENABLED === 'true',
    benefits: process.env.SHOPIFY_BENEFITS_VERIFIED === 'true',
    frontend: process.env.NEXT_PUBLIC_SHOPIFY_CHECKOUT_ENABLED === 'true',
    cutover: legacyPaymentDecision({ created_at: '1970-01-01T00:00:00Z', payment_status: 'pending', status: 'pending' }, true) === 'allow',
    sync: process.env.SHOPIFY_SYNC_ENABLED === 'true' && (process.env.CRON_SECRET?.length ?? 0) >= 24,
  }
  try {
    const db = createServiceClient()
    const now = new Date()
    const signal = AbortSignal.timeout(12000)
    // Do not probe absent migration tables repeatedly while the service is unhealthy.
    const state = await db.from('shopify_integration_state').select('app_installed,checkout_enabled,catalog_verified,inventory_verified,benefits_verified,fulfillment_verified,market_verified,last_worker_at,last_reconciled_at').eq('id', 1).abortSignal(signal).maybeSingle()
    if (state.error || !state.data) throw new Error('INTEGRATION_STATE_UNAVAILABLE')
    if (signal.aborted) throw new Error('READINESS_TIMEOUT')
    const [mappings, released, pending] = await Promise.all([
      db.from('shopify_variant_mappings').select('mose_variant_id,shopify_variant_id,fulfillment_owner,supplier_model,supplier_link_verified,sample_verified,enabled,price_eur_cents', { count: 'exact' }).limit(1000).abortSignal(signal),
      db.from('shopify_variant_mappings').select('*', { count: 'exact', head: true }).eq('enabled', true).abortSignal(signal),
      db.from('shopify_webhook_inbox').select('*', { count: 'exact', head: true }).is('processed_at', null).is('dead_letter_at', null).abortSignal(signal),
    ])
    if (signal.aborted) throw new Error('READINESS_TIMEOUT')
    const [failed, oldest, products] = await Promise.all([
      db.from('shopify_webhook_inbox').select('*', { count: 'exact', head: true }).not('dead_letter_at', 'is', null).is('processed_at', null).abortSignal(signal),
      db.from('shopify_webhook_inbox').select('received_at').is('processed_at', null).is('dead_letter_at', null).order('received_at', { ascending: true }).limit(1).abortSignal(signal).maybeSingle(),
      db.from('products').select('id,is_active,status,is_gift_card,base_price,sale_price', { count: 'exact' }).eq('is_active', true).eq('status', 'active').limit(1000).abortSignal(signal),
    ])
    if (signal.aborted) throw new Error('READINESS_TIMEOUT')
    const [variants, promotions, tiers] = await Promise.all([
      db.from('product_variants').select('id,product_id,is_available,price_adjustment,presale_enabled,presale_stock_quantity', { count: 'exact' }).limit(1000).abortSignal(signal),
      db.from('promo_codes').select('usage_count,usage_limit', { count: 'exact' }).eq('is_active', true).or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`).limit(1000).abortSignal(signal),
      db.from('product_quantity_discounts').select('product_id', { count: 'exact' }).eq('is_active', true).limit(1000).abortSignal(signal),
    ])
    if (signal.aborted) throw new Error('READINESS_TIMEOUT')
    const [loyalty, giftBalances, scheduledGifts] = await Promise.all([
      db.from('loyalty_points').select('points_balance', { count: 'exact', head: true }).abortSignal(signal),
      db.from('gift_cards').select('balance', { count: 'exact', head: true }).gt('balance', 0).eq('status', 'active').abortSignal(signal),
      db.from('gift_cards').select('scheduled_send_at', { count: 'exact', head: true }).not('scheduled_send_at', 'is', null).is('delivered_at', null).abortSignal(signal),
    ])
    const complete = (result: { error: unknown; count: number | null; data: unknown[] | null }) =>
      !result.error && result.count !== null && result.data !== null && result.count === result.data.length
    const activeIds = new Set((products.data ?? []).map((product: { id: string }) => product.id))
    const audit = auditShopifyRelease({
      products: (products.data ?? []) as AuditProduct[], variants: (variants.data ?? []) as AuditVariant[], mappings: (mappings.data ?? []) as MappedVariant[],
      complete: complete(products) && complete(variants) && complete(mappings),
    }, {
      activePromotions: complete(promotions) ? promotions.data!.filter((promo: { usage_count: number; usage_limit: number | null }) => promo.usage_limit === null || promo.usage_count < promo.usage_limit).length : null,
      activeQuantityTiers: complete(tiers) && complete(products) ? tiers.data!.filter((tier: { product_id: string }) => activeIds.has(tier.product_id)).length : null,
      loyaltyAccounts: loyalty.error ? null : loyalty.count,
      giftCardsWithBalance: giftBalances.error ? null : giftBalances.count,
      scheduledGiftCards: scheduledGifts.error ? null : scheduledGifts.count,
    })
    const inventory = await db.rpc('shopify_inventory_evidence').abortSignal(signal)
    const inventoryCheck = inventoryReadiness(inventory.error || !Array.isArray(inventory.data) ? null : inventory.data, released.error ? null : released.count, now.getTime())
    const readiness = attachReleaseAudit(summarizeReadiness(state.error ? null : state.data as IntegrationState | null, {
      mappings: mappings.error ? null : mappings.count,
      released: released.error ? null : released.count,
      pendingEvents: pending.error ? null : pending.count,
      failedEvents: failed.error ? null : failed.count,
    }, environment, now, oldest.error ? null : oldest.data?.received_at ?? null), audit)
    readiness.checks.push(inventoryCheck)
    if (inventoryCheck.status === 'missing') readiness.status = 'blocked'
    else if (inventoryCheck.status === 'unknown' && readiness.status === 'technical_checks_passed') readiness.status = 'unknown'
    return NextResponse.json(readiness, { headers })
  } catch {
    return NextResponse.json(attachReleaseAudit(summarizeReadiness(null, { mappings: null, released: null, pendingEvents: null, failedEvents: null }, environment), auditShopifyRelease(null)), { headers })
  }
}
