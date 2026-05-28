-- Manual product ordering for the storefront /shop grid.
--
-- Until now the shop was hard-coded to ORDER BY created_at DESC.
-- Merchants could not curate which silhouette greeted a visitor on
-- the page-fold; the only lever was timing a re-save (which is a
-- terrible UX). This migration adds a real display_order column
-- plus the supporting trigger + RPC so the admin "move up / down /
-- top" buttons land on a single atomic database call.
--
-- Convention
-- ----------
-- * `display_order` is INTEGER NOT NULL. SMALLER value = HIGHER in
--   the grid (1 = first tile, MAX = last). Negative values are
--   allowed so "move to top" can simply set display_order = MIN-1
--   without forcing a full rewrite of every other row.
-- * Tiebreaker is created_at DESC, so any rows that happen to share
--   the same value still produce a stable order (and `expandToShopTiles`
--   keeps color variants of the same product clustered).
-- * Newly inserted products land at the END of the manual queue via
--   the BEFORE INSERT trigger. The merchant promotes them with the
--   arrows. (Defaulting new products to the TOP would jump them
--   above any deliberately curated tiles, which is the opposite of
--   what curation means.)

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN products.display_order IS
  'Manual sort key for the /shop grid. Smaller = higher in the page (1 = first tile). Tiebreaker is created_at DESC. Managed via the move_product_order(product_id, direction) RPC from /admin/products. New products auto-land at the end of the queue via the products_assign_display_order BEFORE INSERT trigger.';

-- One-shot backfill: snapshot the existing chronological order so
-- the shop looks identical the moment this migration deploys. Newest
-- products keep their current top-of-grid position with display_order=1.
WITH ordered AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY created_at DESC, id) AS rn
  FROM products
)
UPDATE products p
SET display_order = ordered.rn
FROM ordered
WHERE p.id = ordered.id
  AND p.display_order = 0; -- only touch unset rows (idempotent re-runs)

CREATE INDEX IF NOT EXISTS idx_products_display_order
  ON products (display_order ASC, created_at DESC);

-- New-product trigger: place fresh inserts at the bottom of the
-- manual queue. We only auto-assign when the caller did not pass a
-- value (display_order = 0, the column default), so admin tooling can
-- still inject an explicit position when needed.
CREATE OR REPLACE FUNCTION public.products_assign_display_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.display_order IS NULL OR NEW.display_order = 0 THEN
    SELECT COALESCE(MAX(display_order), 0) + 1
      INTO NEW.display_order
      FROM products;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_assign_display_order ON products;
CREATE TRIGGER products_assign_display_order
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_assign_display_order();

-- =========================================================
-- move_product_order(product_id, direction) — atomic reorder
-- =========================================================
--
-- direction values:
--   'up'     swap with the neighbour immediately above (smaller
--            display_order) — no-op when already at the top
--   'down'   swap with the neighbour immediately below — no-op when
--            already at the bottom
--   'top'    set display_order = MIN(display_order) - 1 (cheap O(1))
--   'bottom' set display_order = MAX(display_order) + 1
--
-- Done in a single SECURITY DEFINER function so the swap is one
-- transaction (no risk of two products ending up with the same
-- value due to a partial UPDATE), and so we can grant EXECUTE to
-- the authenticated role and gate the actual permission via
-- requireAdmin() on the API route that invokes this.

CREATE OR REPLACE FUNCTION public.move_product_order(
  p_product_id UUID,
  p_direction TEXT
)
RETURNS TABLE (id UUID, display_order INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current INTEGER;
  v_neighbour_id UUID;
  v_neighbour_order INTEGER;
  v_target INTEGER;
BEGIN
  IF p_direction NOT IN ('up', 'down', 'top', 'bottom') THEN
    RAISE EXCEPTION 'invalid direction: %', p_direction
      USING ERRCODE = '22023';
  END IF;

  SELECT p.display_order INTO v_current
    FROM products p
    WHERE p.id = p_product_id
    FOR UPDATE;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'product not found: %', p_product_id
      USING ERRCODE = 'P0002';
  END IF;

  IF p_direction = 'up' THEN
    -- Find the neighbour immediately above (largest order smaller
    -- than current). Lock both rows to make the swap atomic.
    SELECT p.id, p.display_order
      INTO v_neighbour_id, v_neighbour_order
      FROM products p
      WHERE p.display_order < v_current
      ORDER BY p.display_order DESC, p.created_at ASC
      LIMIT 1
      FOR UPDATE;

    IF v_neighbour_id IS NULL THEN
      -- Already at the top — no-op.
      RETURN QUERY SELECT p_product_id, v_current;
      RETURN;
    END IF;

    UPDATE products SET display_order = v_current
      WHERE id = v_neighbour_id;
    UPDATE products SET display_order = v_neighbour_order
      WHERE id = p_product_id;

    RETURN QUERY SELECT p_product_id, v_neighbour_order;
    RETURN;
  END IF;

  IF p_direction = 'down' THEN
    SELECT p.id, p.display_order
      INTO v_neighbour_id, v_neighbour_order
      FROM products p
      WHERE p.display_order > v_current
      ORDER BY p.display_order ASC, p.created_at DESC
      LIMIT 1
      FOR UPDATE;

    IF v_neighbour_id IS NULL THEN
      RETURN QUERY SELECT p_product_id, v_current;
      RETURN;
    END IF;

    UPDATE products SET display_order = v_current
      WHERE id = v_neighbour_id;
    UPDATE products SET display_order = v_neighbour_order
      WHERE id = p_product_id;

    RETURN QUERY SELECT p_product_id, v_neighbour_order;
    RETURN;
  END IF;

  IF p_direction = 'top' THEN
    SELECT COALESCE(MIN(display_order), 0) - 1
      INTO v_target
      FROM products
      WHERE id <> p_product_id;
    UPDATE products SET display_order = v_target
      WHERE id = p_product_id;
    RETURN QUERY SELECT p_product_id, v_target;
    RETURN;
  END IF;

  -- direction = 'bottom'
  SELECT COALESCE(MAX(display_order), 0) + 1
    INTO v_target
    FROM products
    WHERE id <> p_product_id;
  UPDATE products SET display_order = v_target
    WHERE id = p_product_id;
  RETURN QUERY SELECT p_product_id, v_target;
END;
$$;

REVOKE ALL ON FUNCTION public.move_product_order(UUID, TEXT) FROM PUBLIC;
-- Authenticated callers go through the requireAdmin() wrapper on the
-- /api/admin/products/reorder route; the function itself is just a
-- thin SQL primitive so we let authenticated execute. The route is
-- the actual auth boundary.
GRANT EXECUTE ON FUNCTION public.move_product_order(UUID, TEXT)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.move_product_order(UUID, TEXT) IS
  'Atomically reorders a product in the /shop manual ordering. direction in (up, down, top, bottom). Returns the row''s new display_order so the admin UI can show the resolved position without a re-fetch.';
