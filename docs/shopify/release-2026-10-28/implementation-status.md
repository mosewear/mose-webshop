# Checkout release: verified integration state

Updated 28 October 2026 after production and browser verification. Production code: merged PR #20, commit 92b3f8c962882abb8bff8fabe8d408983b1c214b.

## Installed and verified

All eleven tracked database migrations are installed. Reviewed mappings cover 63 supplier and 27 own-stock variants; all 90 mappings remain disabled, with no ownership or stock transfer. The earlier transaction-only rehearsal is no longer the current installation state. The production deployment uses checkout.mosewear.com; its DNS and TLS are active without changing the main website or mail routing.

The approved backend app and private Headless access are configured. Ten webhook subscriptions are registered. Actual Shopify product-update deliveries reached the authenticated application endpoint after a narrowly scoped firewall rule; invalid signatures still return 401. This is not evidence of a paid order or fulfillment test.

The official Sendcloud Shopify integration is installed. Shipment feedback waits for a carrier scan, Shopify order numbers are used for customs invoices, and duplicate Sendcloud tracking notifications are disabled. Product-location separation and mixed partial fulfillment still need order-level verification. No paid labels or subscriptions were purchased.

Tapstitch uses the custom MOSE Netherlands shipping profile and international fulfillment. Supplier payment remains manual. All eight models have approved labels and hangtags; hoodie chest artwork is black 6 cm DTF, raglan chest artwork is black 6 cm DTG, and trousers have no chest artwork. Twenty generated product images were updated, including five recentered neck-label details. Five rear views were preserved. These are visualizations; actual manufacturing placement requires physical sample inspection.

Shopify store name is MOSE. Password protection is disabled. The eight sample products remain unlisted and available only through the intended Headless publication. The sample checkout displays eight size-M items totaling EUR 658, free Netherlands shipping, and EUR 114.21 included VAT after the merchant-provided Netherlands VAT registration was saved. VAT invoices are enabled. Prices remain VAT inclusive. The tax identifier is stored in Shopify, not in this repository.

The custom supplier profile charges EUR 4.95 below EUR 100 and offers free shipping from EUR 100, with production 1–3 working days and transit 5–14 working days. An unpaid Tapstitch eight-item quote was EUR 256.16 after the merchant's sample discount, including EUR 83.62 shipping. Import VAT, duties and carrier fees are not proven included; supplier rate changes require requoting before payment. Discount credentials are not recorded here.

Shopify Payments accepts payments; the payout resumption date shown was 1 November 2026. Cards, Klarna and express wallets are visible in checkout. iDEAL/Wero remains provider-ineligible and cannot be enabled by a merchant toggle.

## Validation and release gates

Code validation for PR #20 passed: 529 Vitest tests, TypeScript, lint and production build; 247 PostgreSQL migration/RLS/concurrency assertions, 64 stock-bridge assertions and 30 benefit-recovery assertions. Configuration changes above were verified through live UI and application evidence, not additional code tests.

Public Shopify checkout remains gated. Outstanding: physical supplier sample approval; own-stock ownership/cutover and legacy pending-order reconciliation; benefit, loyalty and worker runtime evidence; mixed-location/partial-fulfillment and returns verification; a merchant-paid end-to-end order and reconciliation. One later private sample-cart attempt has unknown outcome without a persisted provider cart ID and must not be blindly released or retried. The earlier ready sample checkout is available; no payment was submitted by the agent.

The social-sharing image upload remains unresolved. iDEAL availability depends on Shopify's eligibility review. Supplier import-tax handling and custom outer packaging are not established. These limits must remain visible in handoff; do not describe the complete launch as flawless or fully verified.
