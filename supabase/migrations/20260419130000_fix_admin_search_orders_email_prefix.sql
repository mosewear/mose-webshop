-- Fix admin_search_orders_for_return:
-- 1) Default list: show recent orders in any status (admin needs non-delivered orders too).
-- 2) Search: only treat the term as an order-ID prefix if it looks like hex (UUID fragment).
--    Strings like "h.schlimback" must match email via ILIKE, not id::text.

CREATE OR REPLACE FUNCTION public.admin_search_orders_for_return(p_query text, p_limit int DEFAULT 100)
RETURNS SETOF public.orders
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text := trim(coalesce(p_query, ''));
  q_no_hash text;
  id_candidate text;
  is_order_id_prefix boolean;
  lim int;
BEGIN
  lim := coalesce(nullif(p_limit, 0), 100);
  IF lim < 1 OR lim > 500 THEN
    lim := 100;
  END IF;

  IF length(q) < 3 THEN
    RETURN QUERY
    SELECT o.*
    FROM public.orders o
    ORDER BY o.created_at DESC
    LIMIT lim;
    RETURN;
  END IF;

  q_no_hash := trim(both '#' from q);
  id_candidate := replace(replace(q_no_hash, '-', ''), ' ', '');
  is_order_id_prefix := (
    length(id_candidate) >= 3
    AND id_candidate ~ '^[0-9A-Fa-f]+$'
  );

  IF q_no_hash LIKE '%@%' THEN
    RETURN QUERY
    SELECT o.*
    FROM public.orders o
    WHERE o.email ILIKE '%' || q_no_hash || '%'
    ORDER BY o.created_at DESC
    LIMIT lim;
    RETURN;
  END IF;

  IF is_order_id_prefix THEN
    RETURN QUERY
    SELECT o.*
    FROM public.orders o
    WHERE o.id::text ILIKE q_no_hash || '%'
       OR replace(o.id::text, '-', '') ILIKE replace(q_no_hash, '-', '') || '%'
    ORDER BY o.created_at DESC
    LIMIT lim;
    RETURN;
  END IF;

  -- Local-part / partial email without @ (e.g. h.schlimback, schlimback)
  RETURN QUERY
  SELECT o.*
  FROM public.orders o
  WHERE o.email ILIKE '%' || q_no_hash || '%'
  ORDER BY o.created_at DESC
  LIMIT lim;
END;
$$;
