import { describe, expect, it } from 'vitest'
import { auditShopifyRelease, attachReleaseAudit, type CatalogEvidence, type LegacyObligations } from '@/lib/shopify-release-audit'
import { authorizeLines, type MappedVariant } from '@/lib/shopify/policy'
import type { Readiness } from '@/lib/shopify-readiness'

const obligations: LegacyObligations = { activePromotions: 0, activeQuantityTiers: 0, loyaltyAccounts: 0, giftCardsWithBalance: 0, scheduledGiftCards: 0 }
const product = { id: 'p1', is_active: true, status: 'active', is_gift_card: false, base_price: 79, sale_price: null }
const variant = { id: 'v1', product_id: 'p1', is_available: true, price_adjustment: 0, presale_enabled: false, presale_stock_quantity: 0 }
const mapping: MappedVariant = { mose_variant_id: 'v1', shopify_variant_id: 'gid://shopify/ProductVariant/1', fulfillment_owner: 'mose', supplier_model: null, supplier_link_verified: false, sample_verified: false, enabled: true, price_eur_cents: 7900 }
const catalog: CatalogEvidence = { products: [product], variants: [variant], mappings: [mapping], complete: true }
const status = (result: ReturnType<typeof auditShopifyRelease>, key: string) => result.checks.find(check => check.key === key)?.status

describe('complete-catalog Shopify release audit', () => {
  it('does not confuse one mapping with coverage of the whole active catalog', () => {
    const variants = Array.from({ length: 27 }, (_, index) => ({ ...variant, id: `v${index + 1}` }))
    const result = auditShopifyRelease({ ...catalog, variants }, obligations)
    expect(result.catalog).toMatchObject({ sellableVariants: 27, coveredVariants: 1, missingMappings: 26 })
    expect(status(result, 'catalogCoverage')).toBe('missing')
  })
  it('does not activate or require draft and explicitly unavailable variants', () => {
    const result = auditShopifyRelease({ ...catalog,
      products: [product, { ...product, id: 'draft', status: 'draft', is_active: false }],
      variants: [variant, { ...variant, id: 'v2', product_id: 'draft' }, { ...variant, id: 'v3', is_available: false }],
    }, obligations)
    expect(result.catalog.sellableVariants).toBe(1)
    expect(status(result, 'catalogCoverage')).toBe('verified')
  })
  it('checks current sale plus adjustment against reviewed cents and rejects malformed money', () => {
    const sale = { ...catalog, products: [{ ...product, sale_price: 59.95 }], variants: [{ ...variant, price_adjustment: 0.1 }], mappings: [{ ...mapping, price_eur_cents: 6005 }] }
    expect(status(auditShopifyRelease(sale, obligations), 'catalogPrices')).toBe('verified')
    expect(status(auditShopifyRelease({ ...sale, mappings: [mapping] }, obligations), 'catalogPrices')).toBe('missing')
    expect(status(auditShopifyRelease({ ...catalog, products: [{ ...product, base_price: Number.NaN }] }, obligations), 'catalogPrices')).toBe('missing')
  })
  it('detects duplicate provider IDs and unverified supplier routes', () => {
    const duplicate = { ...catalog, variants: [variant, { ...variant, id: 'v2' }], mappings: [mapping, { ...mapping, mose_variant_id: 'v2' }] }
    expect(status(auditShopifyRelease(duplicate, obligations), 'catalogCoverage')).toBe('missing')
    const supplier = { ...catalog, mappings: [{ ...mapping, fulfillment_owner: 'tapstitch' as const }] }
    expect(status(auditShopifyRelease(supplier, obligations), 'catalogRouting')).toBe('missing')
  })
  it('fails closed on truncated or failed snapshots instead of auditing a lucky subset', () => {
    const result = auditShopifyRelease({ ...catalog, complete: false }, obligations)
    expect(result.catalog.sellableVariants).toBeNull()
    expect(status(result, 'catalogCoverage')).toBe('unknown')
  })
  it('identifies active giftcard and presale contracts as concrete missing capabilities', () => {
    const result = auditShopifyRelease({ ...catalog, products: [{ ...product, is_gift_card: true }], variants: [{ ...variant, presale_enabled: true, presale_stock_quantity: 5 }] }, obligations)
    expect(status(result, 'digitalContract')).toBe('missing')
    expect(status(result, 'presaleContract')).toBe('missing')
  })
  it('cannot turn outstanding benefit obligations into approval through broad manual gates', () => {
    const result = auditShopifyRelease(catalog, { ...obligations, activePromotions: 22, loyaltyAccounts: 54 })
    expect(status(result, 'promoParity')).toBe('unknown')
    expect(status(result, 'loyaltyLedger')).toBe('missing')
    const oldReadiness: Readiness = { checkedAt: '', status: 'technical_checks_passed', checks: [{ key: 'benefits', label: 'Manual switch', status: 'verified' }], counts: { mappings: 1, released: 1, pendingEvents: 0, failedEvents: 0 }, lastWorkerAt: null, lastReconciledAt: null, oldestPendingAt: null }
    expect(attachReleaseAudit(oldReadiness, result).status).toBe('blocked')
    expect(status(auditShopifyRelease(catalog), 'giftBalanceMigration')).toBe('unknown')
  })
  it('rejects digital variants on the server even if a mapping is manually enabled', () => {
    expect(() => authorizeLines({ locale: 'nl', country: 'NL', attemptId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', lines: [{ variantId: 'v1', quantity: 1 }] }, [{ ...mapping, fulfillment_owner: 'digital' }])).toThrow('VARIANT_NOT_RELEASED')
  })
})
