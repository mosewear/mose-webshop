# Shopify loyalty ledger — additive, dormant foundation

This implementation does not turn on checkout, benefits or synchronization. The
migrations create empty private tables and service-role RPCs. They do not change,
recalculate, backfill or replace any existing loyalty balance/history. Existing
legacy routes keep their existing behavior. Local SQL verification seeds 54
accounts with a combined opening balance of 6,104 points and asserts every row
is identical before and after migration. That is a fixture, not a live DB audit.

## Server integration contract

1. After server-side authentication and durable `shopify_checkout_owners`
   creation, reserve a whole number of 100-point units with
   `reserve_shopify_loyalty(attempt_id, authenticated_user_id, points)`. It must
   run before cart creation. The account comes from the verified user's email;
   a customer-supplied email never chooses the balance. Reservations on different
   attempts lock the same account before checking/debiting its balance. One
   attempt cannot change its points amount on retry. A reservation immediately
   reduces the spendable balance and records a `redeemed` history row.
2. Apply an actual Shopify discount of €5 per reserved 100 points. Verify the
   resulting cart's discount allocations, stacking behavior and eligible lines;
   a successful reservation is not proof Shopify applied a discount.
3. Only a definite failed attempt with no cart ID, checkout URL or linked order
   may call `release_failed_shopify_loyalty(attempt_id)`. It refunds the hold once
   with an `adjusted` history row. An elapsed TTL, `ready`, `unknown`, network
   timeout or customer navigation is not proof of failure and cannot release it.
4. `fetchLoyaltySettlement` fetches authoritative Admin payment/refund data and
   produces the cumulative EUR values accepted by `loyaltySettlementRpcArgs`.
   `complete_shopify_loyalty` calls the settlement only after the same
   version of the order snapshot/account link is committed. It verifies exact
   version, EUR, paid/refunded financial status, immutable verified account and
   the actual reserved discount value. Unowned guest orders fail closed.
5. `eligiblePaidCents` is the original/cumulative paid eligible spend, not the
   current total after refunds. `eligibleRefundedCents` is cumulative refunded
   eligible spend on the same basis. Neither can decrease. The accounting
   adapter matches the legacy final paid-total policy (including shipping/tax,
   after discounts) using successful SALE/CAPTURE sums corroborated against
   totalReceivedSet and totalPriceSet, and successful REFUND sums corroborated
   against totalRefundedSet. It never uses currentTotalPriceSet or webhook
   amounts. Shop and presentment must both be EUR with identical cent values;
   original received spend must equal the pre-return order total. Gift-card,
   store-credit, test/manual payments, pending/unknown transactions, incomplete
   pagination/counts and unreconciled edited/outstanding totals are rejected.
6. Points earned are `floor(eligiblePaidCents / 100)`. Reversed points are the
   capped `floor(cumulativeEligibleRefundedCents / 100)`. Two €0.60 partial
   refunds therefore reverse one point together. Refund-first delivery creates
   and reverses the cumulative earning atomically. Replays do neither twice.
7. `redemptionRestoredPoints` is the cumulative reviewed restoration amount. It
   cannot decrease, exceed the reservation or exceed the proportion of refunded
   eligible spend. A fully refunded order must restore the full reservation.
   Restoration on a `PAID` snapshot or with zero eligible refund is rejected.
   The adapter restores floor(reserved points * cumulative refund / paid spend),
   including all reserved points on a full refund. The proportional restoration
   policy must be reviewed before activation. Fully discounted/zero-eligible-spend
   redemptions are explicitly unsupported.

Every posting writes the private journal, customer-visible legacy transaction
history, balance and tier in the same PostgreSQL transaction. Shopify order IDs
remain in the new journal; the legacy UUID `order_id` column is not repurposed.
Refunds change lifetime points/tier; redemption/hold release/restoration do not.
If earned points have already been spent, reversal can make the balance negative
so future earnings repay the debt rather than creating points through refunds.
Further reservations reject insufficient balances. Debt display and support
policy must be reviewed before activation; the legacy UI does not explain debt.

The SQL routines have a fixed empty search path and are not executable by anon
or authenticated roles. Private tables have RLS and no browser grants. The
internal posting helper is not executable even by service_role. Do not expose
the RPCs directly through a customer route without auth, origin/CSRF, request
idempotency, attempt binding and reviewed line/discount verification.

## Durable execution, default off

The second migration installs an AFTER snapshot trigger, ordered after verified
account linkage, which enqueues only paid/refunded orders from attempts created
at or after a reviewed cutoff. The cutoff defaults to NULL, so deployment does
not enqueue history or mutate balances. A historical or late legacy order never
becomes a new Shopify loyalty award because its creation predates the cutoff.

The outbox stores order/version/lease/error codes, never provider payloads or
discount codes. Repeated versions do not requeue; newer versions invalidate
in-flight leases. The worker calls `complete_shopify_loyalty`, which locks the
snapshot before the outbox and commits settlement plus acknowledgement in one
transaction. Expired claims rotate leases. Failures back off and the eighth
attempt becomes a visible dead letter. Only safe uppercase error codes persist.
Admin access denial closes checkout and retains the retryable event.

`GET /api/cron/shopify-loyalty` performs no provider or DB access unless
`SHOPIFY_LOYALTY_SYNC_ENABLED=true`. An active invocation requires timing-safe
CRON_SECRET authorization, `LOYALTY_ATOMIC_ENABLED=true`, the actual shared
legacy-writer RPC generation, and a past SQL cutoff with a review reference.
There is no mutable `loyalty_ready=true` flag. `loyaltyRuntimeReady` derives health
from the real cutoff, recent successful worker heartbeat, queue age and dead
letters. Missing state fails closed. The route is not scheduled in this isolated
branch; integration must add it to Vercel and require computed health in checkout.

Reservations require a private server-created discount binding. The adapter
hashes actual DiscountCodeApplication codes and sums actual allocation amounts
on line and shipping lines; matching a total discount or an order attribute is
insufficient. Bindings store the provider discount ID plus SHA-256 code hash,
never the code. The service-only creation path must verify a real, randomized,
single-use Shopify discount before inserting a binding; no such creation caller
is provided here. Missing or mismatched bindings retain the event for recovery.

## Remaining release blockers

- The current checkout input has no loyalty redemption or promo-code input and
  does not create/apply/verify Shopify discounts or bind reservations. Do not
  mark `benefits_verified` true because these files/local tests exist.
- Mixed gift-card tender/store credit, manual/test payments, zero-spend
  redemption and unsupported edited/incomplete orders deliberately remain in
  recovery rather than earning guessed points. Extend the reviewed adapter and
  policy before enabling those flows. Its query is schema-validated for Admin
  API 2026-10; live scopes/settlement behavior still need a controlled test.
- Legacy earning, redemption, return reversal and admin balance rebuilds use
  separate reads/absolute balance writes. They can overwrite concurrent ledger
  updates. Freeze/migrate those writers or route all balance mutations through a
  shared atomic primitive before running this alongside legacy traffic. A
  companion compatibility migration/routes must install generation 1 of
  `legacy_loyalty_writer_health()` and deploy every legacy writer's atomic path;
  the function's existence proves DB capability, not that route deployment or
  late Mollie payment tests passed. There is deliberately no blanket trigger
  blocking late legacy payments after a timestamp.
- New-account/guest earning, email-change ownership recovery and legacy point
  redemption vouchers are not covered. Account linking uses existing verified
  users, and settlement refuses to create or guess an account from order email.
- Promo-code parity (limits, dates, sale items, minimum order, stacking), tier
  discounts, gift-card balances, returns, loyalty emails and customer history
  presentation need separate parity verification. None is established here.
- Apply and exercise migration/RLS against Supabase staging before production;
  then reconcile live account count/balance/history with a reviewed cutoff. Do
  not run historical backfills through this RPC without an ownership/baseline
  and duplicate-legacy-order audit.

## Local validation

`npm test -- tests/lib/shopify-loyalty-contract.test.ts`

`npm test -- tests/lib/shopify-loyalty-payment.test.ts tests/lib/shopify-loyalty-worker.test.ts tests/lib/shopify-loyalty-readiness.test.ts tests/api/shopify-loyalty-cron.test.ts`

`MOSE_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node tests/lib/shopify-loyalty-migration-check.mjs`

The standalone script uses an isolated in-memory PostgreSQL engine, original
loyalty/pilot/account migrations and the new migration. It tests opening balance
preservation, authorization, replay/conflict handling, hold/release, partial/full
and refund-first delivery, spent-points debt and rollback on a real database
write failure, plus outbox ordering, version/lease fencing, settlement+ack,
retention/backoff/dead letters and cutoff exclusion. It never connects to Shopify
or Supabase. It does not simulate independent production PostgreSQL sessions or
actual provider discount/payment behavior.

Schema references: [Order](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/Order),
[OrderTransaction](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/OrderTransaction),
[DiscountAllocation](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/DiscountAllocation).
