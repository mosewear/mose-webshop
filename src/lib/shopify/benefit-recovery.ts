import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { admin } from './client'

export const RECOVERY_DISCOUNT_QUERY = `query MoseRecoveryDiscount($id: ID!) {
  codeDiscountNode: node(id: $id) { ... on DiscountCodeNode { id codeDiscount { __typename ... on DiscountCodeBasic {
    status asyncUsageCount codes(first: 2) { pageInfo { hasNextPage } nodes { code } }
  } } } }
}`
export const DEACTIVATE_RECOVERY_DISCOUNT = `mutation MoseRecoveryDeactivate($id: ID!) {
  discountCodeDeactivate(id: $id) { codeDiscountNode { id } userErrors { field code message } }
}`
const providerId = z.string().regex(/^gid:\/\/shopify\/DiscountCodeNode\/[1-9][0-9]*$/)
const codeHash = z.string().regex(/^[a-f0-9]{64}$/)
const recoveryState = z.object({
  attemptId: z.string().uuid(), proofToken: z.string().uuid(), recoveredAt: z.string().nullable(),
  coupons: z.array(z.object({ providerId, codeHash })).min(1).max(5),
})

/** Call ONLY for the actual CartCreate response cart=null AND nonempty
 * userErrors. A timeout, thrown fetch, null read or absent order is not proof.
 * Keep the returned token server-only. This moves the attempt to unknown so
 * the outer failure handler cannot overwrite its definitive rejection fact. */
export async function recordDefinitiveNoCart(db: SupabaseClient, input: { attemptId: string; checkoutLease: string }) {
  const result = await db.rpc('record_shopify_no_cart', { p_attempt: input.attemptId, p_checkout_lease: input.checkoutLease })
  if (result.error) throw new Error('NO_CART_PROOF_UNCONFIRMED')
  return z.string().uuid().parse(result.data)
}

async function readProviderDiscount(coupon: { providerId: string; codeHash: string }) {
  const raw = await admin<unknown>(RECOVERY_DISCOUNT_QUERY, { id: coupon.providerId })
  const result = z.object({ codeDiscountNode: z.object({ id: providerId, codeDiscount: z.object({
    __typename: z.literal('DiscountCodeBasic'), status: z.enum(['ACTIVE','SCHEDULED','EXPIRED']),
    asyncUsageCount: z.number().int().nonnegative(),
    codes: z.object({ pageInfo: z.object({ hasNextPage: z.literal(false) }), nodes: z.array(z.object({ code: z.string() })).length(1) }),
  }) }).nullable() }).parse(raw).codeDiscountNode
  // Missing is uncertain: never infer successful deletion or failed creation.
  if (!result || result.id !== coupon.providerId || createHash('sha256').update(result.codeDiscount.codes.nodes[0].code).digest('hex') !== coupon.codeHash)
    throw new Error('RECOVERY_PROVIDER_IDENTITY_UNCONFIRMED')
  return result.codeDiscount
}

/** Operator-only server service; caller must authorize an administrator.
 * This revokes only vouchers tied to a durable definitive no-cart proof. It
 * never cancels an order/payment and never releases an unknown payable cart.
 * Any failed/read/used/missing coupon leaves every financial hold intact. */
export async function recoverRejectedBenefits(db: SupabaseClient, attemptId: string, options: { deadline?: number } = {}) {
  if (process.env.SHOPIFY_BENEFIT_RECOVERY_ENABLED !== 'true') throw new Error('BENEFIT_RECOVERY_DISABLED')
  z.string().uuid().parse(attemptId)
  const read = await db.rpc('shopify_benefit_recovery_state', { p_attempt: attemptId })
  if (read.error) throw new Error('RECOVERY_STATE_UNAVAILABLE')
  const state = recoveryState.parse(read.data)
  if (state.attemptId !== attemptId) throw new Error('RECOVERY_STATE_MISMATCH')
  if (state.recoveredAt) return { recovered: true, revoked: state.coupons.length }
  const deadline = Math.min(options.deadline ?? Date.now() + 90_000, Date.now() + 270_000)
  let revoked = 0
  for (const coupon of state.coupons) {
    if (Date.now() + 46_000 >= deadline) throw new Error('RECOVERY_CONTINUE_REQUIRED')
    let discount = await readProviderDiscount(coupon)
    // asyncUsageCount is only an additional rejection check; no-cart protocol
    // proof supplies the causal evidence that no server checkout can be paid.
    if (discount.asyncUsageCount !== 0) throw new Error('RECOVERY_PROVIDER_USE_EXISTS')
    if (discount.status !== 'EXPIRED') {
      const raw = await admin<unknown>(DEACTIVATE_RECOVERY_DISCOUNT, { id: coupon.providerId })
      const changed = z.object({ discountCodeDeactivate: z.object({
        codeDiscountNode: z.object({ id: providerId }).nullable(), userErrors: z.array(z.unknown()),
      }) }).parse(raw).discountCodeDeactivate
      if (changed.userErrors.length || changed.codeDiscountNode?.id !== coupon.providerId) throw new Error('RECOVERY_REVOCATION_UNCONFIRMED')
    }
    // Always read after mutation/expired observation. A successful mutation
    // response or elapsed timestamp alone cannot release a liability.
    discount = await readProviderDiscount(coupon)
    if (discount.status !== 'EXPIRED' || discount.asyncUsageCount !== 0) throw new Error('RECOVERY_REVOCATION_UNCONFIRMED')
    const saved = await db.rpc('record_shopify_benefit_revocation', {
      p_attempt: attemptId, p_proof: state.proofToken, p_provider: coupon.providerId, p_code_hash: coupon.codeHash,
    })
    if (saved.error || saved.data !== true) throw new Error('RECOVERY_EVIDENCE_UNCONFIRMED')
    revoked++
  }
  const completed = await db.rpc('complete_shopify_benefit_recovery', { p_attempt: attemptId, p_proof: state.proofToken })
  if (completed.error || completed.data !== 'recovered') throw new Error('RECOVERY_RELEASE_UNCONFIRMED')
  return { recovered: true, revoked }
}

/** Read-only aggregate monitor, no codes, emails, customer IDs or cart URLs. */
export async function readBenefitLiabilities(db: SupabaseClient) {
  const result = await db.rpc('shopify_benefit_liabilities')
  if (result.error) throw new Error('BENEFIT_LIABILITIES_UNAVAILABLE')
  return z.object({
    heldPoints: z.number().int().nonnegative(), heldPointReservations: z.number().int().nonnegative(),
    heldPromoUses: z.number().int().nonnegative(), oldestHeldPointsAt: z.string().nullable(), oldestHeldPromoAt: z.string().nullable(),
    definitiveNoCartAwaitingRecovery: z.number().int().nonnegative(), unknownCheckoutAttempts: z.number().int().nonnegative(),
    unresolvedLoyaltyIssuance: z.number().int().nonnegative(), unresolvedPromoIssuance: z.number().int().nonnegative(),
    unresolvedAutomaticIssuance: z.number().int().nonnegative(),
  }).parse(result.data)
}

export async function listBenefitRecoveries(db: SupabaseClient) {
  const result = await db.rpc('shopify_benefit_recovery_candidates')
  if (result.error) throw new Error('BENEFIT_RECOVERY_LIST_UNAVAILABLE')
  return z.array(z.object({ attemptId: z.string().uuid(), createdAt: z.string(), noCartProven: z.boolean(), recovered: z.boolean() })).max(100).parse(result.data)
}
