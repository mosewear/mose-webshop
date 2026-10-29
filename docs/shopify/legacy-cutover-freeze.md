# Independent legacy checkout and stock maintenance barrier

This is staged code. It does not switch public checkout, transfer inventory, cancel payments, or activate any products. Migration `20261029000100` installs an initially unfrozen singleton and an append-only service-managed audit history.

## Guarantees and limits

The database blocks new legacy orders, order deletion and order-item insert/update/delete in checkout-freeze mode. In stock-freeze mode it additionally blocks all regular/presale quantity changes and variant insertion/deletion, including direct administrative Data API writes. Metadata-only variant edits remain possible. Payment-status updates remain possible so provider facts can be recorded during maintenance.

Each guarded transaction takes a shared lock on the singleton. The service-only `set_legacy_cutover_freeze` update waits for those transactions to commit before acknowledging the freeze. Freeze changes are evidenced, explicitly resumed, and never automatically expire. Do not use a long-lived transaction around the setter: call it as an independent committed transaction, then read it back.

The optional `LEGACY_CUTOVER_GUARD_ENABLED=true` application guard adds a clear HTTP 503 to checkout, admin order creation and both legacy payment-creation endpoints (the Stripe-named endpoint re-exports Mollie). Once enabled, missing/unknown database state fails closed. Enable this only after migration installation. Its disabled default permits code-before-migration deployment; database triggers remain authoritative for orders/stock regardless of that flag.

A remote payment already in flight can finish after the guard check. Already-issued payment links also cannot be revoked by a local database freeze. The freeze is not provider reconciliation and must not be represented as such. Recheck providers after freezing, retain the bridge for historical late payments, and do not cancel or expire unknown payments merely to make readiness green.

## Operator sequence (service role / trusted SQL session only)

1. Deploy code and install migration after checking existing migrations. Confirm the state is `false,false`, privileges are restricted, and the application version is deployed. Enable `LEGACY_CUTOVER_GUARD_ENABLED=true`, redeploy, and prove normal checkout is still permitted before maintenance. This flag does not touch `SHOPIFY_CHECKOUT_ENABLED`.
2. In an independently committed request, execute:

```sql
select public.set_legacy_cutover_freeze(true,false,'cutover review: <actual evidence reference>');
select checkout_frozen,stock_frozen,changed_at,evidence_reference from public.legacy_cutover_control;
```

3. Verify checkout and both payment-create routes return 503 before creating orders/provider payments. Verify admin order creation is stopped. Drain legacy paid inventory processing. Reconcile Stripe/Mollie after outstanding requests have settled, including payments created between the previous audit and freeze. Record actual observations and unresolved remote payment possibilities.
4. Pause inventory edits/receipts/return processing operationally, then commit:

```sql
select public.set_legacy_cutover_freeze(true,true,'stock transfer: <actual reconciled evidence reference>');
```

5. Read fresh local quantities and provider quantities for the 27 reviewed own-stock mappings. Verify all paid orders have their stock stamp; a paid unstamped order appearing during the transfer must be processed through the existing historical bridge after ownership is recorded. Review presale and return history. Transfer quantities through reviewed idempotent Shopify compare-and-swap calls and read them back. Persist ownership rows with actual cutoff, inventory item/location and evidence while local quantity writers remain frozen. Do not edit local quantity shadows during the stock freeze.
6. After confirmed provider quantities and ownership evidence, keep new legacy checkout stopped but resume stock processing:

```sql
select public.set_legacy_cutover_freeze(true,false,'provider transfer verified: <actual evidence reference>');
```

7. Run paid-order reconciliation, legacy bridge worker and current inventory snapshot/mirror. Confirm no paid unstamped orders, no pending/dead-letter/shortfall, complete verified ownership, fresh heartbeat and deliberate return-stock cutoff. A payment arriving during freeze must be accounted for before release. Keep public Shopify checkout off until its independent stock, loyalty, benefit and sample gates pass.
8. After Shopify activation, leaving checkout freeze on is safest for preventing legacy order creation. It also pauses historical payment-link recreation; decide explicitly whether to resume historical recovery. Only unfreeze it after active Shopify cutover guards are verified and their historical-order policy is intended:

```sql
select public.set_legacy_cutover_freeze(false,false,'Shopify cutover verified; historical recovery reviewed: <reference>');
```

Abort before ownership transfer: reconcile any in-flight paid events, then explicitly set both flags false with evidence. Abort after any provider transfer: keep sales frozen; reconcile provider/local ownership first. Never simply flip back to local stock after an unknown remote outcome.

## Validation

`legacy-cutover-freeze-check.mjs` exercises PostgreSQL trigger behavior and privileges locally (19 checks); Vitest covers unavailable/unknown state and flag isolation (6 checks). Independent-session contention was additionally verified on a fresh local PostgreSQL server (5 checks): checkout and stock freezes timed out while earlier guarded transactions remained open, succeeded after commit, and rejected subsequent writes. The earlier stock update remained exactly 9, not overwritten. Evidence: workspace `outputs/legacy-freeze-concurrency-2026-10-29.json`, runner `work/db-tools/run-freeze-concurrency.mjs`. No production freeze or inventory transfer was performed.
