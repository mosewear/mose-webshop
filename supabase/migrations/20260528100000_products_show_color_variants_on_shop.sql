-- products.show_color_variants_on_shop
--
-- When true, the storefront shop grid renders ONE tile per unique
-- variant color for this product instead of a single product tile.
-- Each tile shows that color's per-color hero image (with the PDP's
-- fallback chain), keeps the product price, and links to
-- /product/<slug>?color=<color> so the PDP opens with that color
-- pre-selected.
--
-- Default false preserves existing behaviour (one tile per product).
-- Admins flip this on for products where multiple colors exist and
-- the merchandising benefit of a "fuller" shop grid outweighs the
-- duplication of titles on the page. Gift cards never split (they
-- have no color variants).
--
-- This flag does NOT affect:
--   * Sizes — they remain in-PDP only and are never expanded to tiles.
--   * Inventory / variants — same `product_variants` rows are used.
--   * Pricing — `sale_price` is still product-level; every color tile
--     of a product shares the same price and discount badge.
--   * Other surfaces (homepage featured, related products, search,
--     wishlist, lookbook) — those keep their one-tile-per-product
--     semantics. The flag is shop-grid specific.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS show_color_variants_on_shop BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN products.show_color_variants_on_shop IS
  'When true, the /shop page renders one tile per unique color variant of this product instead of a single product tile. Each tile links to ?color=<color> on the PDP. Default false preserves the historical one-tile-per-product behaviour. Gift cards and single-color products are unaffected.';
