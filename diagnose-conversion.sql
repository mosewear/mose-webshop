-- 🔍 CONVERSION FUNNEL DIAGNOSE
-- Dit script helpt je exact te zien waar mensen afhaken

-- 1️⃣ Check hoeveel orders zijn aangemaakt (= mensen die checkout bereikten)
SELECT 
  COUNT(*) as total_orders,
  COUNT(CASE WHEN checkout_started_at IS NOT NULL THEN 1 END) as reached_checkout,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as completed_purchases,
  COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments,
  COUNT(CASE WHEN payment_status = 'failed' THEN 1 END) as failed_payments
FROM orders
WHERE created_at > NOW() - INTERVAL '30 days';

-- 2️⃣ Check abandoned carts (mensen die checkout startten maar niet betaalden)
SELECT 
  COUNT(*) as abandoned_carts_count,
  AVG(total) as avg_cart_value,
  SUM(total) as total_lost_revenue
FROM orders
WHERE 
  checkout_started_at IS NOT NULL
  AND checkout_started_at < NOW() - INTERVAL '24 hours'
  AND payment_status != 'paid';

-- 3️⃣ Top producten in abandoned carts
SELECT 
  oi.product_name,
  COUNT(*) as times_abandoned,
  AVG(oi.price_at_purchase) as avg_price,
  SUM(oi.price_at_purchase * oi.quantity) as total_lost_value
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE 
  o.checkout_started_at IS NOT NULL
  AND o.checkout_started_at < NOW() - INTERVAL '24 hours'
  AND o.payment_status != 'paid'
GROUP BY oi.product_name
ORDER BY times_abandoned DESC;

-- 4️⃣ Check of abandoned cart emails verzonden zijn
SELECT 
  abandoned_cart_email_sent,
  COUNT(*) as count
FROM orders
WHERE 
  checkout_started_at IS NOT NULL
  AND checkout_started_at < NOW() - INTERVAL '24 hours'
  AND payment_status != 'paid'
GROUP BY abandoned_cart_email_sent;

-- 5️⃣ Recent failed payments (technische problemen?)
SELECT 
  id,
  email,
  total,
  payment_method,
  payment_status,
  checkout_started_at,
  updated_at,
  stripe_payment_intent_id
FROM orders
WHERE 
  payment_status = 'failed'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;






