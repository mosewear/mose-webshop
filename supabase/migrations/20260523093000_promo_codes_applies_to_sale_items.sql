-- promo_codes.applies_to_sale_items — opt-in per code to allow
-- stacking on sale-priced products (i.e. line items where sale_price
-- IS NOT NULL AND sale_price < base_price).
--
-- Default false preserves the existing "geen korting op korting" rule
-- so MOSE10 / WELCOME10-* / SPRING10 keep behaving exactly the same.
-- Admins explicitly tick the box on codes that should also work on
-- sale items (typical use: a one-off site-wide flash code).
--
-- Note on staffel interplay: this toggle ONLY affects the sale-item
-- exclusion. Promos remain mutually exclusive with staffel discounts
-- (see /api/checkout and /api/validate-promo-code) — that's a
-- separate no-stacking rule.

ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS applies_to_sale_items BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN promo_codes.applies_to_sale_items IS
  'When true, this code can be applied on top of sale_price items (stacking allowed). Default false matches the historical no-sale-stacking behaviour.';
