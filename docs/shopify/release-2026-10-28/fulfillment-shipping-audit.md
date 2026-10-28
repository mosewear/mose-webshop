# Fulfillment and shipping release audit — 28 October 2026

Code baseline: `c014192`. This audit does not certify live store settings, delivery costs or physical samples. Browser configuration and live order evidence are separate release steps.

## One checkout, separate fulfillment owners

Every sellable MOSE variant, including existing own-stock garments, needs one reviewed native Shopify variant and an explicit fulfillment owner/location. The eight Tapstitch models alone do not cover the existing store catalog. Never route own-stock products through ODMPOD or supplier products through Sendcloud. Current Shopify order screens read separate Shopify snapshots; legacy MOSE `orders`/Mollie/Sendcloud operations do not receive the Shopify snapshot IDs. Keep that separation rather than inserting supplier lines into legacy orders merely to make a label.

Shopify's global automatic fulfillment is unsuitable for this mixed catalog: it can mark own-stock garments fulfilled before MOSE ships them. Keep manual fulfillment; the official Tapstitch app imports paid connected-store orders independently. A custom MOSE fulfillment-request mutation is not needed for that import. `fulfillmentOrderSubmitFulfillmentRequest` would require `write_third_party_fulfillment_orders`, which is beyond the approved read-only app scope.

The current order query needs `read_orders`, `read_merchant_managed_fulfillment_orders` and `read_third_party_fulfillment_orders`; fulfillment order results are scope-filtered, so a successful HTTP/GraphQL response alone does not prove both routes are visible. Products, inventory and locations require their corresponding read scopes. Verify the actual installed grants and an order with both fulfillment owners. No customer postal/email field is fetched by the current projection.

## Payment and supplier production are separate

Shopify captures the retail payment. Tapstitch separately charges the merchant for production/shipping. Prefer capture at checkout when the provider supports it: capture only after fulfillment is incompatible with suppliers waiting for paid orders. Verify the actual active payment provider, enabled EUR/NL methods and whether live versus test mode is intended. No paid test was performed by this audit.

Tapstitch's official 7 October 2026 instructions say paid orders normally sync within about five minutes, then the store's submission strategy applies. Manual submission deliberately leaves them pending for review and supplier payment. Automatic submission needs a linked card and uses wallet balance before cards; without a card it is unavailable/reverts to manual. For Rick's sample order, manual submission permits checking all eight designs, branding, quantities, sizes, NL delivery and the private supplier sample coupon before he pays Tapstitch. A paid Shopify sample order therefore does **not** prove production has started.

Do not claim a Tapstitch supplier sample coupon is a Shopify retail discount. Verify its applicable checkout, expiry, eligible items, discount amount and final supplier total without exposing the private code. Do not automatically transfer it to customer-facing Shopify discount configuration.

## Shipping and markets

Retain Tapstitch automatic shipping profile assignment for all eight products. The supplier manages those profiles and specifically warns against manually editing them in Shopify. Own MOSE stock needs a separate merchant location and reviewed shipping rates. Shipping must be enabled from the actual supplier location (ODMPOD), not left under “Not shipping from”.

Traditional Shopify shipping profiles generally add applicable profile/location rates together. Identical rate names combine corresponding options; different names may combine cheapest options as “Shipping”. Some upgraded stores instead have shipping options by market, which use the highest matching rate rather than adding them. Inspect which model this store actually uses. Do not assume free shipping or derive an eight-garment charge by adding eight single-item quotes.

Current custom MOSE gateway accepts NL/EUR only. That restriction must be explicit for the private sample test. It does not establish parity for the old storefront's other countries. Check one fresh checkout for each: one supplier garment; all eight supplier garments; one own-stock item; and a mixed own-stock/supplier basket. Verify address eligibility, final shipping/tax/duties, rates after discounts, package split and total before payment. Old abandoned checkouts may retain old rates and are unsuitable for validating changed shipping settings.

## Tracking, returns and customer ownership

Order projections already preserve successful fulfillments per line/package, exclude failed/cancelled fulfillments, sanitize tracking URLs, and hide supplier routing/account proof from customers. Admin order links were corrected to this store's permanent Shopify admin route, `admin.shopify.com/store/hp5szr-te/orders/<id>`, instead of the unrelated `mosewear.myshopify.com` host.

The application is intentionally read-only for Shopify refunds and fulfillment actions. Use Shopify admin for the retail refund; process any supplier claim/cancellation separately. Refunding a Shopify payment must not be represented as an automatic Tapstitch production cancellation or supplier refund. Tapstitch states cancellation is available while “In Review”; production can remove that possibility. Its supplier sample policy excludes samples from ordinary returns. Customer-facing MOSE return obligations must be considered separately from supplier reimbursement rules.

Verify shipment tracking with an actual fulfilled supplier order and own-stock shipment. The order account link relies on the server-verified account proof from checkout; guest orders remain accessible via their Shopify confirmation, not matching arbitrary emails.

## Explicit blockers before declaring the sample checkout ready

1. The current inventory collector marks every untracked supplier inventory observation unknown; ODMPOD's `9999999` sentinel is intentionally not genuine stock. A private made-to-order sample pathway must explicitly support supplier availability, or use a directly prepared supplier sample cart. Do not invent tracked stock or clear this blocker by copying the sentinel.
2. Existing `sample_verified` release gates require physical quality evidence. Do not set them true merely to order the first sample. Separate private sample testing from public product release.
3. Complete native Shopify mappings and actual merchant stock/location evidence for existing active MOSE garments before global checkout cutover. An eight-item supplier-only test is a narrower scenario.
4. Prove server credentials, database migrations/RLS/leases, synchronization health, benefits parity, payment settings and actual delivery quote. Do not turn manual broad flags on in place of those proofs.
5. Rick performs the paid sample order. No payment, card linkage, production submission, support message or physical sample assessment was performed by this audit.

## Official references

- [Tapstitch auto order submission, updated 7 October 2026](https://www.tapstitch.com/help-center/faq/detail/How-to-set-up-Auto-Order-Submission)
- [Tapstitch automatic payments](https://www.tapstitch.com/help-center/faq/detail/How-to-set-up-auto-payments)
- [Tapstitch Shopify shipping profiles, updated 13 July 2026](https://www.tapstitch.com/help-center/faq/detail/How-to-set-shipping-rates-on-Shopify-stores)
- [Shopify fulfillment settings](https://help.shopify.com/en/manual/checkout-settings/order-processing)
- [Shopify payment capture and supplier incompatibility](https://help.shopify.com/en/manual/payments/payment-authorization)
- [Shopify fulfillment orders access filtering](https://shopify.dev/docs/api/admin-graphql/2026-10/queries/fulfillmentOrders)
- [Shopify fulfillment request mutation and required write scope](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/fulfillmentOrderSubmitFulfillmentRequest)
- [Shopify combining profile rates](https://help.shopify.com/en/manual/fulfillment/setup/shipping-profiles/combined-shipping-rates)
- [Shopify shipping options by market](https://help.shopify.com/en/manual/fulfillment/setup/shipping-options)
- [Shopify fresh checkout shipping tests](https://help.shopify.com/en/manual/fulfillment/setup/shipping-rates/troubleshooting)
- [Tapstitch returns and cancellation policy](https://www.tapstitch.com/help-center/faq/detail/Returns-Policy)

## Live read-only catalog evidence

The newly approved MOSE server app successfully read the store catalog using its own client-credentials token held only in memory. The fixed store is `hp5szr-te.myshopify.com`, EUR. This read did not modify inventory/products or reuse CLI credentials.

Supabase currently has exactly three active physical products: Classic Sweater (6 variants, 27 units, €75), Essential Hoodie (9 variants, 53 units, €79), and Tee (12 variants, 39 units, €50). All 27 variants have exact unique native Shopify counterparts by product handle and Kleur/Maat options, with cent-identical prices. All 27 native variants are tracked and assigned to active online merchant location `gid://shopify/Location/116354154823`; every Shopify available quantity is currently zero and all three products are DRAFT. The supplier's eight products are also DRAFT and all 63 variants remain untracked at ODMPOD.

The 119 local units are a timestamped observation, not instructions to transfer stock blindly: four locally available variants currently have zero stock, and existing Mollie orders can still settle. A cutover must account for concurrent and late payments before changing the authoritative stock source. No stock was transferred.

Private workspace outputs `outputs/fulfillment-catalog-audit.json` and `outputs/own-stock-mapping-review.json` contain the source IDs, all 27 reviewed candidate mappings, quantities and prices; mappings remain disabled/unverified. They contain no tokens or customer data and were not added to the public repository. The actual catalog query was validated against Shopify's 2026-10 schema and executed successfully with the installed approved scopes. TypeScript passes for the link correction.

## Live Sendcloud integration audit

Read-only `GET /api/v2/integrations` with the existing MOSE API integration returned HTTP 200 and exactly one integration: ID `544526`, `MOSE Webshop`, system `api`, no shop URL. There is currently no connected native Shopify integration. The sanitized workspace evidence is `outputs/sendcloud-integration-audit.json`; API credentials and any raw response were not persisted.

Therefore the existing custom legacy Sendcloud label endpoint does not establish a shipment/fulfillment flow for Shopify-native own-stock orders. Before global mixed-catalog release, connect and configure the official Sendcloud Shopify integration, or implement a separately authorized merchant-fulfillment/address adapter. The official integration supports partial order fulfillment, tracking number/link feedback and order status feedback. Verify that only the merchant-managed fulfillment lines/location are sent to MOSE shipping; never create a second Sendcloud label for ODMPOD/Tapstitch lines. Verify when feedback marks fulfillment (label creation versus carrier scan) so the customer does not receive an inaccurate shipment promise. The supplier-only private eight-item sample checkout is independent of this merchant-stock shipping gap.

References: [Sendcloud Shopify integration](https://support.sendcloud.com/hc/en-us/articles/360024966852-Shopify-Integration), [supported Shopify features and partial fulfillment](https://support.sendcloud.com/hc/en-us/articles/42668871960849-Shopify-functionalities-overview), [Sendcloud fulfillment via official versus custom integrations](https://sendcloud.dev/docs/shipping/fulfill-orders).
