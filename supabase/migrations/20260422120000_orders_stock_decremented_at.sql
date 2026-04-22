-- Idempotent inventory: mark when paid order stock has been applied (webhook + fallback paths).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_decremented_at TIMESTAMPTZ;

COMMENT ON COLUMN orders.stock_decremented_at IS
  'When set, product_variants stock for this order has been decremented. Prevents double-decrement on Stripe retries or check-payment-status fallback.';

-- Paid orders before this column: assume legacy flows already adjusted inventory.
UPDATE orders
SET stock_decremented_at = COALESCE(paid_at, created_at)
WHERE payment_status = 'paid'
  AND stock_decremented_at IS NULL;
