-- Zoeken in de orderlijst werkte helemaal niet.
--
-- src/app/admin/orders/page.tsx deed:
--   .or('id.ilike.%q%,email.ilike.%q%')
-- en orders.id is een UUID. PostgREST geeft daarop een harde fout:
--   42883: operator does not exist: uuid ~~* unknown
-- Elke zoekopdracht faalde dus, en het client-side filter dat naam en
-- tracking toevoegde keek alleen in de 25 al opgehaalde rijen.
--
-- Deze functie zoekt in één keer op:
--   - order-id (met of zonder streepjes, met of zonder #, als prefix)
--   - e-mailadres (ook een deel ervan)
--   - klantnaam uit shipping_address (JSONB)
--   - track-and-tracecode
--
-- SECURITY DEFINER omdat de admin-UI met de sessie van de beheerder draait en
-- orders onder RLS vallen; de grant beperkt het tot authenticated.

CREATE OR REPLACE FUNCTION public.admin_search_orders(
  p_query TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF public.orders
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q TEXT := trim(coalesce(p_query, ''));
  q_clean TEXT;
  id_candidate TEXT;
  lim INT := least(greatest(coalesce(p_limit, 50), 1), 200);
  off INT := greatest(coalesce(p_offset, 0), 0);
BEGIN
  IF length(q) = 0 THEN
    RETURN QUERY
    SELECT o.* FROM public.orders o
    ORDER BY o.created_at DESC
    LIMIT lim OFFSET off;
    RETURN;
  END IF;

  q_clean := trim(both '#' FROM q);
  id_candidate := replace(replace(q_clean, '-', ''), ' ', '');

  RETURN QUERY
  SELECT o.*
  FROM public.orders o
  WHERE
    -- id als prefix, met en zonder streepjes
    (
      id_candidate ~ '^[0-9A-Fa-f]+$'
      AND length(id_candidate) >= 3
      AND replace(o.id::text, '-', '') ILIKE id_candidate || '%'
    )
    OR o.email ILIKE '%' || q_clean || '%'
    OR coalesce(o.tracking_code, '') ILIKE '%' || q_clean || '%'
    -- naam uit het verzendadres; het veld heet 'name' bij gastcheckout en
    -- kan in oudere orders als firstName/lastName zijn opgeslagen
    OR coalesce(o.shipping_address->>'name', '') ILIKE '%' || q_clean || '%'
    OR trim(
         coalesce(o.shipping_address->>'firstName', '') || ' ' ||
         coalesce(o.shipping_address->>'lastName', '')
       ) ILIKE '%' || q_clean || '%'
  ORDER BY o.created_at DESC
  LIMIT lim OFFSET off;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_search_orders(TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_search_orders(TEXT, INTEGER, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_search_orders(TEXT, INTEGER, INTEGER) TO authenticated, service_role;

-- Tellen met dezelfde criteria, zodat de paginering klopt.
CREATE OR REPLACE FUNCTION public.admin_count_orders(p_query TEXT)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint
  FROM public.admin_search_orders(p_query, 200, 0);
$$;

REVOKE EXECUTE ON FUNCTION public.admin_count_orders(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_count_orders(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_count_orders(TEXT) TO authenticated, service_role;
