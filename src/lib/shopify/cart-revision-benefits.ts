import { createHash, createHmac } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { groupQuantityBenefits } from './benefit-quote'
import type { readCheckoutBenefitQuote } from './checkout-benefits'
import { promoSnapshot } from './promo-reservation'

type Prepared = Awaited<ReturnType<typeof readCheckoutBenefitQuote>>
type Quote = Prepared['quote']

/** Reuse issued codes and holds. Never issue or release a capability as a
 * side effect of editing the merchandise of an already payable cart. */
export async function existingCartBenefits(db: SupabaseClient, input: {
  attemptId: string; secret: string; prior: Quote; orderWidePromo?: boolean; next: Prepared
}) {
  const { attemptId, secret, prior, next } = input
  const { quote } = next
  if (prior.discountCents === 0 && quote.discountCents === 0) return []
  const reject = () => { throw new Error('CART_REVISION_BENEFITS_CHANGED') }
  if (prior.redemptionCents !== quote.redemptionCents || prior.tier !== quote.tier ||
      Boolean(prior.tierCents) !== Boolean(quote.tierCents) || Boolean(prior.promo) !== Boolean(quote.promo)) reject()
  const code = (prefix: string, key: string) => `MOSE-${prefix}-${createHmac('sha256', secret).update(key).digest('hex').toUpperCase()}`
  const physical = next.lines.filter(line => !line.giftCard).map(line => line.variantId)
  const expected: { code: string; discountCents: number; eligibleVariants: string[] }[] = []
  if (quote.promo && prior.promo && next.promo) {
    const promoCode = code('P', `promo:v1:${attemptId}`)
    const held = await db.from('shopify_promo_reservations').select('promo_id,promo_snapshot,discount_cents,code_hash,status,provider_discount_id')
      .eq('attempt_id', attemptId).maybeSingle()
    const hold = held.data
    const snapshot = promoSnapshot(next.promo)
    const expiry = (value: unknown) => typeof value === 'string' ? Date.parse(value) : null
    const samePolicy = Object.entries(snapshot).every(([key, value]) => key === 'expires_at'
      ? expiry(hold?.promo_snapshot?.[key]) === expiry(value)
      : hold?.promo_snapshot?.[key] === value)
    if (held.error || hold?.status !== 'reserved' || !hold.provider_discount_id || hold.promo_id !== quote.promo.promoId ||
        (next.promo.discount_type !== 'percentage' && hold.discount_cents !== quote.promo.discountCents) || hold.code_hash !== createHash('sha256').update(promoCode).digest('hex') ||
        !samePolicy ||
        (!(input.orderWidePromo === true && next.orderWidePromo) &&
          quote.promo.eligibleVariants.some(variant => !prior.promo!.eligibleVariants.includes(variant)))) reject()
    expected.push({ code: promoCode, discountCents: quote.promo.discountCents, eligibleVariants: quote.promo.eligibleVariants })
  }
  const oldGroups = groupQuantityBenefits(prior.staffel)
  const newGroups = groupQuantityBenefits(quote.staffel)
  const signature = (group: typeof oldGroups[number]) => group.eligibleVariants.join(',')
  if (newGroups.length !== oldGroups.length || newGroups.some(group =>
    !oldGroups.some(old => old.perItemCents === group.perItemCents && signature(old) === signature(group)))) reject()
  for (const group of newGroups) {
    const component = 'staffel:' + createHash('sha256').update(signature(group)).digest('hex').slice(0, 16)
    expected.push({ code: code('A', `automatic:v1:${attemptId}:${component}`), discountCents: group.totalCents, eligibleVariants: group.eligibleVariants })
  }
  if (quote.tierCents > 0) expected.push({ code: code('A', `automatic:v1:${attemptId}:tier`), discountCents: quote.tierCents, eligibleVariants: physical })
  if (quote.redemptionCents > 0) {
    const loyaltyCode = code('L', `loyalty:v1:${attemptId}`)
    const [hold, binding] = await Promise.all([
      db.from('shopify_loyalty_reservations').select('status,points').eq('attempt_id', attemptId).maybeSingle(),
      db.from('shopify_loyalty_discount_bindings').select('code_hash,provider_discount_id').eq('attempt_id', attemptId).maybeSingle(),
    ])
    if (hold.error || binding.error || hold.data?.status !== 'reserved' || hold.data.points !== next.points ||
        !binding.data?.provider_discount_id || binding.data.code_hash !== createHash('sha256').update(loyaltyCode).digest('hex')) reject()
    expected.push({ code: loyaltyCode, discountCents: quote.redemptionCents, eligibleVariants: physical })
  }
  return expected
}
