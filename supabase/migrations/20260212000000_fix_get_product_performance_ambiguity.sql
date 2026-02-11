-- Fix ambiguous "product_id" reference in get_product_performance RPC
-- Error seen: 42702 column reference "product_id" is ambiguous

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
          WHEN ae.event_name = 'purchase' THEN purchase_item->>'id'
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
    COALESCE(ag.event_product_name, p.name, p.name_en, 'Onbekend product')::TEXT AS product_name,
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

GRANT EXECUTE ON FUNCTION public.get_product_performance(TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated, service_role;

