-- =====================================================
-- CLEANUP PAYMENT COLUMNS - SINGLE SOURCE OF TRUTH
-- =====================================================
-- This migration consolidates payment tracking into single columns
-- Removes legacy columns to prevent confusion and bugs
-- ROBUST VERSION: Checks column existence before operations

-- Step 1: Migrate data from stripe_payment_status to payment_status (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'stripe_payment_status'
  ) THEN
    UPDATE orders 
    SET payment_status = CASE 
      WHEN stripe_payment_status = 'paid' THEN 'paid'
      WHEN stripe_payment_status = 'pending' THEN 'pending'
      WHEN stripe_payment_status = 'failed' THEN 'failed'
      WHEN stripe_payment_status IS NULL THEN 'unpaid'
      ELSE 'unpaid'
    END
    WHERE payment_status IS NULL OR payment_status = 'unpaid';
    
    RAISE NOTICE '✅ Migrated data from stripe_payment_status to payment_status';
  ELSE
    RAISE NOTICE '⚠️ Column stripe_payment_status does not exist, skipping migration';
  END IF;
END $$;

-- Step 2: Migrate data from payment_intent_id to stripe_payment_intent_id (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'payment_intent_id'
  ) THEN
    UPDATE orders 
    SET stripe_payment_intent_id = payment_intent_id
    WHERE stripe_payment_intent_id IS NULL 
    AND payment_intent_id IS NOT NULL;
    
    RAISE NOTICE '✅ Migrated data from payment_intent_id to stripe_payment_intent_id';
  ELSE
    RAISE NOTICE '⚠️ Column payment_intent_id does not exist, skipping migration';
  END IF;
END $$;

-- Step 3: Set paid_at for orders that were already paid
UPDATE orders
SET paid_at = created_at
WHERE payment_status = 'paid'
AND paid_at IS NULL;

-- Step 4: Drop old/duplicate columns to clean up database (if they exist)
DO $$
BEGIN
  -- Drop stripe_payment_status if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'stripe_payment_status'
  ) THEN
    ALTER TABLE orders DROP COLUMN stripe_payment_status CASCADE;
    RAISE NOTICE '✅ Dropped column: stripe_payment_status';
  END IF;
  
  -- Drop payment_intent_id if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'payment_intent_id'
  ) THEN
    ALTER TABLE orders DROP COLUMN payment_intent_id CASCADE;
    RAISE NOTICE '✅ Dropped column: payment_intent_id';
  END IF;
END $$;

-- Step 5: Set default value for payment_status (all new orders start as unpaid)
ALTER TABLE orders ALTER COLUMN payment_status SET DEFAULT 'unpaid';

-- Step 6: Ensure payment_status is never NULL for data integrity
UPDATE orders SET payment_status = 'unpaid' WHERE payment_status IS NULL;
ALTER TABLE orders ALTER COLUMN payment_status SET NOT NULL;

-- Step 7: Update comments for clarity
COMMENT ON COLUMN orders.payment_status IS 'Payment status: unpaid, pending, paid, failed, refunded, expired (SINGLE SOURCE OF TRUTH)';
COMMENT ON COLUMN orders.stripe_payment_intent_id IS 'Stripe Payment Intent ID for this order (SINGLE SOURCE OF TRUTH)';

-- Step 8: Create view for easy querying of paid orders
CREATE OR REPLACE VIEW v_paid_orders AS
SELECT 
  o.*,
  COALESCE(
    (SELECT SUM(quantity * price_at_purchase) FROM order_items WHERE order_id = o.id),
    0
  ) as items_total,
  EXTRACT(EPOCH FROM (o.paid_at - o.checkout_started_at)) / 60 as checkout_duration_minutes
FROM orders o
WHERE o.payment_status = 'paid'
ORDER BY o.paid_at DESC;

COMMENT ON VIEW v_paid_orders IS 'View of all paid orders with calculated totals and checkout duration';

-- Step 9: Show statistics after migration
DO $$
DECLARE
  total_orders INTEGER;
  paid_orders INTEGER;
  pending_orders INTEGER;
  unpaid_orders INTEGER;
  total_revenue DECIMAL;
BEGIN
  SELECT COUNT(*) INTO total_orders FROM orders;
  SELECT COUNT(*) INTO paid_orders FROM orders WHERE payment_status = 'paid';
  SELECT COUNT(*) INTO pending_orders FROM orders WHERE payment_status = 'pending';
  SELECT COUNT(*) INTO unpaid_orders FROM orders WHERE payment_status = 'unpaid';
  SELECT COALESCE(SUM(total), 0) INTO total_revenue FROM orders WHERE payment_status = 'paid';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Statistics:';
  RAISE NOTICE '   Total Orders: %', total_orders;
  RAISE NOTICE '   💰 Paid: % (€%)', paid_orders, total_revenue;
  RAISE NOTICE '   ⏳ Pending: %', pending_orders;
  RAISE NOTICE '   ○ Unpaid: %', unpaid_orders;
  RAISE NOTICE '========================================';
END $$;

-- Final confirmation query
SELECT 
  'CLEANUP COMPLETE - Old columns removed, data migrated' as status,
  COUNT(*) as total_orders,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
  COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_orders,
  COUNT(CASE WHEN payment_status = 'unpaid' THEN 1 END) as unpaid_orders
FROM orders;
