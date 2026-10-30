# Tapstitch production observations

Tapstitch support confirmed that intermediate production stages have no official API, webhook or Shopify field. The alternative collector reads the actual order header in a separately authorized TinyFish cloud profile. It is a browser integration, not a vendor API or an availability guarantee.

## Source and trust boundary

The MOSE server starts a read-only TinyFish job and subsequently retrieves its result through TinyFish's authenticated API. No public webhook accepts status claims. Supplier order ID, Shopify reference, source URL, header excerpt, run ID, profile and completion time are validated before an append-only observation is stored. A progress legend is not evidence. Unknown stages, wrong orders and ambiguous matches leave the last confirmation untouched.

Payment, inventory, loyalty, fulfillment and tracking are never updated by this collector. Production marked Shipped means only that Tapstitch reports finished production and shipment; actual carrier handoff/delivery remains the existing Shopify source. Mixed supplier orders retain the Tapstitch-specific label. Multiple supplier orders for one Shopify order currently fail closed and require explicit mapping support rather than silently reporting one parcel's stage for the whole order.

## Operation

`/api/cron/tapstitch` uses the existing server cron authentication every five minutes. A job starts at most once per six hours and reads up to ten unfinished supplier orders, oldest observation first. Completion is handled on subsequent cron runs. Runtime defaults disabled. Lease fencing and a unique request marker recover a start whose response was lost, without starting another paid browser job. A genuinely unknown start or stalled job retains its budget reservation and requires review.

Admin `/admin/shopify/production` shows connection health, budget, last complete check and observed source times. Orders show their latest confirmed production stage and an eight-hour stale warning for unfinished production. Finished/cancelled supplier production stops consuming browser runs. A login failure, insufficient credits, selector/layout change or result validation error does not become a new stage.

## Server configuration

- `TINYFISH_API_KEY`: private server-only account key; never expose to frontend or commit it.
- `TINYFISH_TAPSTITCH_PROFILE_ID`: separately authorized MOSE Tapstitch profile.
- `TAPSTITCH_CLOUD_ENABLED=true`: enable only after credentials, budget authorization, schema and live result verification.
- `tapstitch_sync_runtime.enabled=true`: separate durable operational gate.

The schema is `20261030070000_tapstitch_production_observations.sql`. It adds no customer/public access. Tables and latest view are service-only. Observations cannot be updated or deleted by the application service role.

## Cost control

The approved live test completed in three steps. At the observed account contract of USD0.016/step, that is USD0.048. This is not a fixed charge for future runs. The provider's non-beta default ceiling is 150 steps, so MOSE reserves USD2.40 before each start. A finite one-time USD10 runtime budget is dormant until the owner approves recurring use; it never resets or increases automatically. Verified completed step counts release unused reservations. An unknown count conservatively charges the full reservation. The collector refuses a changed rate or active wallet auto-reload setting.

A reservation is distinct from TinyFish's own billing. This module does not buy credits, top up a wallet, change auto reload or authorize financial actions in Tapstitch. Before increasing the budget, resolve outstanding runs against the provider's authenticated run records and obtain the owner's spending authorization.

## Recovery

Repair an expired login in the dedicated TinyFish profile. For unknown job creation, locate the exact `MOSE_PRODUCTION_<request_id>` marker and verify the request, profile, run and timestamps before attaching its existing run ID. Never retry a paid start blindly or clear a reservation just to make a red state disappear. Keep the runtime paused while investigating schema/provider changes. Run history and append-only observations provide the audit trail; do not persist raw HTML, customer addresses or browser credentials in observations.

The collector is deliberately bounded. Current target reads fail visibly at configured pagination limits rather than truncating orders. Higher order volumes require paginated targeting and an explicitly reviewed polling/budget policy before expanding the current batch size.

## Validation

Pure/schema tests cover source/order confusion, static progress legends, timestamps, duplicate or incomplete results and freshness. Worker tests cover response-loss recovery with only one paid start, finite budget reservation, changed pricing, low credit, auto reload and default-off behavior. PostgreSQL/PGlite checks cover private access, immutable history, identity/link conflicts, out-of-order results, lease claims and the budget constraint. Cron and health API access are tested separately.
