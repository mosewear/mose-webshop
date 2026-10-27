# Unified Shopify backend — staged, disabled by default

This foundation creates a single Shopify cart from reviewed MOSE-local variant mappings and mirrors Shopify orders. It does **not** yet execute inventory transfers, refunds, Sendcloud labels, Tapstitch submissions, gift-card migration or loyalty transactions. Those must be proven before any release flag is enabled.

## Contract and secrets

`POST /api/shopify/checkout`: `{ locale: "nl" | "en", country: "NL", attemptId: UUID, lines: [{ variantId: MOSE_LOCAL_ID, quantity: 1..10 }] }`.

Success returns `{ checkoutUrl, attemptId }`. Prices and Shopify IDs are server-owned. Keep one attempt ID per unchanged normalized basket; reuse it on retries. The server binds it to a random HttpOnly session and the reviewed basket fingerprint. A pending/unknown attempt is not recreated automatically. Creating a cart never proves payment and never clears the MOSE cart. Cart IDs and checkout URLs must not enter logs, analytics or publicly readable tables.

Required server secrets: `SHOPIFY_STOREFRONT_PRIVATE_TOKEN`, production/offline `SHOPIFY_ADMIN_ACCESS_TOKEN`, `SHOPIFY_APP_CLIENT_SECRET`, `SHOPIFY_SESSION_SECRET` (at least 32 characters), `CRON_SECRET` (at least 24 characters). Never use interactive CLI tokens for production. `SHOPIFY_DEV_BUYER_IP` is only for local development; Vercel uses the overwritten platform IP header.

Release flags `SHOPIFY_CHECKOUT_ENABLED=true` and `SHOPIFY_BENEFITS_VERIFIED=true` are insufficient alone. A valid past `SHOPIFY_CUTOVER_AT`, all seven database release gates and a reconciliation less than 15 minutes old are required. Current gateway is NL/EUR only: the existing webshop's other markets remain an explicit migration blocker. Digital variants cannot be released until their pricing/personalization and benefits contract is supported; no inactive catalogue item should be activated implicitly.

## Durable synchronization

Authenticated `GET /api/shopify/reconcile` and `GET /api/shopify/worker` require `Authorization: Bearer <CRON_SECRET>` and `SHOPIFY_SYNC_ENABLED=true`. No cron schedule is installed by this foundation. Configure and exercise it before activating checkout.

- Reconciliation queues one page (50 orders) per invocation and commits events/cursor atomically. A 10-minute overlap plus delivery-key deduplication handles most timing boundaries. Initial watermark covers the previous seven days; select and verify a different backfill interval before first release if required.
- Worker claims one event at a time, up to five per invocation within its time budget. It fetches authoritative Admin data; raw webhook payloads never directly become order state. Failed events retry with bounded exponential backoff; the eighth failed attempt becomes a visible dead letter.
- Completion, order/line/refund/fulfillment projection, stale-version protection and acknowledgement share a fenced SQL transaction. Older workers and duplicate deliveries cannot repeat the projection. No email, analytics, stock or supplier side effects are performed here.
- Order line pagination is supported. More than 100 nested fulfillment/refund lines, fulfillment orders or fulfillments requires an extended-pagination implementation; it is explicitly queued as `ORDER_REQUIRES_EXTENDED_PAGINATION` rather than silently truncated. Resolve this operationally before processing such orders.
- Product changes conservatively invalidate the affected reviewed mappings. There is no automatic re-release: catalogue re-verification/synchronization is still required. App uninstall closes checkout and mapping release.
- Processed raw webhook payloads are erased in the acknowledgement transaction. Set a reviewed retention policy for pending/dead-letter payloads and checkout capability records before production; tables are service-role only.

Admin access must be proven for ordinary orders and merchant-/third-party-managed fulfillment orders. The schema validator can list alternative scope families; do not indiscriminately grant every suggested scope. No customer email/address is fetched by the current query. Account order visibility and fulfillment addresses require a separate access-controlled implementation.

## Validation

Run `npm test -- tests/lib/shopify-pilot.test.ts tests/lib/shopify-worker.test.ts tests/api/shopify-checkout.test.ts tests/api/shopify-webhooks.test.ts` and `npx tsc --noEmit`.

`tests/lib/shopify-migration-check.mjs` executes the migration and fencing/idempotency/privilege assertions against a local in-memory PGlite engine. It never connects to Supabase or Shopify. Instructions for the isolated optional dependency are in that file. A real Supabase staging migration/RLS check remains required before production.

Queries target API `2026-10` and were checked with Shopify's official schema validator. Reference: https://shopify.dev/docs/api/admin-graphql/2026-10/queries/order and https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage.
