import type { Readiness, ReadinessCheck } from '@/lib/shopify-readiness'
import { PILOT_MODELS, type MappedVariant } from '@/lib/shopify/policy'
import { localVariantPriceCents } from '@/lib/shopify/local-checkout'
import { TAPSTITCH_PRODUCT_SOURCES } from '@/lib/tapstitch-products'

export type AuditProduct = {
  id: string; is_active: boolean | null; status: string | null; is_gift_card: boolean
  base_price: number; sale_price: number | null
}
export type AuditVariant = {
  id: string; product_id: string; is_available: boolean | null; price_adjustment: number | null
  presale_enabled: boolean; presale_stock_quantity: number
}
export type CatalogEvidence = {
  products: AuditProduct[]; variants: AuditVariant[]; mappings: MappedVariant[]
  /** False for errors, truncated reads or unavailable exact counts. */
  complete: boolean
}
export type LegacyObligations = {
  activePromotions: number | null
  activeQuantityTiers: number | null
  loyaltyAccounts: number | null
  giftCardsWithBalance: number | null
  scheduledGiftCards: number | null
}
export const UNKNOWN_OBLIGATIONS: LegacyObligations = {
  activePromotions: null, activeQuantityTiers: null, loyaltyAccounts: null,
  giftCardsWithBalance: null, scheduledGiftCards: null,
}
export type ReleaseRuntimeEvidence = {
  /** From runtimeReadiness: installed atomic writer contract, reviewed cutover,
   * fresh worker heartbeat, no dead letters, and no stale pending work. */
  loyaltyRuntime: ReadinessCheck['status']
}
export type ReleaseAudit = {
  checks: ReadinessCheck[]
  catalog: { activeProducts: number | null; sellableVariants: number | null; coveredVariants: number | null; missingMappings: number | null; priceMismatches: number | null }
  obligations: LegacyObligations
}
const check = (key: string, label: string, status: ReadinessCheck['status']): ReadinessCheck => ({ key, label, status })

export function auditShopifyRelease(catalog: CatalogEvidence | null, obligations: LegacyObligations = UNKNOWN_OBLIGATIONS, runtime?: ReleaseRuntimeEvidence): ReleaseAudit {
  const complete = catalog?.complete === true
  const products = catalog?.products.filter(product => product.is_active === true && product.status === 'active') ?? []
  const active = new Map(products.map(product => [product.id, product]))
  const variants = catalog?.variants.filter(variant => active.has(variant.product_id) && variant.is_available === true) ?? []
  let missingMappings = 0, priceMismatches = 0
  const coveredIds = new Set<string>(), mappedIds = new Set<string>()
  let duplicateMappings = false, supplierUnverified = false
  for (const variant of variants) {
    const mappings = catalog!.mappings.filter(mapping => mapping.mose_variant_id === variant.id && mapping.enabled === true)
    if (mappings.length !== 1) { missingMappings++; continue }
    const mapping = mappings[0]
    if (mappedIds.has(mapping.shopify_variant_id)) duplicateMappings = true
    mappedIds.add(mapping.shopify_variant_id)
    if (!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(mapping.shopify_variant_id)) { missingMappings++; continue }
    const product = active.get(variant.product_id)!
    const cents = localVariantPriceCents(product, variant)
    if (cents === null || cents <= 0 || mapping.price_eur_cents !== cents) priceMismatches++
    if (!['mose', 'tapstitch'].includes(mapping.fulfillment_owner) ||
      (mapping.fulfillment_owner === 'tapstitch' && (!mapping.supplier_link_verified || !mapping.sample_verified || !PILOT_MODELS.some(model => model === mapping.supplier_model)))) supplierUnverified = true
    const supplierSource = TAPSTITCH_PRODUCT_SOURCES[product.id]
    if (supplierSource && (mapping.fulfillment_owner !== 'tapstitch' || mapping.supplier_model !== supplierSource.sourceCode)) supplierUnverified = true
    coveredIds.add(variant.id)
  }
  const unknown = !complete
  const checks = [
    check('catalogCoverage', 'Iedere actieve verkoopbare MOSE-variant heeft één vrijgegeven Shopify-koppeling', unknown ? 'unknown' : variants.length > 0 && missingMappings === 0 && !duplicateMappings ? 'verified' : 'missing'),
    check('catalogPrices', 'Alle actieve variantprijzen komen tot op de cent overeen met de koppeling', unknown ? 'unknown' : missingMappings === 0 && priceMismatches === 0 ? 'verified' : 'missing'),
    check('catalogRouting', 'Alle actieve varianten hebben een geverifieerde fysieke fulfillmentroute', unknown ? 'unknown' : missingMappings === 0 && !supplierUnverified ? 'verified' : 'missing'),
    check('digitalContract', 'Geen actieve cadeaubonverkoop zonder ondersteund digitaal checkoutcontract', unknown ? 'unknown' : products.some(product => product.is_gift_card) ? 'missing' : 'verified'),
    check('presaleContract', 'Geen actieve presalevoorraad zonder aparte Shopify-leverbelofte', unknown ? 'unknown' : variants.some(variant => variant.presale_enabled && variant.presale_stock_quantity > 0) ? 'missing' : 'verified'),
  ]
  // These checks deliberately do not inherit a broad benefits_verified switch.
  // Loyalty now has a measured writer/worker contract. Discount settlement health
  // alone does not prove parity for every legacy promotion or quantity rule.
  const obligation = (key: string, label: string, count: number | null, unsupported: boolean) =>
    check(key, label, count === null || !Number.isSafeInteger(count) || count < 0 ? 'unknown' : count === 0 ? 'verified' : unsupported ? 'missing' : 'unknown')
  checks.push(
    obligation('promoParity', 'Bestaande geldige kortingscodes hebben bewezen Shopify-pariteit', obligations.activePromotions, false),
    obligation('quantityParity', 'Bestaande actieve staffels hebben bewezen Shopify-pariteit', obligations.activeQuantityTiers, false),
    check('loyaltyLedger', 'Shopify-aankopen en refunds boeken bestaande loyaliteit precies één keer',
      obligations.loyaltyAccounts === null || !Number.isSafeInteger(obligations.loyaltyAccounts) || obligations.loyaltyAccounts < 0
        ? 'unknown' : obligations.loyaltyAccounts === 0 ? 'verified' : runtime?.loyaltyRuntime ?? 'missing'),
    obligation('giftBalanceMigration', 'Bestaande cadeaubonsaldi hebben één bewezen besteedbare bron', obligations.giftCardsWithBalance, true),
    obligation('giftDeliveryOwner', 'Geplande cadeaubonnen hebben één bewezen bezorgeigenaar', obligations.scheduledGiftCards, true),
  )
  return {
    checks, obligations,
    catalog: {
      activeProducts: complete ? products.length : null, sellableVariants: complete ? variants.length : null,
      coveredVariants: complete ? coveredIds.size : null, missingMappings: complete ? missingMappings : null,
      priceMismatches: complete ? priceMismatches : null,
    },
  }
}

/** Counts and manual gates never override missing measured release evidence. */
export function attachReleaseAudit(readiness: Readiness, audit: ReleaseAudit): Readiness & { releaseAudit: ReleaseAudit } {
  const checks = [...readiness.checks, ...audit.checks]
  return {
    ...readiness, checks, releaseAudit: audit,
    status: checks.some(item => item.status === 'missing') ? 'blocked' : checks.some(item => item.status === 'unknown') ? 'unknown' : 'technical_checks_passed',
  }
}
