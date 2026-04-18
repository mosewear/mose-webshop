-- Admin/public order lookup without PostgREST filter quirks (id::text in query params → 404 / uuid ~~* errors).
-- Called only from server routes using the service role.

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
    WHERE o.status = 'delivered'
    ORDER BY o.created_at DESC
    LIMIT lim;
    RETURN;
  END IF;

  q_no_hash := trim(both '#' from q);

  IF q_no_hash LIKE '%@%' THEN
    RETURN QUERY
    SELECT o.*
    FROM public.orders o
    WHERE o.email ILIKE '%' || q_no_hash || '%'
    ORDER BY o.created_at DESC
    LIMIT lim;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT o.*
  FROM public.orders o
  WHERE o.id::text ILIKE q_no_hash || '%'
     OR replace(o.id::text, '-', '') ILIKE replace(q_no_hash, '-', '') || '%'
  ORDER BY o.created_at DESC
  LIMIT lim;
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_order_for_tracking(p_email text, p_order_ref text)
RETURNS SETOF public.orders
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref text := trim(both '#' from trim(coalesce(p_order_ref, '')));
  em text := lower(trim(coalesce(p_email, '')));
BEGIN
  IF length(ref) < 1 OR length(em) < 3 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT o.*
  FROM public.orders o
  WHERE lower(trim(o.email)) = em
    AND (
      o.id::text ILIKE ref || '%'
      OR replace(o.id::text, '-', '') ILIKE replace(ref, '-', '') || '%'
    )
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_search_orders_for_return(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_search_orders_for_return(text, int) TO service_role;

REVOKE ALL ON FUNCTION public.lookup_order_for_tracking(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_order_for_tracking(text, text) TO service_role;
