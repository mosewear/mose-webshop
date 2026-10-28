# Unified Shopify backend — staged, disabled by default

This foundation creates a single Shopify cart from reviewed MOSE-local variant mappings and mirrors Shopify orders. It does **not** yet execute inventory transfers, refunds, Sendcloud labels, Tapstitch submissions, gift-card migration or loyalty transactions. Those must be proven before any release flag is enabled.

## Contract and secrets

`POST /api/shopify/checkout`: `{ locale: "nl" | "en", country: "NL", attemptId: UUID, lines: [{ variantId: MOSE_LOCAL_ID, quantity: 1..10 }] }`.

Before POST, await `GET /api/shopify/session` with same-origin credentials; it returns `{ready:true}` and sets the HttpOnly ownership cookie. POST without the acknowledged cookie returns `SESSION_REQUIRED` before any database/provider mutation. A lost bootstrap response therefore cannot orphan a checkout.

Success returns `{ checkoutUrl, attemptId }`. Prices and Shopify IDs are server-owned. Keep one attempt ID per unchanged normalized basket; reuse it on retries. The server binds it to a random HttpOnly session and the reviewed basket fingerprint. A pending/unknown attempt is not recreated automatically. `ATTEMPT_EXPIRED`, `INPUT_CHANGED` and `ATTEMPT_FAILED` carry `retrySafe`; it is true only for a definite failed attempt with no issued cart. Expired ready/creating/unknown attempts require controlled payment reconciliation/support, not automatic UUID rotation. TTL is not proof that no payment happened. Creating a cart never proves payment and never clears the MOSE cart. Cart IDs and checkout URLs must not enter logs, analytics or publicly readable tables.

Required server secrets: `SHOPIFY_STOREFRONT_PRIVATE_TOKEN`, `SHOPIFY_APP_CLIENT_SECRET`, `SHOPIFY_SESSION_SECRET` (at least 32 characters), `CRON_SECRET` (at least 24 characters). For Admin API access use `SHOPIFY_APP_CLIENT_ID` with the app secret for an installed app in the store's own Shopify organization; the server exchanges credentials and refreshes the 24-hour token before expiry. An existing production/offline `SHOPIFY_ADMIN_ACCESS_TOKEN` remains supported for legacy custom apps. Never use interactive CLI tokens for production. Credentials and returned tokens must not appear in logs or browser code. `SHOPIFY_DEV_BUYER_IP` is only for local development; Vercel uses the overwritten platform IP header.

The client credentials grant is supported only when app and store share an organization. Installation and required scopes must be confirmed against `currentAppInstallation`, not inferred from a successful token exchange. Reference: https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant.

Release flags `SHOPIFY_CHECKOUT_ENABLED=true` and `SHOPIFY_BENEFITS_VERIFIED=true` are insufficient alone. A valid past `SHOPIFY_CUTOVER_AT`, all seven database release gates a reconciliation and successful worker heartbeat less than 15 minutes old, no pending event older than 15 minutes, and zero dead letters are required. Missing/unknown queue counts fail closed. Current gateway is NL/EUR only: the existing webshop's other markets remain an explicit migration blocker. Digital variants cannot be released until their pricing/personalization and benefits contract is supported; no inactive catalogue item should be activated implicitly.

## Durable synchronization

Authenticated `GET /api/shopify/reconcile` and `GET /api/shopify/worker` require `Authorization: Bearer <CRON_SECRET>` and `SHOPIFY_SYNC_ENABLED=true`. Production scheduling is provided by `GET /api/cron/shopify` every five minutes in `vercel.json`. With `SHOPIFY_SYNC_ENABLED` absent/false it returns a successful skipped response without any database or provider request, so deployment alone does not activate synchronization. When enabled, it requires the same timing-safe `CRON_SECRET` authorization, calls reconciliation and the worker directly (no self-HTTP), and returns 503 if either phase fails or the worker reports failed/lost leases. A busy reconciliation lease is an expected overlap. Configure credentials, apply migrations and exercise this runner before activating checkout.

- Reconciliation queues one page (50 orders) per invocation and commits events/cursor atomically. A 10-minute overlap plus delivery-key deduplication handles most timing boundaries. Initial watermark covers the previous seven days; select and verify a different backfill interval before first release if required.
- Worker claims one event at a time, up to five per invocation within its time budget. It fetches authoritative Admin data; raw webhook payloads never directly become order state. Failed events retry with bounded exponential backoff; the eighth failed attempt becomes a visible dead letter.
- The combined cron has a 90-second invocation deadline within a 120-second route budget. Database operations receive an abort signal; Shopify calls keep their existing 15-second timeout. The worker retains its 50-second/five-event cap. Reconciliation runs first, then the worker drains a bounded batch; an unsuccessful reconciliation does not prevent draining previously queued events if time remains. No new work starts without enough time. Interrupted work is recovered through the existing fenced two-minute reconciliation and three-minute event leases. Large backlogs may need repeated authenticated worker invocations; stale queues continue to block checkout.
- Completion, order/line/refund/fulfillment projection, stale-version protection and acknowledgement share a fenced SQL transaction. Older workers and duplicate deliveries cannot repeat the projection. No email, analytics, stock or supplier side effects are performed here.
- Order line pagination is supported. More than 100 nested fulfillment/refund lines, fulfillment orders or fulfillments requires an extended-pagination implementation; it is explicitly queued as `ORDER_REQUIRES_EXTENDED_PAGINATION` rather than silently truncated. Resolve this operationally before processing such orders.
- Product changes conservatively invalidate the affected reviewed mappings. There is no automatic re-release: catalogue re-verification/synchronization is still required. App uninstall closes checkout and mapping release.
- Processed raw webhook payloads are erased in the acknowledgement transaction. Set a reviewed retention policy for pending/dead-letter payloads and checkout capability records before production; tables are service-role only.

Admin access must be proven for ordinary orders and merchant-/third-party-managed fulfillment orders. The schema validator can list alternative scope families; do not indiscriminately grant every suggested scope. No customer email/address is fetched by the current query. Account order visibility and fulfillment addresses require a separate access-controlled implementation.

## Validation

Run `npm test -- tests/lib/shopify-pilot.test.ts tests/lib/shopify-worker.test.ts tests/lib/shopify-attempts.test.ts tests/api/shopify-checkout.test.ts tests/api/shopify-webhooks.test.ts` and `npx tsc --noEmit`.

`tests/lib/shopify-migration-check.mjs` executes the migration and fencing/idempotency/privilege assertions against a local in-memory PGlite engine. It never connects to Supabase or Shopify. Instructions for the isolated optional dependency are in that file. A real Supabase staging migration/RLS check remains required before production.

Queries target API `2026-10` and were checked with Shopify's official schema validator. Reference: https://shopify.dev/docs/api/admin-graphql/2026-10/queries/order and https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage.

Inventory evidence now has a separate default-off, service-only location reconciliation runner. See [inventory evidence](../../../docs/shopify/inventory-evidence.md) for revision/lease fencing, unknown untracked supplier quantities and checkout/readiness freshness gates. It does not transfer stock or certify the inventory cutover.
