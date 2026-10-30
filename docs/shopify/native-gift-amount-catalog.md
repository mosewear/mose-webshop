# Native Shopify gift denomination catalogue

`resolveNativeGiftVariant(db, { productId, amountCents, buyerIp, allowCreate? })` resolves a reviewed MOSE gift product and an exact EUR denomination to a stable native Shopify variant. The caller must separately establish the native issuer cutover, recipient contract and paid auto-fulfillment. `buyerIp` must come from the existing verified server/platform context, never a client JSON field. `allowCreate: false` makes administrative readiness read-only, even if catalogue writes are enabled.

## Operator preparation

1. Obtain the actual `write_products` grant for the installed backend app. Merely adding a scope to a version form is not proof of access. The module reads `currentAppInstallation.accessScopes` before any creation. No `read_gift_cards`, `write_gift_cards` or gift transaction scope is used.
2. Manually create/review a real native gift product with one denomination option. Verify `isGiftCard: true`, active status, EUR issuance (or EUR shop default), non-taxable variants, untracked inventory and no shipping requirement. A regular product named “gift card” is insufficient for Shopify's native issuer.
3. Publish the product to the Headless channel used by the configured private Storefront token. The resolver checks actual Storefront availability and EUR price on every call. Admin `ACTIVE` alone never proves publication. This module does not acquire `write_publications` or publish a product.
4. Apply `20261030133000_native_gift_amount_catalog.sql`. It seeds no bindings, release flags or balances. Register the reviewed local/native product identity and review reference through service-side administration. Existing verified denominations can be registered before cutover; never guess IDs or prices. Product identity cannot be changed to replace a full product while old checkouts exist.
5. Enable `SHOPIFY_NATIVE_GIFT_CATALOG_WRITES_ENABLED` only after the grant, product/channel review and caller cutover checks are complete. It defaults off. Readiness and existing ready denominations do not need this write flag.

## Preservation and bounds

Amounts are integer cents between 2,000 and 100,000 and must also satisfy current active local gift-product rules. Each denomination has an immutable provider binding. Every checkout rechecks native product identity, exact price, EUR currency, tax/shipping/inventory settings and actual channel availability. Changed or deleted variants fail closed; they are never repriced or recreated automatically.

New denominations use `productVariantsBulkCreate` with `PRESERVE_STANDALONE_VARIANT`. `DEFAULT` can delete a lone default variant, so it is deliberately not used. No full-list `giftCardProductSet`, variant update or variant deletion is used. Existing/open checkouts retain their original variant IDs and prices.

The service-only registry allows one in-flight append per product. Creation has a measured global and per-product rolling cap of 25 new denominations per hour, and checks the lower of the reviewed product capacity and Shopify's current `maxProductVariants`. Existing ready amounts remain reusable when a budget is exhausted. The finite product limit means not all 98,001 possible cent values can exist simultaneously; reaching capacity is an explicit service error requiring reviewed catalogue expansion, not permission to delete an old denomination.

A lost/uncertain API response leaves the intent pending/unknown. No timeout authorizes another creation. An operator must reconcile the exact recorded intent, SKU, option and provider identity before changing that state. Successful provider identities are durably bound before returning a sellable result; channel verification failure never triggers a replacement mutation.

## Validation

All five GraphQL operations were validated against the official 2026-10 schemas. Unit tests cover default-off writes, actual grant checks, exact cent amounts, immutable prices, native flags, Storefront publication, capacity and uncertain outcomes. The isolated PostgreSQL script verifies privileges, fences, identity preservation, capacity and rolling budget without production connections.

References: [variant creation](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/productVariantsBulkCreate), [preservation strategies](https://shopify.dev/docs/api/admin-graphql/2026-10/enums/ProductVariantsBulkCreateStrategy), [shop limits](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/ShopResourceLimits), [native gift settings](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/GiftCardProductSettings), [native gift fulfillment](https://help.shopify.com/en/manual/products/gift-card-products/overview).
