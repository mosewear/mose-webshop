-- Seed the VVA2000 promo code.
--
-- VVA2000 = 7.5% extra korting that ALSO applies on sale-priced items
-- (stacking on top of any active sale_price). This is the first MOSE
-- code that opts in to the new `applies_to_sale_items` toggle added
-- in migration 20260523093000.
--
-- ON CONFLICT block keeps the seed idempotent so re-running migrations
-- on a database where the code was already inserted by hand (e.g. via
-- the Supabase API or the admin UI) updates the canonical values
-- instead of throwing a unique-violation.

INSERT INTO promo_codes (
  code,
  description,
  discount_type,
  discount_value,
  min_order_value,
  usage_limit,
  expires_at,
  is_active,
  applies_to_sale_items
) VALUES (
  'VVA2000',
  'Extra 7,5% korting — stapelt ook bovenop sale-prijzen.',
  'percentage',
  7.5,
  0,
  NULL,
  NULL,
  true,
  true
)
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  min_order_value = EXCLUDED.min_order_value,
  expires_at = EXCLUDED.expires_at,
  is_active = EXCLUDED.is_active,
  applies_to_sale_items = EXCLUDED.applies_to_sale_items,
  updated_at = NOW();
