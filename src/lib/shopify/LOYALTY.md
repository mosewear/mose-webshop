# Shopify loyalty ledger — additive, dormant foundation

This implementation does not turn on checkout, benefits or synchronization. The
migration creates empty private tables and service-role RPCs. It does not change,
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
4. A reviewed settlement adapter must fetch authoritative Admin payment/refund
   data and produce the cumulative EUR values accepted by
   `loyaltySettlementRpcArgs`. Call `settle_shopify_loyalty` only after the same
   version of the order snapshot/account link is committed. It verifies exact
   version, EUR, paid/refunded financial status, immutable verified account and
   the actual reserved discount value. Unowned guest orders fail closed.
5. `eligiblePaidCents` is the original/cumulative paid eligible spend, not the
   current total after refunds. `eligibleRefundedCents` is cumulative refunded
   eligible spend on the same basis. Neither can decrease. The accounting
   adapter must resolve order edits, shipping/tax, gift cards, discounts,
   transactions and refund allocation before producing these values. Do not
   infer them from `currentTotalPriceSet` alone or webhook amounts.
6. Points earned are `floor(eligiblePaidCents / 100)`. Reversed points are the
   capped `floor(cumulativeEligibleRefundedCents / 100)`. Two €0.60 partial
   refunds therefore reverse one point together. Refund-first delivery creates
   and reverses the cumulative earning atomically. Replays do neither twice.
7. `redemptionRestoredPoints` is the cumulative reviewed restoration amount. It
   cannot decrease, exceed the reservation or exceed the proportion of refunded
   eligible spend. A fully refunded order must restore the full reservation.
   Restoration on a `PAID` snapshot or with zero eligible refund is rejected.
   The adapter must define proportional integer rounding/allocations; these
   bounds do not establish merchant policy. Fully discounted/zero-eligible-spend
   orders need an explicit reviewed policy before this contract can handle them.

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

## Remaining release blockers

- There is deliberately no caller in checkout/worker yet. The current checkout
  input has no loyalty redemption or promo-code input and does not apply/verify
  Shopify discounts. Do not mark `benefits_verified` true because these files
  exist or because these local tests pass.
- Current Admin projection lacks authoritative eligible-spend/payment/refund
  allocation and applied loyalty discount details. A reviewed parser/schema and
  currency/stacking policy must precede settlement integration. Worker projection
  completion and the settlement need a durable outbox/fenced recovery contract;
  two unrelated best-effort calls are not sufficient.
- Legacy earning, redemption, return reversal and admin balance rebuilds use
  separate reads/absolute balance writes. They can overwrite concurrent ledger
  updates. Freeze/migrate those writers or route all balance mutations through a
  shared atomic primitive before running this alongside legacy traffic. This
  patch deliberately does not silently change legacy behavior.
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

`MOSE_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node tests/lib/shopify-loyalty-migration-check.mjs`

The standalone script uses an isolated in-memory PostgreSQL engine, original
loyalty/pilot/account migrations and the new migration. It tests opening balance
preservation, authorization, replay/conflict handling, hold/release, partial/full
and refund-first delivery, spent-points debt and rollback on a real database
write failure. It never connects to Shopify or Supabase. It does not simulate
independent production PostgreSQL sessions, provider discount/payment behavior,
or the missing settlement adapter.
