-- Fix get_abandoned_carts to also return abandoned_cart_email_sent
-- This field is needed by the admin GET endpoint for filtering

DROP FUNCTION IF EXISTS get_abandoned_carts(INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION get_abandoned_carts(
  hours_threshold INTEGER DEFAULT 24,
  email_not_sent_only BOOLEAN DEFAULT true
)
RETURNS TABLE (
  order_id UUID,
  customer_email TEXT,
  customer_name TEXT,
  total DECIMAL,
  checkout_started_at TIMESTAMP,
  hours_since_abandonment DECIMAL,
  order_items JSONB,
  abandoned_cart_email_sent BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.email::TEXT,
    (o.shipping_address->>'name')::TEXT,
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
    ) as items,
    o.abandoned_cart_email_sent
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

GRANT EXECUTE ON FUNCTION get_abandoned_carts TO authenticated;
GRANT EXECUTE ON FUNCTION get_abandoned_carts TO anon;
GRANT EXECUTE ON FUNCTION mark_abandoned_cart_email_sent TO authenticated;
GRANT EXECUTE ON FUNCTION mark_abandoned_cart_email_sent TO anon;
