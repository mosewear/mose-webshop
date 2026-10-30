# Promotion and loyalty cutover review — 30 October 2026

## Current local obligations

A service-side read at 10:38 UTC found 22 active, unexpired, non-exhausted promotion rules. All are percentages: 7.5%, 10%, 15%, 20% or 25%. Minimum order is zero, usage limit is one or unlimited, and there are no active quantity-discount tiers. Existing customer promo usage counters were unchanged in the post-probe read at 10:41 UTC.

There is no separate 22-code Shopify mapping table. Checkout reads the current local rule, computes eligibility from authoritative lines, atomically reserves its local usage, and issues an attempt-specific one-use Shopify code. Directly importing the original codes into Shopify would bypass this shared usage accounting and is not an equivalent migration.

The public catalogue currently has 12 active products, including a gift card. Gift checkout/discount eligibility remains a separate unsupported contract; this review does not override it.

## Fresh provider observations

Existing isolated, unpaid allocation probes were repeated against API 2026-10. They created no order or payment and used no customer promo code, customer point balance or reservation.

Private trace: `allocation-probes-03460d61-7fa3-4ae2-ba9e-231f1991a9ea.json` (outside Git). All ten cases passed exact line eligibility, per-code cents and final merchandise cents. All 14 temporary codes were deactivated and read back with zero uses.

The measured merchandise subtotal was 19,700 cents across two variants and three units.

| Case | Expected and observed discount cents |
| --- | --- |
| 7.5% | 1,477 |
| 10% | 1,970 |
| 15% | 2,955 |
| 20% | 3,940 |
| 25% | 4,925 |
| 10% plus silver | 1,970 + 985 |
| 10% plus gold | 1,970 + 1,970 |
| Points-equivalent fixed amount | 500 |
| 10% plus gold plus points-equivalent | 1,970 + 1,970 + 500 |
| Grouped quantity reduction | 1,500 |

These observations prove the existing native arithmetic contract, not paid loyalty accrual, refunds, gift balance migration, real point reservation or fulfillment. Native percentage discounts truncate aggregate cents; the existing provider-specific validation path quotes this contract, while the legacy path retains its original rounding.

Loyalty and benefit health RPCs at 10:41 UTC both returned reviewed cutovers, fresh worker heartbeats, zero pending work and zero dead letters. Health does not substitute for payment/settlement evidence.

## Fixed handoff regression

The cart drawer stores an applied promotion in `mose_promo_code`, but the Shopify handoff previously started with an empty promo field. The handoff now restores the code, validates its basic format, and sends only the code to the server; a stored discount amount never authorizes a discount.

A locked checkout attempt remains authoritative, including when it contains no promo. Another tab's saved code cannot silently change its benefits fingerprint. Regression tests cover inherited cart codes, ignored client discount amounts and locked attempts with and without a promo.

## Release state

No checkout/benefit readiness flags or customer rules were changed. The previous parity evidence expired at 09:28 UTC and its fingerprint predates the current catalogue. The new versioned arithmetic evidence scope is physical-only, matching the existing checkout quote that rejects every gift line. Digital contract and balance gates stay independent and closed. Gift rows remain in the catalogue fingerprint. No verification row was fabricated or re-dated.

Before a public cutover, settle the digital contract independently, freeze the final product/variant/mapping configuration, and record new measured evidence only if its actual requirements pass. Current configuration changes invalidate previous fingerprints. The fresh observations above must not be used as a blanket green gate.

Official native discount reference: https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/discountCodeBasicCreate
