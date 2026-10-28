# Checkout benefit adapter (dormant)

This is not a benefits release approval. No provider or live database mutation
was executed to develop or test it. `SHOPIFY_BENEFIT_WRITES_ENABLED` defaults off;
checkout's existing release gates remain unchanged.

## Implemented contract

- `planPromo` accepts current trusted promo rows and priced/verified catalog lines,
  preserves eligible-only minimums, sale exclusion toggle, gift-card exclusion,
  percentage/fixed caps, expiry, exhaustion and staffel prohibition. It is a
  calculation, **not** a concurrent usage reservation or Shopify promo mirror.
- After checkout creates its verified owner row, `reserveAndIssueLoyaltyDiscount`
  atomically reserves points and claims a durable one-shot issuance lease before
  the provider mutation. The caller must supply a Shopify Customer ID from a
  reviewed authenticated mapping, never a client field or guessed email match.
- The actual Admin `discountCodeBasicCreate` creates a private 24-hour, one-use,
  customer-restricted EUR fixed discount of €5 per 100 points. It targets only
  verified non-gift-card cart variants and disallows other discounts. Required
  scopes: `read_discounts`, `write_discounts` (validated against 2026-10).
- Deterministic HMAC code permits operator reconciliation of an uncertain create
  without issuing another voucher. The database retains only its hash/provider
  ID. Do not log code, cart URL, customer IDs or provider variables.
- SQL `claim_shopify_benefit` returns false on **every** subsequent claim,
  including same-lease replay. Never turn a timeout into another create.
- `complete_shopify_benefit` commits the issuance identity and existing loyalty
  worker binding together. No capability is returned before durable completion.
- Once issuance starts, a trigger prevents the existing failed-cart release RPC
  from refunding points while a live/uncertain voucher could still be used.
  There is intentionally no automatic expiry release or operator override RPC.
- `BENEFITS_CART_QUERY` and `assertCartBenefits` validate actual applicable codes,
  exact EUR allocations and eligible lines; reject unexpected/automatic discounts,
  shipping allocations and truncated connections. Uses 2026-10
  `discountAllocations(lineLevelOnly: false)` so order allocations are included
  exactly once. Do not sum deprecated `Cart.discountAllocations` with line totals.

## Integration order (root checkout route owns this)

1. Validate input, session, authenticated account, reviewed customer mapping,
   server catalog/prices/availability and current benefits; include intent in
   checkout fingerprint. Reserve checkout and create owner row.
2. Reserve/issue once with a random issuance lease and the durable checkout lease.
3. Supply only returned private code to `CartInput.discountCodes`. Carry no secret
   or raw promo into snapshots/logs. Verify cart lines as before, then fetch
   `BENEFITS_CART_QUERY` and call `assertCartBenefits` before returning URL.
4. Persist ready only after both checks. Any uncertain create/binding/cart remains
   blocked/unknown for reconciliation. Do not release points on expiry.
5. Authoritative paid/refund worker checks bound actual discount identity and
   cumulative settlements using existing ledger/outbox; test real provider flows.

## Still blocks full cutover

- Customer mapping and customer-owned Shopify hosted-checkout identity must be
  established with supported Shopify authentication. A Supabase user ID is not
  a Shopify customer credential. Do not weaken account matching to make a test pass.
- Promo global usage needs atomic reservations across legacy and Shopify writers,
  stale promo changes/deactivation, remaining provider uses and one-customer
  restrictions. A `usageCount` calculation or per-attempt single-use voucher does
  not provide these guarantees.
- Loyalty tier discounts stack under current legacy semantics; this initial
  redemption voucher disallows stacking. Do not claim tier or promo+loyalty
  parity, or enable it in those cases until exact allocation rules are implemented.
- Product quantity tiers, partial returns that lose their tier, gift cards,
  shipping thresholds and discounts entered after hosted redirect still need
  complete end-to-end parity and authoritative payment checks.
- Safe operator reconciliation/deactivation and explicit point restoration for
  abandoned issued vouchers still needs a reviewed workflow. Held points are
  visible liabilities, not automatically expired balances.
- Live app scope approval, SQL migration review/application and actual test-mode
  provider creates/cart allocations/settlements must precede runtime activation.

## Validation

`npm test -- tests/lib/shopify-benefits.test.ts` (10 tests)

`MOSE_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node tests/lib/shopify-benefit-issuance-check.mjs`
(20 local PostgreSQL assertions; minimal dependency fixture, actual migration.)

Admin mutation and Storefront query both validated with Shopify AI Toolkit's
2026-10 schema. Variables also follow the official inputs:

- https://shopify.dev/docs/api/admin-graphql/2026-10/input-objects/DiscountCodeBasicInput
- https://shopify.dev/docs/api/admin-graphql/2026-10/input-objects/DiscountContextInput
- https://shopify.dev/docs/api/admin-graphql/2026-10/input-objects/DiscountAmountInput
- https://shopify.dev/docs/api/storefront/2026-10/interfaces/BaseCartLine
