-- =====================================================
-- DELETE ALL ORDERS - CLEAN SLATE FOR TESTING
-- =====================================================
-- ⚠️ WARNING: This will permanently delete all orders!
-- Use this only for testing/development purposes

-- Count orders before deletion (for confirmation)
DO $$
DECLARE
  total_orders INTEGER;
  total_items INTEGER;
  total_status_history INTEGER;
  total_emails INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_orders FROM orders;
  SELECT COUNT(*) INTO total_items FROM order_items;
  
  -- Check if status_history table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_status_history') THEN
    SELECT COUNT(*) INTO total_status_history FROM order_status_history;
  ELSE
    total_status_history := 0;
  END IF;
  
  -- Check if emails_log table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emails_log') THEN
    SELECT COUNT(*) INTO total_emails FROM emails_log WHERE order_id IS NOT NULL;
  ELSE
    total_emails := 0;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '⚠️  DELETING ALL ORDERS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Orders to delete: %', total_orders;
  RAISE NOTICE 'Order items to delete: %', total_items;
  RAISE NOTICE 'Status history entries to delete: %', total_status_history;
  RAISE NOTICE 'Email log entries to delete: %', total_emails;
  RAISE NOTICE '========================================';
END $$;

-- Step 1: Delete order status history (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_status_history') THEN
    DELETE FROM order_status_history;
    RAISE NOTICE '✅ Deleted all order status history';
  END IF;
END $$;

-- Step 2: Delete email logs related to orders (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emails_log') THEN
    DELETE FROM emails_log WHERE order_id IS NOT NULL;
    RAISE NOTICE '✅ Deleted all order-related email logs';
  END IF;
END $$;

-- Step 3: Delete all order items (must be done before orders due to foreign key)
DELETE FROM order_items;

-- Step 4: Delete all orders
DELETE FROM orders;

-- Step 5: Reset sequences (so new orders start at 1 again, if using sequences)
-- Note: We use UUIDs so this doesn't apply, but included for completeness
DO $$
BEGIN
  -- If you ever add auto-increment columns, reset them here
  RAISE NOTICE '✅ All orders and related data deleted';
END $$;

-- Final confirmation
DO $$
DECLARE
  remaining_orders INTEGER;
  remaining_items INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_orders FROM orders;
  SELECT COUNT(*) INTO remaining_items FROM order_items;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CLEANUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Remaining orders: %', remaining_orders;
  RAISE NOTICE 'Remaining order items: %', remaining_items;
  RAISE NOTICE '========================================';
  
  IF remaining_orders = 0 AND remaining_items = 0 THEN
    RAISE NOTICE '🎉 Database is clean! Ready for fresh testing.';
  ELSE
    RAISE WARNING '⚠️  Some records remain. Check foreign key constraints.';
  END IF;
END $$;

-- Show final state
SELECT 
  'ALL ORDERS DELETED' as status,
  (SELECT COUNT(*) FROM orders) as remaining_orders,
  (SELECT COUNT(*) FROM order_items) as remaining_items;


