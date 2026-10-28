import { z } from 'zod'
import { admin } from './client'
import { loyaltyDiscountPlan } from './benefits'

export const CREATE_LOYALTY_DISCOUNT = `mutation MoseLoyaltyDiscount($input: DiscountCodeBasicInput!) {
  discountCodeBasicCreate(basicCodeDiscount: $input) {
    codeDiscountNode { id }
    userErrors { field code message }
  }
}`
/** The caller must hold a durable, one-shot issuance lease, after reserving
 * points. An exception is an UNKNOWN issuance outcome, never permission to
 * retry or release points. Confirm provider deactivation before any release.
 * Call only after resolving the Shopify customer from verified account mapping.
 * No default runtime caller: the new write_discounts grant and test are required. */
export async function issueLoyaltyDiscount(plan: ReturnType<typeof loyaltyDiscountPlan>) {
  if (process.env.SHOPIFY_BENEFIT_WRITES_ENABLED !== 'true') throw new Error('BENEFIT_WRITES_DISABLED')
  const raw = await admin<unknown>(CREATE_LOYALTY_DISCOUNT, { input: plan.basicCodeDiscount })
  const result = z.object({ discountCodeBasicCreate: z.object({
    codeDiscountNode: z.object({ id: z.string().regex(/^gid:\/\/shopify\/DiscountCodeNode\/[1-9][0-9]*$/) }).nullable(),
    userErrors: z.array(z.unknown()),
  }) }).parse(raw).discountCodeBasicCreate
  if (result.userErrors.length || !result.codeDiscountNode) throw new Error('BENEFIT_ISSUANCE_UNCONFIRMED')
  return { provider_discount_id: result.codeDiscountNode.id, code_hash: plan.codeHash }
}

/** Atomically fences the one provider mutation and persists its verified identity.
 * The owner row is created by checkout after auth; userId never comes from JSON.
 * A second call cannot issue another discount, even with the same lease. */
export async function reserveAndIssueLoyaltyDiscount(
  db: import('@supabase/supabase-js').SupabaseClient,
  input: Parameters<typeof loyaltyDiscountPlan>[0] & { userId: string; checkoutLease: string; issuanceLease: string },
) {
  if (process.env.SHOPIFY_BENEFIT_WRITES_ENABLED !== 'true') throw new Error('BENEFIT_WRITES_DISABLED')
  const plan = loyaltyDiscountPlan(input)
  const reserved = await db.rpc('reserve_shopify_loyalty', { p_attempt: input.attemptId, p_user: input.userId, p_points: input.points })
  if (reserved.error || reserved.data !== 'reserved') throw new Error('BENEFIT_RESERVATION_UNCONFIRMED')
  const claim = await db.rpc('claim_shopify_benefit', {
    p_attempt: input.attemptId, p_checkout_lease: input.checkoutLease, p_issuance_lease: input.issuanceLease, p_code_hash: plan.codeHash,
  })
  if (claim.error || claim.data !== true) throw new Error('BENEFIT_ISSUANCE_ALREADY_PENDING')
  const binding = await issueLoyaltyDiscount(plan)
  const saved = await db.rpc('complete_shopify_benefit', {
    p_attempt: input.attemptId, p_issuance_lease: input.issuanceLease, p_provider_id: binding.provider_discount_id,
  })
  if (saved.error || saved.data !== true) throw new Error('BENEFIT_BINDING_UNCONFIRMED')
  return { code: plan.code, discountCents: plan.discountCents, eligibleVariants: plan.basicCodeDiscount.customerGets.items.products.productVariantsToAdd }
}
