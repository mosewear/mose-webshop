# Native Shopify gift cards

The new route uses a real Shopify gift-card product and Shopify's own issuer, balance, recipient notifications, gift-card tender and refund handling. There is no voucher-as-discount bridge and no second MOSE balance. The Shopify order worker remains a projection worker; it never calls the legacy MOSE gift issuer.

Code is prepared and locally tested. Public release is **not enabled**: the actual `write_products` grant is still pending. Native product identity and the ten initial denominations were read back through Admin and the previously approved, locally stored Headless Storefront token. This is not a production-secret readback: Vercel env exports mask secret values. Verify actual production credentials through authenticated server readiness or a controlled unpaid cart. No paid order or gift-card balance was created during verification.

## Current verified identity

- Local product: `bc6c495d-fbc9-48e4-8d24-a9f8f23e3b8c`.
- Shopify native product: `gid://shopify/Product/11433699475783`.
- Initial values: EUR 20, 25, 50, 75, 100, 150, 200, 250, 500 and 1,000.
- All ten variants were verified against their exact product ID, EUR price, native gift-card identity, non-taxable status, no shipping, untracked inventory and actual Headless channel availability.
- The Shopify admin UI settings were verified: only gift cards are fulfilled automatically after payment, and gift cards never expire. Medium/high-risk orders retain Shopify's own manual-review behavior.
- Current native MOSE tables have zero cards and zero redemptions; there are zero legacy gift order lines. The switch rechecks actual database obligations inside a transaction rather than trusting this historical audit.

Private readback and non-executed SQL artifacts are outside the repository in `work/private/native-gift-product-verified.json`, `native-gift-registry-binding-reviewed.sql` and `native-gift-cutover-evidence.json`. The cutover SQL deliberately raises while its actual scope readback is false; regenerate it after a real grant.

## Deployment and activation order

1. Apply `20261030123000_gift_card_atomic_issuance.sql` before deploying its caller. This prerequisite is already applied by the parent. It fixes the existing MOSE timestamp-check/insert-loop race with one paid-order transaction, a unique order-item/unit key and retry of the same pending capability. It does not issue cards on installation.
2. Apply `20261030130000_native_gift_cutover.sql` and `20261030133000_native_gift_amount_catalog.sql`. Both are dormant: they seed no Shopify binding and switch no issuer or checkout flag.
3. After reviewing the actual native product/Headless identity, apply the prepared registry binding. This records existing variants; it creates no product, cart, order or card.
4. Complete the explicit app permission approval for `write_products`, and verify the actual installed scopes afterward. The resolver checks that real grant before any append. No `read_gift_cards` or `write_gift_cards` is needed for this native product route. If publication requires a separate permission, keep the product published manually through the owner's existing admin access; never bypass a missing sales-channel publication.
5. Set server `SHOPIFY_NATIVE_GIFT_CATALOG_WRITES_ENABLED=true` only when actual app access and the native product registration are correct. The controlled, CSRF-protected admin POST `/api/admin/shopify/gift-catalog` accepts `{amountCents:2001}` to prepare and verify a custom EUR 20.01 variant. It never creates a cart, payment or code. It requires a real Vercel buyer IP or an explicitly configured development buyer IP, never a fabricated address.
6. Verify the owner UI settings against the native product: gift-only automatic fulfillment, EUR issuance and **never expires**. Then invoke `activate_native_gift_checkout` with the exact native product-ID array, a meaningful review reference and `p_expiry_policy='never'`. That transaction locks the writer fence, refuses any existing MOSE card or unresolved legacy gift obligation, closes all subsequent MOSE gift/admin/refund issuance and legacy gift-order inserts, and changes only the local gift expiry metadata to NULL. Invalidate `public-catalog` after the update. The native frontend then says 'Geen vervaldatum' / 'No expiry date'. Until this actual switch, the existing MOSE route keeps its 12-month metadata.
7. Require the measured `nativeGiftRuntime` check plus the existing stock, fulfillment, market, benefits and queue checks before switching public checkout. It verifies the exclusive issuer fence and an already provisioned EUR 20 variant against live Admin/Storefront data with `allowCreate:false`; an admin readiness GET cannot silently create variants. Perform actual no-payment cart probes for a gift alone, a gift with own stock/POD, the same value to two recipients, and mixed gift/promo/tier/points allocations. Do not claim paid issuance, email delivery or refund execution was tested by those cart probes.

The existing global release switches remain separate: `SHOPIFY_CHECKOUT_ENABLED`, `SHOPIFY_BENEFITS_VERIFIED` and `NEXT_PUBLIC_SHOPIFY_CHECKOUT_ENABLED`, together with the shared cutover timestamp, inventory ownership transfer and current worker evidence. This work sets none of them.

## Input, money and recovery

Physical lines retain their original server variant authorization. `giftCards` is a separate validated input: the one known local product, integer cents from EUR 20.00 through EUR 1,000.00, and bounded quantities/recipient fields. The request amount selects a denomination; it never overwrites a Shopify price. Current local configuration, actual native variant price and actual channel availability are checked again before returning a payable URL.

Native recipient properties use Shopify's case-sensitive names. Messages, including the optional sender prefix, are limited to 200 characters. Scheduling is a date, not an exact delivery time, and is bounded to 90 days. Recipient data and a server HMAC are bound to the durable attempt and checked against the returned cart lines. Two recipients sharing a denomination retain distinct lines. Benefit proofs aggregate only financially identical variant lines and reject gift-value discount allocations. The gift face value is excluded from promotions, quantity discounts, tier savings and points redemption. Gift-only bags have no shipping estimate or gift-value VAT.

The amount registry is append-only. It preserves the standalone default variant, never reprices an existing value or removes variants referenced by open checkouts, and fences uncertain mutations. New-value creation is bounded by the actual provider/product capacity and a rolling 25-value/hour budget. An unavailable or uncertain value fails visibly while preserving the basket; existing verified amounts remain usable. This is not an unlimited-denomination guarantee.

An unconfirmed catalog value cannot silently rotate an older payable attempt. The rejection path first fences the supplied attempt and permits a new attempt only after proving that no cart was issued. A lost provider response never authorizes a second product mutation or a second paid cart.

The loyalty adapter corroborates all cash/gift tender captures and refunds against Admin totals, but awards/reverses points only on external cash spend, matching the previous net-paid policy. Refunds must reference their original capture/sale and the same tender class. Native Shopify performs gift purchase deactivation and redemption refunds; MOSE does not credit a parallel wallet.

## Sources

- [Native gift product mutation and defaults](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/giftCardProductSet)
- [Native recipient properties and limits](https://shopify.dev/docs/storefronts/themes/product-merchandising/gift-cards)
- [Gift expiry and automatic fulfillment settings](https://help.shopify.com/en/manual/products/gift-card-products/modify-gift-card-settings)
- [Native gift refunds and deactivation](https://help.shopify.com/en/manual/products/gift-card-products/manage-purchased-gift-cards)
