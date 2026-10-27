# Shopify order visibility and account ownership

The read-only Shopify order views are separate from historical Mollie orders:

- `/admin/shopify/orders` and `/api/admin/shopify/orders` require the verified `admin` or `manager` role. The existing Orders screen links to this view. Refund/payment/fulfillment changes open Shopify; no legacy Mollie, Sendcloud, stock or email mutation is invoked.
- `/api/account/shopify-orders` uses the server-verified Supabase user ID. A caller cannot request another user's ID, email or order ID. The account screen mounts this section when `NEXT_PUBLIC_SHOPIFY_ORDERS_ENABLED=true`.
- Both routes return private, non-cacheable, paginated projections, never raw Shopify snapshots or checkout secrets. Successful shipments include per-line quantities and HTTPS tracking links. Unknown supplier mappings are explicitly marked for review in admin. Customers see MOSE as their service contact.

## Deploy sequence

Apply `20261027000100_shopify_pilot.sql` and then `20261027000200_shopify_order_accounts.sql` before enabling Shopify checkout. The second migration is required for signed-in checkout. The admin/API views return an authenticated setup state without querying Shopify integration tables while `SHOPIFY_SYNC_ENABLED` is off. Account reads also require `NEXT_PUBLIC_SHOPIFY_ORDERS_ENABLED=true`. Enable that flag after migration and authenticated read checks; this display flag is independent of the checkout flag so existing orders stay visible if checkout is rolled back. These changes do not set any release gate or enable checkout themselves.

Before any Shopify cart request, checkout re-reads the local variant and its database parent. Draft/inactive products, unavailable variants, gift cards, unverified presale reserves and prices that differ from the released mapping are rejected. Shopify remains authoritative for stock quantity. This gate also runs before reusing a saved checkout URL; already-issued Shopify checkout URLs still require synchronized Shopify publication when a local product is withdrawn.

At checkout the server verifies any Supabase auth session. It binds the verified user to an opaque random proof **before** creating the Shopify cart. The cart carries only the attempt UUID and proof, not the user ID or email. The attempt fingerprint includes the verified user identity; signing into a different account cannot reuse the first account's cart.

The authoritative order worker retains these correlation attributes. A database trigger links the order only when the persisted attempt and proof match exactly. It never matches customer email, accepts browser-supplied user IDs or transfers ownership after an order edit. Replaying a proof on a second order fails transactionally and enters operational recovery. Only the service role can access the ownership tables. Account erasure removes the association and retains operational order history.

Guests can still check out without an auth request or ownership row. Guest and historical Shopify orders are **not** retroactively linked to a MOSE account by matching email. Those shoppers use their Shopify confirmation/status link and MOSE support. This is intentional; a future verified guest-claim flow is separate work.

## Local verification

- Checkout tests: verified binding, guest path, session failure, durable owner failure, changed-account reuse, existing exactly-once boundaries.
- API tests: unauthenticated rejection, admin/manager enforcement, strict pagination, no caller-selected identity, private responses, safe errors.
- DTO tests: account-proof/PII exclusion, customer supplier privacy, successful shipment quantities, failed-fulfillment exclusion, unsafe tracking URL removal.
- `tests/lib/shopify-order-account-migration-check.mjs`: local PGlite tests for table permissions, forged/ambiguous proof rejection, immutable ownership, replay rollback and account erasure. Run with `MOSE_PGLITE_MODULE` pointing to a locally installed PGlite module. Never use the live database for this test.
- The existing `CART_CREATE` mutation, including the CartInput attributes used here, validates against Shopify Storefront API `2026-10`.

Fulfillment mutations, returns in MOSE, inventory writeback, discounts/loyalty and production end-to-end payment verification remain gated by the wider checkout release checklist. Read-only visibility does not certify these workflows.
