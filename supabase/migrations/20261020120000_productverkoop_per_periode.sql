-- Verkooptellingen per periode voor de regel onder de koopknop.
--
-- De oude functie gaf alleen de laatste 24 uur terug. Bij een kleine
-- catalogus is dat vaak 0 of 2, terwijl dezelfde hoodie die week zes keer
-- verkocht is. De pagina kiest nu zelf de periode met het sterkste ware
-- getal; deze functie levert daarvoor alle drie de tellingen.
--
-- Naast get_product_activity in plaats van die te vervangen: een andere
-- RETURNS TABLE vraagt een DROP, en dan breekt de live site in de minuut
-- tussen migratie en deploy.

CREATE OR REPLACE FUNCTION public.get_product_sales_windows(p_product_id uuid)
RETURNS TABLE(sold_24h bigint, sold_7d bigint, sold_30d bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT
    COALESCE(SUM(oi.quantity) FILTER (WHERE o.created_at > now() - interval '24 hours'), 0),
    COALESCE(SUM(oi.quantity) FILTER (WHERE o.created_at > now() - interval '7 days'), 0),
    COALESCE(SUM(oi.quantity), 0)
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.product_id = p_product_id
    AND o.payment_status = 'paid'
    AND o.created_at > now() - interval '30 days';
$$;

-- Geeft alleen drie tellingen terug, net als get_product_activity.
REVOKE ALL ON FUNCTION public.get_product_sales_windows(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_sales_windows(uuid) TO anon, authenticated;
