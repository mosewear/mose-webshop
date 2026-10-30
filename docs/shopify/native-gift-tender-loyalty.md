# Native Shopify gift tender and loyalty

A native Shopify gift card is a payment instrument. Its redemption is not an
order discount and must not create another cash-based points award. New gift
card purchases paid with external cash continue to earn points as legacy MOSE
purchases did.

The payment adapter proves the complete order using all successful SALE/CAPTURE
and REFUND amounts, including native `gift_card` transactions. Those totals must
match independent Admin received, original/current paid, refunded and outstanding
amounts. Exact transaction count, unique IDs, EUR shop/presentment equality,
non-test orders and non-manual payment gateways remain required. Store credit,
bogus gateways and gift-like lookalike gateway names remain unsupported.

Only external cash captures and external cash refunds populate
`eligiblePaidCents` and `eligibleRefundedCents`. Thus a €15.99 order funded with
€10.99 cash and €5 gift credit earns on €10.99. A €2 refund to the gift card
reverses no earned cash points; a €1.99 cash refund reverses €1.99 of eligible
cash spend. Each successful refund must identify a successful SALE/CAPTURE in the
same complete response through `parentTransaction.id`, use the same tender class
and remain within that original payment's cumulative amount.

Restoration of previously redeemed loyalty-discount points is a separate
calculation: it remains proportional to the total order refund across all
tenders. A full refund restores those previously used points even when the
purchase was funded entirely with gift credit. That does not manufacture earned
cash points. A truly zero-paid order with a loyalty redemption retains its
existing unsupported contract and fails closed.

The adapter does not issue, redeem, top up, debit or refund gift balances. Shopify
owns native balances and fulfillment. Existing MOSE gift balances remain a
separate migration condition; no duplicate native balance is created here.

The query adds only `parentTransaction { id }`, under the existing `read_orders`
access. It requests no gift codes or payment instrument details and no Plus-only
settlement fields. See Shopify's [OrderTransaction definition](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/OrderTransaction).

Validation covers mixed and all-gift tender, external/gift partial and full
refunds, wrong/missing refund parents, over-refund, incomplete independent totals,
unsupported gateways and cumulative loyalty-discount restoration. These are
synthetic verification cases, not claims that a real native gift payment/refund
was performed.
