# Checkout release: verified integration state

28 October 2026. Integration branch `fix/mose-checkout-completion`.

Implemented and locally verified: native customer-bound promo/tier/points issuance; durable cart attempts and lost-response protection; automatic allocation and original-price proof; server-owned local catalog prices; customer account order ownership; stock evidence and atomic legacy adjustment/receipt/return bridge; paid/refund outboxes; definitive rejected-cart coupon revocation recovery; private eight-model sample checkout. Public checkout stays gated until computed runtime, inventory, benefit, market and fulfillment evidence is fresh.

Provider validation: own-organization Shopify client-credentials grant has the approved inventory/customer/discount writes and existing order/location/product reads; official Headless private token read succeeds. Credentials are production-sensitive environment variables, never browser-facing or committed. All eleven migration files ran together against the actual Supabase schema inside BEGIN/ROLLBACK; subsequent read confirms zero integration objects, unchanged function definitions and 54 accounts / 6104 points. No live migration committed as of this document update.

Verification: 529 Vitest tests including rejected-input safety and malformed financial health evidence; production build, TypeScript and targeted lint passed. Latest targeted checkout tests 29 pass. 247 real PostgreSQL17 shared-ledger/migration/RLS/concurrency assertions, 64 stock bridge assertions, 30 rejected-benefit recovery assertions pass. Final combined test count is recorded in task outputs after final changes.

Remaining activation dependencies: install tracked database migrations with an explicit legacy-writer rollout; approved server configuration and webhook registration; reviewed per-variant ownership/stock transfer; official Sendcloud Shopify integration with MOSE-location filtering and partial fulfillments; market/shipping/pickup/benefit parity; private sample publication and eight-line checkout proof. Supplier physical samples remain required before public Tapstitch release. No payable test order has been submitted.

Merchant actions: Shopify Payments ownership declaration/remediation must be completed personally; PayPal account finalization is in progress with the merchant. iDEAL/Wero currently reports ineligible; managed payment methods are enabled and automatic capture at checkout is selected. Do not claim payment readiness while Shopify reports paused sales.
