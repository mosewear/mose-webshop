-- Make `is_active` the single publish-toggle for products and stop
-- new products from getting silently stuck at status='draft'.
--
-- Background
-- ----------
-- The admin UI exposes one toggle per product ("Actief / Inactief")
-- which writes the boolean column `products.is_active`. There is also
-- a legacy `products.status` text column whose default is 'draft' and
-- which never appears anywhere in the admin UI.
--
-- The public storefront, sitemap, product feed, etc. all filter on
-- BOTH columns:  is_active = true  AND  status = 'active'.
--
-- Net effect: any product the merchant creates through the admin UI
-- is invisible on the storefront, even after they flip the toggle to
-- "Actief", because `status` never moves off its default 'draft'.
--
-- Fix
-- ---
-- 1) Change the column default from 'draft' to 'active' so newly
--    inserted rows that omit `status` (which is what the admin does)
--    are immediately publishable via the is_active toggle.
-- 2) Backfill existing products where the merchant clearly intended
--    the product to be visible (is_active = true) but the row is
--    still pinned to 'draft'. We deliberately do NOT touch products
--    that are is_active = false — those are intentionally hidden.
--
-- Idempotent: ALTER ... SET DEFAULT and the conditional UPDATE can
-- both safely run multiple times.

ALTER TABLE products
  ALTER COLUMN status SET DEFAULT 'active';

UPDATE products
SET status = 'active',
    updated_at = NOW()
WHERE is_active = TRUE
  AND status = 'draft';
