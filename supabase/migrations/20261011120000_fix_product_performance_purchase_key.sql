-- Fix: views en omzet van hetzelfde product landden op twee aparte rijen in
-- "Winkelgedrag > Product performance".
--
-- Oorzaak: get_product_performance() groepeert alles op één sleutel. Voor
-- product_view en add_to_cart is dat event_properties->>'product_id' (de
-- product-UUID), maar voor purchase was dat items[].id, en de client stuurde
-- daar de order_items-rij-id in. Elke verkoop kreeg dus een unieke sleutel die
-- per definitie nooit met de views matcht: de ene rij hield alle views zonder
-- omzet, de andere alle omzet zonder views, met bijna dezelfde naam omdat de
-- ene rij products.name droeg en de andere de order_items-naamsnapshot.
--
-- De client is gerepareerd (src/app/[locale]/order-confirmation/page.tsx stuurt
-- nu product_id). Deze migratie repareert daarnaast de HISTORISCHE events, door
-- een order_items-id alsnog naar het bijbehorende product_id te vertalen. De
-- opgeslagen analytics_events worden niet gewijzigd, alleen anders gelezen.
--
-- Effect op de cijfers: totale omzet blijft gelijk, maar de verdeling over de
-- rijen verandert. Duplicaatregels verdwijnen en add_to_cart_rate en
-- purchase_rate krijgen voor het eerst een echte noemer, dus ze gaan van 0%
-- naar een reëel percentage.

DROP FUNCTION IF EXISTS public.get_product_performance(TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.get_product_performance(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  product_id TEXT,
  product_name TEXT,
  views BIGINT,
  add_to_carts BIGINT,
  purchases BIGINT,
  add_to_cart_rate NUMERIC,
  purchase_rate NUMERIC,
  revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH product_events AS (
    SELECT
      ae.event_name,
      COALESCE(
        ae.event_properties->>'product_id',
        CASE
          WHEN ae.event_name = 'purchase' THEN
            COALESCE(
              -- Nieuwe events: client stuurt product_id expliciet mee.
              purchase_item->>'product_id',
              -- Historische events: items[].id was de order_items-rij-id.
              -- Vertaal die alsnog naar het echte product.
              oi_hist.product_id::TEXT,
              -- Laatste redmiddel: product is verwijderd (order_items.product_id
              -- is ON DELETE SET NULL), dan blijft de rij als los item zichtbaar.
              purchase_item->>'id'
            )
          ELSE NULL
        END
      ) AS event_product_id,
      COALESCE(
        ae.event_properties->>'product_name',
        CASE
          WHEN ae.event_name = 'purchase' THEN purchase_item->>'name'
          ELSE NULL
        END
      ) AS event_product_name,
      CASE
        WHEN ae.event_name = 'purchase' THEN
          COALESCE((purchase_item->>'quantity')::NUMERIC, 0) * COALESCE((purchase_item->>'price')::NUMERIC, 0)
        ELSE 0
      END AS purchase_value
    FROM analytics_events ae
    LEFT JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN ae.event_name = 'purchase' AND jsonb_typeof(ae.event_properties->'items') = 'array'
          THEN ae.event_properties->'items'
        ELSE '[]'::jsonb
      END
    ) AS purchase_item ON TRUE
    -- Alleen zinvol voor purchase-events. De regex is een guard zodat de cast
    -- naar uuid niet op rommel stukloopt; de vergelijking gebeurt op het
    -- uuid-type zelf, zodat de primary-key-index gebruikt kan worden. Casten we
    -- oi_hist.id naar TEXT, dan is de index onbruikbaar en wordt dit een scan
    -- over een groeiende eventtabel.
    LEFT JOIN order_items oi_hist
      ON ae.event_name = 'purchase'
     AND purchase_item->>'id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     AND oi_hist.id = (purchase_item->>'id')::uuid
    WHERE ae.created_at >= p_start_date
      AND ae.created_at <= p_end_date
      AND (
        ae.event_name IN ('product_view', 'add_to_cart')
        OR (ae.event_name = 'purchase' AND jsonb_typeof(ae.event_properties->'items') = 'array')
      )
  ),
  aggregated AS (
    SELECT
      pe.event_product_id,
      MAX(pe.event_product_name) FILTER (
        WHERE pe.event_product_name IS NOT NULL AND pe.event_product_name <> ''
      ) AS event_product_name,
      COUNT(*) FILTER (WHERE pe.event_name = 'product_view')::BIGINT AS views,
      COUNT(*) FILTER (WHERE pe.event_name = 'add_to_cart')::BIGINT AS add_to_carts,
      COUNT(*) FILTER (WHERE pe.event_name = 'purchase')::BIGINT AS purchases,
      COALESCE(SUM(pe.purchase_value), 0)::NUMERIC AS revenue
    FROM product_events pe
    WHERE pe.event_product_id IS NOT NULL
      AND pe.event_product_id <> ''
    GROUP BY pe.event_product_id
  )
  SELECT
    ag.event_product_id::TEXT AS product_id,
    -- products.name gaat nu VOOR de naamsnapshot uit order_items. Zo vallen
    -- NL- en EN-varianten en hernoemde producten op één label samen in plaats
    -- van als aparte regels te blijven ogen. Voor orderhistorie, picklijsten en
    -- e-mails blijft de snapshot in order_items leidend; dit raakt alleen de
    -- rapportage.
    COALESCE(p.name, p.name_en, ag.event_product_name, 'Onbekend product')::TEXT AS product_name,
    ag.views,
    ag.add_to_carts,
    ag.purchases,
    CASE
      WHEN ag.views > 0 THEN ROUND((ag.add_to_carts::NUMERIC / ag.views::NUMERIC) * 100, 2)
      ELSE 0
    END AS add_to_cart_rate,
    CASE
      WHEN ag.views > 0 THEN ROUND((ag.purchases::NUMERIC / ag.views::NUMERIC) * 100, 2)
      ELSE 0
    END AS purchase_rate,
    ag.revenue
  FROM aggregated ag
  LEFT JOIN products p ON p.id::TEXT = ag.event_product_id
  ORDER BY ag.views DESC, ag.revenue DESC;
END;
$$;

-- De functie is SECURITY DEFINER en joint nu ook order_items. De admin-pagina
-- draait achter requireAdmin() met een ingelogde sessie, dus de rol is
-- `authenticated` en anon heeft deze functie niet nodig.
--
-- LET OP, twee aparte bronnen van rechten, allebei nodig:
--   1. PostgreSQL geeft EXECUTE op een nieuwe functie automatisch aan PUBLIC.
--   2. Supabase heeft ALTER DEFAULT PRIVILEGES staan dat elke nieuwe functie
--      in schema public ook expliciet aan anon, authenticated en service_role
--      toekent. Dat gebeurt bij CREATE, dus ná de DROP hierboven.
-- Alleen aan authenticated en service_role granten verwijdert dus niets: anon
-- kon de omzetcijfers nog steeds zonder login opvragen. Beide REVOKE-regels
-- hieronder zijn wat het recht echt wegneemt, en ze moeten vóór de GRANT staan.
-- Geverifieerd op productie: proacl ging van
--   {postgres,anon,authenticated,service_role} naar
--   {postgres,authenticated,service_role}.
REVOKE EXECUTE ON FUNCTION public.get_product_performance(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_product_performance(TIMESTAMPTZ, TIMESTAMPTZ) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_product_performance(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
