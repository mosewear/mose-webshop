# Server-owned Shopify benefits adapter (default off)

No live DB/provider mutation was used to develop this adapter. Schema validation
and local tests do not constitute provider combination or release approval.

## Checkout integration

1. Current server-authorized mapped lines must be extended with trusted
   `productId`, `giftCard` and `onSale`. Call
   `readCheckoutBenefitQuote(db, {lines, promoCode, user, points})` **before**
   reserving the checkout. `user` must be `auth.getUser()` output. No client
   email, customer ID, prices, tier or computed discount is accepted.
2. Include canonical benefits intent/quote in the attempt fingerprint, alongside
   catalog lines and authenticated user ID. Do not store/log the prepared object:
   it contains the private source promo row and authenticated email. Its public
   quote has cents and product identities, not a coupon capability.
3. Reserve checkout and insert authenticated owner row as usual. Then call
   `issueCheckoutBenefits(db, {...prepared, attemptId, checkoutLease, secret})`.
   It returns expected `{code, discountCents, eligibleVariants}[]` only after each
   provider identity is durably bound. Supply codes as `CartInput.discountCodes`.
4. Verify original lines, quantities and prices as before. Fetch
   `BENEFITS_CART_QUERY` via Storefront with cart ID and buyer IP, then
   `assertCartBenefits(result.cart, expected)` before persisting/returning URL.
   An applicable status alone is insufficient. Every EUR allocation, eligible
   line and code must match; automatic/unexpected/shipping allocations and
   truncated connections are rejected. Uses 2026-10
   `discountAllocations(lineLevelOnly: false)` to include order discounts once.
5. Any ambiguous issuer/cart/binding outcome remains blocked for reconciliation.
   Never create another voucher/cart or release held points/uses on timeout.
   Existing checkout/session/ownership/readiness gates remain required.

## Actual source semantics

- Promo minimums count only eligible merchandise. Gift cards never participate;
  sale items participate only when source toggle permits. Percentage/fixed caps,
  expiry, remaining usage and promo-versus-staffel exclusion are preserved.
- Quantity tiers group quantities across product variants, then calculate the
  source per-unit rounded saving. Sale products receive no quantity discount.
- Loyalty tier percentage uses the subtotal **after staffel but before promo**.
  Tier, promo and point redemption can stack under existing source rules.
- Native order-percentage combinations each use the original order subtotal.
  Thus an all-eligible promo is an ORDER percentage, tier is ORDER percentage,
  redemption is ORDER fixed amount applied after percentages. Codes mutually
  allow order/product classes, with shipping excluded. No Shopify Plus feature
  is required for this native combination, subject to store eligibility and
  actual provider verification.
- When source promo excludes sale items, order-wide targeting requires a checked
  query proving no active sale merchandise anywhere in the local public catalog.
  Otherwise target only eligible variants. A product-specific promo with tier
  percentage would change source tier arithmetic, so that future case is
  explicitly blocked by `MIXED_SALE_TIER_PARITY_REQUIRED`.
- Staffel components are specific-variant fixed per-item product discounts;
  automatic tier components are verified-customer order percentages. At most
  five product/order codes are issued; larger future tier configurations fail
  with `BENEFIT_CODE_LIMIT` instead of silently dropping a saving.
- Native fixed redemption is €5 per reserved 100 points, bound to verified
  Shopify customer. Fully discounted redemption baskets remain unsupported by
  the existing paid/refund loyalty settlement contract; do not enable them.

## Identity and issuance

`bindAuthenticatedShopifyCustomer` receives only a verified Supabase user with
confirmed email. Shopify `customerSet` upserts by that email, changes no address,
name or marketing consent, checks returned email/ID, and saves an immutable
private user/customer/email-HMAC binding via migration 008. Email changes require
reviewed rebinding. This does not create a Shopify customer login/token: hosted
checkout retains final buyer identity/authentication. Supply the verified email
as buyer identity when appropriate and prove customer-specific discounts in the
actual hosted checkout before cutover.

Migration 007 fences loyalty voucher issuance; migration 010 fences promo and
automatic components. Every provider mutation requires a one-shot durable
claim. Stable HMAC capabilities contain no user/promo identity. Replays do not
issue again, even with the same lease. SQL retains only hashes/provider IDs.
A trigger prevents failed-cart point release once a live/unknown voucher exists.

## Shared promo cap and legacy preservation

Migration 010 locks the source promo row for each reservation/consumption and
counts `usage_count + pending Shopify holds`. The last use cannot be reserved by
Shopify and atomically committed by legacy simultaneously. A paid consumption
increments source usage once and removes that hold from the pending count.
Refunds do not restore a single-use welcome code. Unknown provider states retain
the hold without TTL expiry.

With `ATOMIC_PROMO_ENABLED=true`, the legacy checkout uses
`create_legacy_promo_order`: fresh snapshot/cap validation, order insert with
normal database defaults/triggers, usage increment and usage event all commit
in one PostgreSQL transaction. It never falls back to an untracked order after
an uncertain RPC. The existing duplicate-order guard and late Mollie callbacks
remain. `promo-code-utils` has a shared-lock idempotent historical usage path;
existing usage records are never counted twice. Default-off legacy behavior is
unchanged until the migration and all writers are reviewed/deployed together.

## Guest-safe authoritative settlement

Migration 010 also creates a separate promo benefit outbox. It queues only
new, attributed unified-checkout paid/refund snapshots after a reviewed cutoff;
no loyalty/customer row is required, so guest promo orders are accounted for.

`runBenefitWorker` fetches authoritative Admin order data, matches exact order
version, source/attempt attributes, non-test paid/refund EUR status, private code
hash and exact line allocations. Shipping allocations, truncation, mismatched
codes/amounts and pending payment fail closed. SQL checks source attribution and
paid snapshot again, then consumes source promo usage and acknowledges the
current version/lease in one transaction. Newer snapshots invalidate old leases.
Retries back off; exhausted jobs dead-letter. Access denial closes checkout.

`GET /api/cron/shopify-benefits` requires CRON_SECRET, returns a no-store skipped
response without DB/provider access while disabled, and needs
`SHOPIFY_BENEFIT_SYNC_ENABLED=true` plus `ATOMIC_PROMO_ENABLED=true` to run.
Root integration must add its five-minute schedule and check
`shopify_benefits_health()` freshness, queue age and zero dead letters.
Loyalty earning/refund remains on its separate existing atomic ledger/outbox.

## Deployment and remaining proof

Flags default off: `SHOPIFY_BENEFIT_WRITES_ENABLED`,
`SHOPIFY_CUSTOMER_BINDING_ENABLED`, `ATOMIC_PROMO_ENABLED`,
`SHOPIFY_BENEFIT_SYNC_ENABLED`. New approved app scopes: `read_discounts`,
`write_discounts`, `read_customers`, `write_customers`; protected customer data
access must actually be available. CLI tokens are never backend credentials.

Before enabling checkout: reviewed migrations/RLS, all shared legacy writers,
actual customer identity/discount combinations and allocation cents, max-code
handling, paid/partial/full refund replays, missed webhooks/reconcile, old Mollie
callbacks and safe rollout/rollback need integration proof. Public gift-card
balances and shipping thresholds require their own parity gates. Private sample
supplier code remains separate from MOSE retail promo codes.

There is intentionally no automatic hold-release override. An operator workflow
must prove provider deactivation/expiry and absence of a payable/order outcome
before restoring abandoned-voucher liabilities. A timeout or age alone is not
proof. Future active quantity tiers also require provider tests for quantity
changes/partial-return tier loss before marking that configuration ready.

## Verification

Unit/integration test files cover quotes, identity, issuance, exact allocations,
paid/refund settlement and guest worker. Three local PGlite scripts exercise
actual SQL with minimal dependency fixtures: benefit issuance (20 assertions),
customer binding (11) and shared promo/outbox (31). They never connect to live
services. All Admin/Storefront operations validate against Shopify 2026-10.

Official references:
- https://help.shopify.com/en/manual/discounts/discount-combinations
- https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/customerSet
- https://shopify.dev/docs/api/admin-graphql/2026-10/input-objects/DiscountCodeBasicInput
- https://shopify.dev/docs/api/admin-graphql/2026-10/input-objects/DiscountContextInput
- https://shopify.dev/docs/api/admin-graphql/2026-10/input-objects/DiscountAmountInput
- https://shopify.dev/docs/api/storefront/2026-10/interfaces/BaseCartLine

## Definitive rejected-cart recovery (migration 011)

Only the backend's actual `CartCreate` response `{cart:null,userErrors:[...]}`
can establish no-cart proof. At that branch, if vouchers were issued, call
`recordDefinitiveNoCart(db,{attemptId,checkoutLease})`. It records the original
lease's protocol fact and atomically changes the attempt to `unknown` with
`BENEFIT_CART_REJECTED`. Keep its proof token server-only. The ordinary outer
failure handler cannot overwrite that fact because it updates only `creating`.

A transport failure, unknown issuer response, absent order search, expired age,
missing provider object or `asyncUsageCount=0` is **never** no-cart proof. Those
attempts remain held and are listed for manual investigation, not automatically
restored. No endpoint allows an administrator browser to invent this proof.

`GET /api/admin/shopify/benefits` is admin-only/private/no-store and returns
aggregate held points/promo uses, oldest timestamps, unresolved issuer counts
and at most 100 unknown attempt references with their no-cart proof status.
It performs no provider writes and works while recovery is disabled.

With `SHOPIFY_BENEFIT_RECOVERY_ENABLED=true`, an authenticated same-origin admin
may `POST /api/admin/shopify/benefits` with `{attemptId}`. The operator service:

1. Requires the pre-existing definitive no-cart proof and all provider IDs/hash
   bindings. Unresolved issuance prevents recovery before any provider action.
2. Reads each exact private coupon via Admin Node API; verifies Basic type,
   unique code hash and zero uses. Missing/wrong/used objects block recovery.
3. Deactivates each active/scheduled coupon, then reads its exact identity again
   to verify EXPIRED and zero uses. An already-expired observation is re-read too.
   Async zero usage is only an additional rejection check; causal no-cart proof
   is the reason a server checkout cannot remain payable.
4. Records recent verified revocations. SQL requires **every** associated loyalty,
   promo and automatic coupon, plus no stored cart URL/ID and no attributed order.
5. In one transaction marks the attempt failed, restores reserved points through
   the existing idempotent ledger and releases the pending promo use. Repeating
   completion never restores points or source uses twice.

The operator run is bounded; incomplete work retains every financial hold and
can be continued. The five-minute freshness requirement is for provider evidence,
not a hold expiry. No real order/payment is cancelled, no supplier/sample coupon
is changed, and no uncertain payable cart is abandoned automatically.

The recovery provider read/deactivation operations validate against 2026-10.
Tests add seven service cases, four admin-route cases and 30 PostgreSQL assertions
using the actual original ledger/issuance/promo/recovery migrations.
