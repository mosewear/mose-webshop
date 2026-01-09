-- Fix type mismatch in get_abandoned_carts function
-- Change customer_name from TEXT to VARCHAR to match orders table

DROP FUNCTION IF EXISTS get_abandoned_carts(INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION get_abandoned_carts(
  hours_threshold INTEGER DEFAULT 24,
  email_not_sent_only BOOLEAN DEFAULT true
)
RETURNS TABLE (
  order_id UUID,
  customer_email VARCHAR,
  customer_name VARCHAR,  -- Changed from TEXT to VARCHAR
  total DECIMAL,
  checkout_started_at TIMESTAMP,
  hours_since_abandonment DECIMAL,
  order_items JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.email,
    (o.shipping_address->>'name')::VARCHAR,  -- Cast to VARCHAR
    o.total,
    o.checkout_started_at,
    EXTRACT(EPOCH FROM (NOW() - o.checkout_started_at)) / 3600 as hours_since_abandonment,
    jsonb_agg(
      jsonb_build_object(
        'product_name', oi.product_name,
        'size', oi.size,
        'color', oi.color,
        'quantity', oi.quantity,
        'price', oi.price_at_purchase,
        'image_url', oi.image_url
      )
    ) as items
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.payment_status IN ('unpaid', 'pending')
  AND o.checkout_started_at IS NOT NULL
  AND o.checkout_started_at < NOW() - (hours_threshold || ' hours')::INTERVAL
  AND (NOT email_not_sent_only OR o.abandoned_cart_email_sent = false)
  AND o.status != 'cancelled'
  GROUP BY o.id, o.email, o.shipping_address, o.total, o.checkout_started_at, o.abandoned_cart_email_sent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION get_abandoned_carts IS 'Returns abandoned carts based on hours threshold. Fixed type mismatch for customer_name (VARCHAR instead of TEXT).';


