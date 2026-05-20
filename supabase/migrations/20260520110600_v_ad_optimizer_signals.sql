-- Phase 0: unified per-SKU signals view consumed by the autopilot.
--
-- One row per (product_id, variant_id) with rolling 7d / 30d / lifetime
-- aggregates: stock, units sold, gross revenue, returns, contribution margin,
-- demand signals. The Meta-side performance (spend, ROAS, CTR) is joined in
-- the optimizer at query time via ad_campaign_snapshots, keyed by the SKU
-- IDs we put in the Meta product catalog feed.
--
-- This is a regular view; for MOSE's volume the underlying tables are small
-- enough that on-demand recomputation is acceptable. If query latency in the
-- hourly cron becomes a problem, convert to MATERIALIZED VIEW with REFRESH
-- on a 15m schedule (no schema change to consumers).

CREATE OR REPLACE VIEW v_ad_optimizer_signals AS
WITH paid_items AS (
  SELECT
    oi.product_id,
    oi.variant_id,
    o.id AS order_id,
    o.paid_at,
    oi.quantity,
    oi.price_at_purchase,
    oi.subtotal,
    o.has_returns
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.payment_status = 'paid'
    AND o.paid_at IS NOT NULL
    AND oi.product_id IS NOT NULL
),
return_items AS (
  -- returns.return_items is a JSONB array of { order_item_id, quantity, ... }
  -- We expand it to attribute refund value per order_item.
  SELECT
    r.id AS return_id,
    r.created_at AS returned_at,
    r.refunded_at,
    r.refund_amount,
    r.total_refund,
    (item->>'order_item_id')::UUID AS order_item_id,
    (item->>'quantity')::INT AS quantity
  FROM returns r
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.return_items, '[]'::JSONB)) AS item
  WHERE r.status IN ('refunded', 'approved', 'in_transit', 'received')
),
returns_per_item AS (
  SELECT
    oi.product_id,
    oi.variant_id,
    ri.returned_at,
    ri.refunded_at,
    ri.quantity AS returned_qty,
    -- Pro-rata refund value: returned_qty/order_item_qty * order_item_subtotal
    CASE WHEN oi.quantity > 0
         THEN (ri.quantity::NUMERIC / oi.quantity) * COALESCE(oi.subtotal, oi.quantity * oi.price_at_purchase)
         ELSE 0 END AS refund_value
  FROM return_items ri
  JOIN order_items oi ON oi.id = ri.order_item_id
  WHERE oi.product_id IS NOT NULL
),
sku_30d AS (
  SELECT
    product_id,
    variant_id,
    SUM(quantity) AS units_30d,
    SUM(COALESCE(subtotal, quantity * price_at_purchase)) AS revenue_30d,
    COUNT(DISTINCT order_id) AS orders_30d
  FROM paid_items
  WHERE paid_at >= now() - INTERVAL '30 days'
  GROUP BY product_id, variant_id
),
sku_7d AS (
  SELECT
    product_id,
    variant_id,
    SUM(quantity) AS units_7d,
    SUM(COALESCE(subtotal, quantity * price_at_purchase)) AS revenue_7d,
    COUNT(DISTINCT order_id) AS orders_7d
  FROM paid_items
  WHERE paid_at >= now() - INTERVAL '7 days'
  GROUP BY product_id, variant_id
),
sku_lifetime AS (
  SELECT
    product_id,
    variant_id,
    SUM(quantity) AS units_lifetime,
    SUM(COALESCE(subtotal, quantity * price_at_purchase)) AS revenue_lifetime
  FROM paid_items
  GROUP BY product_id, variant_id
),
returns_30d AS (
  SELECT
    product_id,
    variant_id,
    SUM(returned_qty) AS returned_units_30d,
    SUM(refund_value) AS refund_value_30d
  FROM returns_per_item
  WHERE returned_at >= now() - INTERVAL '30 days'
  GROUP BY product_id, variant_id
),
returns_lifetime AS (
  SELECT
    product_id,
    variant_id,
    SUM(returned_qty) AS returned_units_lifetime,
    SUM(refund_value) AS refund_value_lifetime
  FROM returns_per_item
  GROUP BY product_id, variant_id
),
bis_demand AS (
  SELECT
    product_id,
    variant_id,
    COUNT(*) FILTER (WHERE is_notified = false) AS pending_back_in_stock_signups,
    COUNT(*) AS total_back_in_stock_signups
  FROM back_in_stock_notifications
  GROUP BY product_id, variant_id
),
-- Variant-level economics if present, else product-level fallback.
econ AS (
  SELECT
    pv.product_id,
    pv.id AS variant_id,
    COALESCE(e_variant.cost_price, e_product.cost_price)             AS cost_price,
    COALESCE(e_variant.shipping_cost_avg, e_product.shipping_cost_avg) AS shipping_cost_avg,
    COALESCE(e_variant.transaction_fee_pct, e_product.transaction_fee_pct) AS transaction_fee_pct,
    COALESCE(e_variant.vat_rate, e_product.vat_rate) AS vat_rate,
    (e_variant.id IS NOT NULL) AS has_variant_econ,
    (e_product.id IS NOT NULL) AS has_product_econ
  FROM product_variants pv
  LEFT JOIN ad_sku_economics e_variant
    ON e_variant.variant_id = pv.id
  LEFT JOIN ad_sku_economics e_product
    ON e_product.product_id = pv.product_id AND e_product.variant_id IS NULL
)
SELECT
  pv.id                       AS variant_id,
  pv.product_id               AS product_id,
  pv.sku                      AS sku,
  pv.size                     AS size,
  pv.color                    AS color,
  pv.stock_quantity           AS current_stock,
  pv.is_available             AS variant_available,
  p.name                      AS product_name,
  p.slug                      AS product_slug,
  p.category_id               AS category_id,
  c.name                      AS category_name,
  p.base_price                AS base_price,
  p.sale_price                AS sale_price,
  p.is_active                 AS product_active,
  COALESCE(p.sale_price, p.base_price + COALESCE(pv.price_adjustment, 0)) AS effective_price,
  -- 7d window
  COALESCE(s7.units_7d, 0)            AS units_sold_7d,
  COALESCE(s7.revenue_7d, 0)          AS gross_revenue_7d,
  COALESCE(s7.orders_7d, 0)           AS orders_7d,
  -- 30d window
  COALESCE(s30.units_30d, 0)          AS units_sold_30d,
  COALESCE(s30.revenue_30d, 0)        AS gross_revenue_30d,
  COALESCE(s30.orders_30d, 0)         AS orders_30d,
  -- Lifetime
  COALESCE(sl.units_lifetime, 0)      AS units_sold_lifetime,
  COALESCE(sl.revenue_lifetime, 0)    AS gross_revenue_lifetime,
  -- Returns
  COALESCE(r30.returned_units_30d, 0)   AS returned_units_30d,
  COALESCE(r30.refund_value_30d, 0)     AS refund_value_30d,
  COALESCE(rl.returned_units_lifetime, 0) AS returned_units_lifetime,
  COALESCE(rl.refund_value_lifetime, 0)   AS refund_value_lifetime,
  CASE WHEN COALESCE(s30.units_30d, 0) > 0
       THEN COALESCE(r30.returned_units_30d, 0)::NUMERIC / s30.units_30d
       ELSE 0 END AS return_rate_30d,
  -- Demand signal
  COALESCE(bis.pending_back_in_stock_signups, 0) AS pending_back_in_stock_signups,
  COALESCE(bis.total_back_in_stock_signups, 0)   AS total_back_in_stock_signups,
  -- Economics
  econ.cost_price,
  econ.shipping_cost_avg,
  econ.transaction_fee_pct,
  econ.vat_rate,
  econ.has_variant_econ,
  econ.has_product_econ,
  -- Contribution margin per unit (excl VAT). NULL when economics missing.
  CASE WHEN econ.cost_price IS NOT NULL THEN
    COALESCE(p.sale_price, p.base_price + COALESCE(pv.price_adjustment, 0)) / NULLIF(1 + econ.vat_rate, 0)
    - econ.cost_price
    - econ.shipping_cost_avg
    - (COALESCE(p.sale_price, p.base_price + COALESCE(pv.price_adjustment, 0)) * econ.transaction_fee_pct)
  ELSE NULL END AS contribution_margin_per_unit,
  -- Contribution margin 30d window (units * per_unit - refund_value)
  CASE WHEN econ.cost_price IS NOT NULL THEN
    COALESCE(s30.units_30d, 0) *
      (COALESCE(p.sale_price, p.base_price + COALESCE(pv.price_adjustment, 0)) / NULLIF(1 + econ.vat_rate, 0)
       - econ.cost_price
       - econ.shipping_cost_avg
       - (COALESCE(p.sale_price, p.base_price + COALESCE(pv.price_adjustment, 0)) * econ.transaction_fee_pct))
    - COALESCE(r30.refund_value_30d, 0) / NULLIF(1 + econ.vat_rate, 0)
  ELSE NULL END AS contribution_margin_30d
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN sku_7d  s7  ON s7.product_id  = pv.product_id AND s7.variant_id  = pv.id
LEFT JOIN sku_30d s30 ON s30.product_id = pv.product_id AND s30.variant_id = pv.id
LEFT JOIN sku_lifetime sl ON sl.product_id = pv.product_id AND sl.variant_id = pv.id
LEFT JOIN returns_30d r30 ON r30.product_id = pv.product_id AND r30.variant_id = pv.id
LEFT JOIN returns_lifetime rl ON rl.product_id = pv.product_id AND rl.variant_id = pv.id
-- back-in-stock signups may target the product-as-a-whole (variant_id IS NULL)
-- or a specific variant; aggregate both into this variant row.
LEFT JOIN LATERAL (
  SELECT
    SUM(b.pending_back_in_stock_signups) AS pending_back_in_stock_signups,
    SUM(b.total_back_in_stock_signups)   AS total_back_in_stock_signups
  FROM bis_demand b
  WHERE b.product_id = pv.product_id
    AND (b.variant_id = pv.id OR b.variant_id IS NULL)
) bis ON TRUE
LEFT JOIN econ ON econ.product_id = pv.product_id AND econ.variant_id = pv.id
-- Storefront convention is to filter on BOTH columns (see
-- 20260425180000_products_publish_simplification.sql).
WHERE p.is_active = true AND p.status = 'active';

COMMENT ON VIEW v_ad_optimizer_signals IS 'Per-SKU first-party signals (stock, sales windows, returns, margin, demand) consumed by the AI campaign autopilot. Joins Meta-side performance at query time via ad_campaign_snapshots.';

-- Grant select to authenticated so admin SSR clients can read it.
GRANT SELECT ON v_ad_optimizer_signals TO authenticated, service_role;
