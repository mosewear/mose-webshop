-- Fix: move_product_order returned `column reference "id" is ambiguous`.
--
-- The previous version declared `RETURNS TABLE (id UUID, display_order INTEGER)`.
-- Inside the function body, bare references like `WHERE id = ...` and
-- `WHERE id <> p_product_id` collide with those OUT parameter names —
-- Postgres can't tell whether the bare `id` means the products.id
-- column or the implicit OUT variable, and refuses to execute.
--
-- The fix is purely cosmetic: rename the OUT columns to `result_id`
-- and `result_display_order` so the inner SQL is unambiguous, and
-- assign them via OUT-variable syntax (`result_id := ...; RETURN NEXT;`)
-- instead of `RETURN QUERY SELECT ...` so we don't have to repeat the
-- column types in every branch.
--
-- The admin UI never reads the returned row directly (it refetches
-- the product list afterwards), so the column rename is safe even
-- with auto-generated TypeScript types updated to match.
--
-- Note: Postgres refuses to change the row-type of an existing
-- function via CREATE OR REPLACE (SQLSTATE 42P13), so we DROP first.

DROP FUNCTION IF EXISTS public.move_product_order(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.move_product_order(
  p_product_id UUID,
  p_direction TEXT
)
RETURNS TABLE (result_id UUID, result_display_order INTEGER)
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
    SELECT p.id, p.display_order
      INTO v_neighbour_id, v_neighbour_order
      FROM products p
      WHERE p.display_order < v_current
      ORDER BY p.display_order DESC, p.created_at ASC
      LIMIT 1
      FOR UPDATE;

    IF v_neighbour_id IS NULL THEN
      result_id := p_product_id;
      result_display_order := v_current;
      RETURN NEXT;
      RETURN;
    END IF;

    UPDATE products SET display_order = v_current
      WHERE products.id = v_neighbour_id;
    UPDATE products SET display_order = v_neighbour_order
      WHERE products.id = p_product_id;

    result_id := p_product_id;
    result_display_order := v_neighbour_order;
    RETURN NEXT;
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
      result_id := p_product_id;
      result_display_order := v_current;
      RETURN NEXT;
      RETURN;
    END IF;

    UPDATE products SET display_order = v_current
      WHERE products.id = v_neighbour_id;
    UPDATE products SET display_order = v_neighbour_order
      WHERE products.id = p_product_id;

    result_id := p_product_id;
    result_display_order := v_neighbour_order;
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_direction = 'top' THEN
    SELECT COALESCE(MIN(p.display_order), 0) - 1
      INTO v_target
      FROM products p
      WHERE p.id <> p_product_id;
    UPDATE products SET display_order = v_target
      WHERE products.id = p_product_id;
    result_id := p_product_id;
    result_display_order := v_target;
    RETURN NEXT;
    RETURN;
  END IF;

  -- direction = 'bottom'
  SELECT COALESCE(MAX(p.display_order), 0) + 1
    INTO v_target
    FROM products p
    WHERE p.id <> p_product_id;
  UPDATE products SET display_order = v_target
    WHERE products.id = p_product_id;
  result_id := p_product_id;
  result_display_order := v_target;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.move_product_order(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_product_order(UUID, TEXT)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.move_product_order(UUID, TEXT) IS
  'Atomically reorders a product in the /shop manual ordering. direction in (up, down, top, bottom). Returns the row''s new display_order so the admin UI can show the resolved position without a re-fetch. OUT columns are prefixed result_* to avoid colliding with products.id / products.display_order inside the function body (would otherwise raise: column reference "id" is ambiguous).';
