# Atomic legacy loyalty writers — staged, default off

`LOYALTY_ATOMIC_ENABLED=true` routes legacy paid-order earning, return reversals,
redemption and admin adjustments through `atomic_legacy_loyalty`. SQL
`award_loyalty_points` is replaced by the same order-keyed primitive. All balance
changes lock the existing `loyalty_points` row, just like Shopify ledger 004;
updates are relative, history and idempotency results commit together.

No migration backfill, customer import, account merge, balance rebuild or account
reset occurs. The synthetic install test preserves exactly 54 accounts / 6104
points, matching the previously audited aggregate without copying real records.
That test is not a fresh production-account count or authorization to overwrite it.

## Deployment sequence

1. Review migrations 001/002/004/006 and any separately prepared 005 outbox in
   Supabase staging. Verify old `return_id` column/index migration exists and roles,
   auth.users/email and legacy loyalty tables match. Keep Shopify checkout/sync and
   new loyalty runtime off. Take a private recovery point; no live action performed.
2. Apply 006 transactionally. No balance/history mutation on install. Existing
   `award_loyalty_points` SQL callers now use shared locks/canonical order dedupe.
   Browser financial INSERT/UPDATE/DELETE grants are removed; SELECT remains.
3. Deploy **all** changed server routes and checkout/admin clients, then activate
   `LOYALTY_ATOMIC_ENABLED`. Admin adjustment API intentionally returns 503 while
   this gate is off, rather than using the old unsafe browser writer. Coordinate
   migration/deployment/activation as one short maintenance boundary; do not leave
   mixed old clients doing financial writes. Old already-loaded pages may require
   refresh; they fail closed after browser DML is revoked.
4. Shopify runtime additionally checks this environment gate and the service-only
   `legacy_loyalty_writer_health()` table result generation=1. That RPC proves the
   installed DB contract only; deployment and default-off gate are separate proof.
5. Verify actual staging concurrent transactions, role permissions, actual provider
   callbacks and late/duplicate Mollie payments before enabling Shopify. No cutoff
   date rejects legacy orders. `minimal` fulfillment intentionally still skips
   loyalty, matching its explicit old contract.

## Idempotency and legacy semantics

- Canonical earning key is `legacy:order:<MOSE-order-UUID>:earn`, deliberately shared
  by Mollie and old Stripe to prevent cross-provider double earning. Existing
  `loyalty_transactions(order_id,type='earned')` remains the historical dedupe
  authority. Existing account balances are never reconstructed from that history.
- One refund claim per return UUID caps reversals to order earning less earlier
  negative adjustments. A refund arriving before earning stays pending; late
  payment applies earning and retained reversal together. Existing return rows are
  respected, never repeated. Per-refund whole-euro rounding matches old behavior.
- Refunded already-spent points can leave negative debt, matching Shopify ledger;
  clamping to zero would repeatedly create free spendable points. Future earnings
  repay debt first, redemption rejects insufficient balance. Lifetime reversal and
  tier thresholds remain 500/1000. Admin positive deltas increase lifetime; negative
  deltas do not, matching old admin behavior.
- Redemption and admin operation UUIDs survive request retries and reloads via
  sessionStorage; RPC binds immutable request contents and rejects conflicting
  replay. Redemption identity is verified again against auth.users. Admin API
  requires the existing server admin authorization, looks account identity up
  server-side and never accepts an arbitrary client email.
- Already-paid provider retries rescue missing atomic earning. An RPC failure
  returns `LOYALTY_RETRY_REQUIRED`; the Mollie webhook returns 503 for that exact
  condition so the provider can retry. Route regression verifies this plus a
  successful already-paid late replay. Confirm actual provider retries in staging.
- Marketing status routes/scripts skip their old aggregate-based account creation
  when activated. They can still send only under their existing explicit invocation;
  this work did not run or send them. Metadata mail timestamps are not financial
  balance writers. Destructive admin order-history deletion is rejected when
  activated; cancellation/refund remains the supported financial history path.

## Verification and limits

Run:

```
MOSE_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node tests/lib/atomic-legacy-loyalty-migration-check.mjs
npx vitest run tests/lib/atomic-legacy-loyalty.test.ts tests/lib/loyalty.test.ts tests/api/mollie-loyalty-retry.test.ts
npx tsc --noEmit
```

38 SQL regressions and 37 focused Vitest assertions pass. SQL regressions exercise baseline preservation, private RPCs, SQL/webhook dedupe,
competing redemptions, duplicate refunds, refund-before-late-payment, historical
orders, debt, real Shopify reserve + legacy redemption, late legacy earn/refund +
Shopify release/replay, and rollback on history-insert failure. PGlite Promise.all
checks interleaving in one engine, **not separate concurrent PostgreSQL sessions**;
real staging concurrency remains necessary. No paid order/sample or live DB write
was performed.

The legacy redemption API still honors the preexisting discount contract; this
change does not prove downstream legacy checkout discount settlement or provide a
Shopify discount adapter. Tier-up email is outside the financial transaction and
not a durable exactly-once mail outbox. A crash after committed earning can miss a
tier notification. Neither limitation should be marked complete by the DB-health
RPC. Original Desktop checkout was not touched.

## Recovered combined-schema audit — 28 October 2026

All six additive Shopify migrations (001,002,inventory001,ledger004,outbox005,
legacy006) were executed together on an isolated real PostgreSQL 17.10 server (also tested on 18) with
Supabase-like default table grants. Rollback removed all integration relations;
commit preserved the 54 synthetic opening accounts and 6104 points byte for byte.
The 19 integration tables all had RLS and denied browser CRUD despite those
initial default grants. Actual `SET ROLE` requests denied order reads and the
atomic money RPC. **247 assertions** passed, including separate PostgreSQL
connections for competing redemptions, Shopify reserve versus legacy debit,
simultaneous late earning/refund/admin writes, duplicate callbacks, and two
first-purchase writers creating one account while retaining both earnings.

This caught and fixed a first-purchase bug: settlement previously required an
already-existing loyalty account, so a new registered buyer could not earn.
Settlement now initializes only that verified auth user's exact email under the
same account advisory lock as legacy earning; an account linked to another user
is refused. Existing accounts are not rebuilt, merged or transferred. The loyalty
PGlite suite now has 101 assertions, including first buyer and mismatched owner
regressions. All five PGlite suites pass (208 assertions combined). Fifty focused
inventory/loyalty/provider-retry Vitest tests passed.

Run the new test with `MOSE_PG_MODULE` pointing to an installed node-postgres
module and `MOSE_PG_URL` pointing to a disposable local PostgreSQL database:

```
node tests/lib/shopify-combined-postgres-check.mjs
```

The test refuses non-loopback URLs, creates synthetic tables/roles and requires
an empty disposable database. It does not connect to Supabase. PostgreSQL 17 matches the live major version and proves real transaction/lock
behavior; it does not replace Supabase-specific platform staging. The checked-in read-only preflight at
`docs/shopify/database-preflight.sql` checks the live column/index/role/trigger
contract and opening aggregates before a separately coordinated deployment.
Supabase backup recovery, metadata preflight, migration history registration and
post-commit verification remain required. No live migration was executed here.

Deployment caveats: the new admin adjustment route intentionally returns 503
while atomic mode is off; migration, complete writer deployment and flag must be
coordinated rather than publishing that UI and leaving it disabled. Financial
ledger FKs prevent cascading financial erasure; auth-account deletions may require
an explicit reviewed anonymization/retention workflow. Do not claim account
erasure is solved or delete journals to bypass the FKs.

Supabase-style default privileges also revealed that granting SELECT did not
remove service_role's inherited ALL. Migrations 004/005/006 now explicitly revoke
service_role table grants before their narrow SELECT grants; discount bindings
retain SELECT+INSERT. The real PostgreSQL test verifies all direct journal DML
is denied to service_role, while reviewed SECURITY DEFINER RPCs retain mutation.
