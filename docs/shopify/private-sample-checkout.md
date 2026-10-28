# Private administrator sample checkout

`/admin/shopify/samples` and `/api/admin/shopify/samples` provide a separate,
default-off pre-approval sample path. Only the authenticated `admin` role can
access either surface; managers/viewers/guests cannot. POST requires exact site
Origin, rejects cross-site Fetch Metadata and requires the acknowledged secure
Shopify session cookie from `/api/shopify/session` before any cart mutation.

The checked-in sample catalog contains the actual 63 local/Shopify variant IDs,
source-export SKUs and eight product IDs from the official readback. The reviewed
retail prices total EUR658 for one of each model; shipping is calculated by Shopify
before the user pays. This server catalog is deliberately independent of public
release mappings: no enabled, sample_verified, stock_quantity or local active
flag is written. An untracked POD sentinel is never represented as physical stock.

Before activation verify each current SKU against a fresh official export after
artwork sync, all eight approved branding configurations (hoodie black DTF6cm,
longsleeve black DTG6cm, approved label+hangtag all), NL shipping/checkout/payment
settings, the app-installed DB state and the Storefront publication. DRAFT
products cannot be ordered through Storefront; root must deliberately publish
only to the required Headless sales channel and retain inactive local products.
Configure server-only `SHOPIFY_SAMPLE_CHECKOUT_ENABLED=true` and nonempty
`SHOPIFY_SAMPLE_BRANDING_REFERENCE` containing the actual reviewed evidence.
Normal private Storefront token, checkout URL host and session-secret config is
also required. Never toggle public gates just to make sample ordering work.

The server validates exactly one allowlisted variant per model, exactly eight
unique models, no caller prices/quantity/discounts, live Storefront product and
SKU identity, availableForSale and exact EUR price. It uses the existing durable
reserve/finish RPC, session/IP hashes, account proof and strict cart readback.
Ready retries reuse the persisted cart; uncertain mutations stay unknown and
cannot silently create a replacement. Failure to persist never returns a URL.
The snapshot purpose and order attribute mark `admin-sample`, while the existing
verified ownership proof keeps the paid order private to the initiating account.
The browser preserves the attempt and selection on reload.

Payment is entirely user initiated at Shopify. The page explains the separate
manual Tapstitch supplier payment and that the locally stored supplier sample
code applies only there. No supplier code, app token, payment data or credentials
are shipped in the page or catalog. No payment was performed during testing.

Validation: nine API tests cover authorization, CSRF/session bootstrapping,
release evidence, malicious selection/price injection, real availability/source/
price mismatch, durable ownership, save uncertainty, safe reuse and POD stock
semantics. TypeScript and targeted lint pass. Actual production checkout delivery,
shipping quote and payment completion still require live browser validation.

Fresh own-app readback at 2026-10-28T12:38:12Z confirmed all eight product IDs,
63 variant IDs, every exact color/size and retail price. The 23 hoodie/longsleeve
SKUs changed after artwork sync; the private manifest has been updated to those
current exported SKUs. Storefront validation also compares the two selected
option values, so an unexpected option change fails before cart creation.
