# Supplier production availability and owner release

Physical supplier samples and commercial publication are separate evidence. The
owner's explicit 30 October 2026 request to sell the new clothing before sample
delivery is recorded as `owner_release_authorized_at` and
`owner_release_reference`. It does not set `sample_verified`.

`fulfillment_mode=made_to_order` is limited to verified Tapstitch mappings. The
provider inventory item, configured online fulfillment location, source model,
SKU, colour, size and EUR price must match. The provider must actually use
untracked inventory and its `CONTINUE` policy. The supplier sentinel quantity is
ignored. Local physical and presale quantities remain unchanged, including zero.

A fenced inventory worker records `status=made_to_order`,
`available_quantity=NULL`, and `SUPPLIER_MADE_TO_ORDER_VERIFIED`. The same
transaction updates the public presentation fields `supplier_orderable` and
`supplier_checked_at`. A failed or changed provider observation sets orderability
false. An old lease cannot update a remapped variant.

The shared `variant-availability.ts` helper requires enabled local availability
and a supplier observation at most fifteen minutes old. Its quantity limit of ten
is a retail order cap, not a physical stock count. The actual checkout checks
fresh mapping revision/evidence and Shopify Storefront `availableForSale` and EUR
price again before issuing a payable cart.

Shopify `UNLISTED` is active for direct-ID/handle Storefront purchase. It is
accepted only for a verified made-to-order supplier route. `DRAFT` and `ARCHIVED`
remain unavailable. See Shopify's [ProductStatus definition](https://shopify.dev/docs/api/admin-graphql/2026-10/enums/ProductStatus).

## Continuous verification

`/api/cron/shopify-inventory` is scheduled every five minutes and requires both
`SHOPIFY_SYNC_ENABLED=true` and `SHOPIFY_INVENTORY_SYNC_ENABLED=true`. Four
bounded batches cover the 27 own-stock plus 63 supplier variants across separate
locations within the existing 90-second work budget. Unknown results, expired
leases or provider failures produce HTTP 503. Missing/stale evidence blocks
checkout and is visible through the existing admin readiness inventory check.
A one-time successful read never establishes continuing readiness.

## Preparation and activation

1. Apply `20261030124000_supplier_release_contract.sql`. It changes schema and
   fenced observation handling, not stock, product publication or checkout flags.
2. Run `node work/private/prepare-supplier-release.mjs` from the task workspace.
   It reads actual provider/local identities and writes a guarded SQL review.
   The transaction expires after five minutes; reread rather than editing time.
3. Apply that reviewed configuration. It records source routing and explicit
   owner release while leaving mappings disabled and sample quality untouched.
4. Complete the separate native gift-card, promotion, shipping/market, historical
   payment and own-stock transfer conditions. Keep legacy commerce available
   while external prerequisites remain unresolved.
5. Use the existing frozen compare-and-swap transfer journal for the actual 27
   reviewed own-stock quantities, read all quantities back and record ownership.
   Never infer reservation or payment from the eleven historical pending orders.
6. Activate mappings, supplier variant availability, current inventory evidence,
   required workers and the public checkout only as a reviewed release window.
   Verify all 63 supplier variants through the real public route. Never replace
   missing runtime evidence with manual broad green flags.

Initial read-only evidence on 30 October: 63/63 supplier variants returned true
Storefront availability with exact mapped identities/prices. This is provider
availability evidence, not proof that MOSE public checkout has been activated.
