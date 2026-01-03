-- =====================================================
-- DUAL STATUS SYSTEM: PAYMENT + FULFILLMENT TRACKING
-- =====================================================
-- This migration adds comprehensive payment tracking while
-- keeping order fulfillment status separate for clarity

-- Add payment tracking columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_metadata JSONB,
ADD COLUMN IF NOT EXISTS checkout_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS checkout_abandoned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS abandoned_cart_email_sent BOOLEAN DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent ON orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_checkout_started ON orders(checkout_started_at);
CREATE INDEX IF NOT EXISTS idx_orders_abandoned_email_sent ON orders(abandoned_cart_email_sent);

-- Add comments for documentation
COMMENT ON COLUMN orders.payment_status IS 'Payment status: unpaid, pending, paid, failed, refunded, expired';
COMMENT ON COLUMN orders.paid_at IS 'Timestamp when payment was successfully completed';
COMMENT ON COLUMN orders.payment_method IS 'Payment method used (card, ideal, paypal, etc)';
COMMENT ON COLUMN orders.stripe_payment_intent_id IS 'Stripe Payment Intent ID for this order';
COMMENT ON COLUMN orders.payment_metadata IS 'Additional payment metadata from Stripe';
COMMENT ON COLUMN orders.checkout_started_at IS 'When customer started checkout process';
COMMENT ON COLUMN orders.checkout_abandoned_at IS 'When checkout was marked as abandoned (24h+ no payment)';
COMMENT ON COLUMN orders.abandoned_cart_email_sent IS 'Whether abandoned cart email was sent';

-- Update existing orders to have correct payment status
-- Orders with stripe_payment_intent_id are considered paid (they completed checkout)
UPDATE orders 
SET payment_status = 'paid',
    paid_at = created_at
WHERE stripe_payment_intent_id IS NOT NULL 
AND payment_status = 'unpaid';

-- =====================================================
-- PAYMENT STATUS HELPER FUNCTIONS
-- =====================================================

-- Function to get revenue statistics
CREATE OR REPLACE FUNCTION get_revenue_stats(
  start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE (
  total_revenue DECIMAL,
  paid_orders_count BIGINT,
  average_order_value DECIMAL,
  pending_payments_count BIGINT,
  failed_payments_count BIGINT,
  conversion_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) as revenue,
      COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_count,
      COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_count,
      COUNT(CASE WHEN payment_status = 'failed' THEN 1 END) as failed_count,
      COUNT(*) as total_count
    FROM orders
    WHERE created_at BETWEEN start_date AND end_date
  )
  SELECT 
    revenue,
    paid_count,
    CASE WHEN paid_count > 0 THEN revenue / paid_count ELSE 0 END as avg_value,
    pending_count,
    failed_count,
    CASE WHEN total_count > 0 THEN (paid_count::DECIMAL / total_count::DECIMAL) * 100 ELSE 0 END as conversion
  FROM stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect abandoned carts
CREATE OR REPLACE FUNCTION get_abandoned_carts(
  hours_since_checkout INTEGER DEFAULT 24,
  email_not_sent_only BOOLEAN DEFAULT true
)
RETURNS TABLE (
  order_id UUID,
  customer_email VARCHAR,
  customer_name TEXT,
  total DECIMAL,
  checkout_started_at TIMESTAMP,
  hours_since_checkout DECIMAL,
  order_items JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.email,
    (o.shipping_address->>'name')::TEXT,
    o.total,
    o.checkout_started_at,
    EXTRACT(EPOCH FROM (NOW() - o.checkout_started_at)) / 3600 as hours_ago,
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
  AND o.checkout_started_at < NOW() - (hours_since_checkout || ' hours')::INTERVAL
  AND (NOT email_not_sent_only OR o.abandoned_cart_email_sent = false)
  AND o.status != 'cancelled'
  GROUP BY o.id, o.email, o.shipping_address, o.total, o.checkout_started_at, o.abandoned_cart_email_sent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark abandoned cart email as sent
CREATE OR REPLACE FUNCTION mark_abandoned_cart_email_sent(order_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE orders 
  SET 
    abandoned_cart_email_sent = true,
    checkout_abandoned_at = NOW()
  WHERE id = order_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- View: Paid Orders (for revenue calculations)
CREATE OR REPLACE VIEW paid_orders AS
SELECT * FROM orders 
WHERE payment_status = 'paid'
ORDER BY paid_at DESC;

-- View: Pending Payments (checkout started, awaiting payment)
CREATE OR REPLACE VIEW pending_payments AS
SELECT * FROM orders 
WHERE payment_status = 'pending'
AND checkout_started_at > NOW() - INTERVAL '24 hours'
ORDER BY checkout_started_at DESC;

-- View: Abandoned Carts (24h+ since checkout, not paid)
CREATE OR REPLACE VIEW abandoned_carts AS
SELECT 
  o.*,
  EXTRACT(EPOCH FROM (NOW() - o.checkout_started_at)) / 3600 as hours_since_checkout
FROM orders o
WHERE o.payment_status IN ('unpaid', 'pending')
AND o.checkout_started_at IS NOT NULL
AND o.checkout_started_at < NOW() - INTERVAL '24 hours'
AND o.status != 'cancelled'
ORDER BY o.checkout_started_at DESC;

-- View: Failed Payments (payment attempts that failed)
CREATE OR REPLACE VIEW failed_payments AS
SELECT * FROM orders 
WHERE payment_status = 'failed'
ORDER BY updated_at DESC;

-- =====================================================
-- TRIGGERS & AUTOMATION
-- =====================================================

-- Trigger: Auto-set checkout_started_at when stripe_payment_intent_id is added
CREATE OR REPLACE FUNCTION set_checkout_started_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stripe_payment_intent_id IS NOT NULL AND OLD.stripe_payment_intent_id IS NULL THEN
    NEW.checkout_started_at = NOW();
    IF NEW.payment_status IS NULL OR NEW.payment_status = 'unpaid' THEN
      NEW.payment_status = 'pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_checkout_started_trigger ON orders;
CREATE TRIGGER orders_checkout_started_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_checkout_started_timestamp();

-- Trigger: Log payment status changes to order_status_history
CREATE OR REPLACE FUNCTION log_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO order_status_history (
      order_id,
      old_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      NEW.id,
      CONCAT('payment:', OLD.payment_status),
      CONCAT('payment:', NEW.payment_status),
      auth.uid(),
      CASE 
        WHEN NEW.payment_status = 'paid' THEN 'Payment successfully completed'
        WHEN NEW.payment_status = 'failed' THEN 'Payment attempt failed'
        WHEN NEW.payment_status = 'pending' THEN 'Awaiting payment completion'
        WHEN NEW.payment_status = 'refunded' THEN 'Payment refunded'
        ELSE 'Payment status updated'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS payment_status_change_trigger ON orders;
CREATE TRIGGER payment_status_change_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION log_payment_status_change();

-- =====================================================
-- RLS POLICIES (if needed)
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_revenue_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_abandoned_carts TO authenticated;
GRANT EXECUTE ON FUNCTION mark_abandoned_cart_email_sent TO authenticated;

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Add to site_settings for abandoned cart configuration
INSERT INTO site_settings (key, value, description) VALUES
  ('abandoned_cart_hours', '24'::jsonb, 'Hours before marking cart as abandoned'),
  ('abandoned_cart_email_enabled', 'true'::jsonb, 'Enable abandoned cart emails'),
  ('abandoned_cart_discount_code', '"COMEBACK10"'::jsonb, 'Discount code for abandoned cart emails')
ON CONFLICT (key) DO NOTHING;

-- Show final stats
SELECT 
  COUNT(*) as total_orders,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
  COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_orders,
  COUNT(CASE WHEN payment_status = 'unpaid' THEN 1 END) as unpaid_orders
FROM orders;

COMMENT ON TABLE orders IS 'Orders table with dual status system: payment_status (paid/unpaid) + status (processing/shipped/delivered)';

