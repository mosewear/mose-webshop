-- =====================================================
-- 🚨 CRITICAL FIX: ADD INCREMENT PROMO USAGE FUNCTION
-- =====================================================
-- ISSUE: Promo code usage tracking was NOT working because 
--        the RPC function didn't exist!
-- 
-- HOW TO APPLY:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Copy/paste this entire file
-- 3. Click "Run" to execute
-- =====================================================

-- Main increment function (atomic and thread-safe)
CREATE OR REPLACE FUNCTION increment_promo_usage(promo_code_value TEXT)
RETURNS void AS $$
BEGIN
  -- Atomically increment the usage_count
  UPDATE promo_codes
  SET usage_count = usage_count + 1
  WHERE code = UPPER(promo_code_value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Extended tracking function (with detailed usage logging)
CREATE OR REPLACE FUNCTION track_promo_usage(
  promo_code_value TEXT,
  order_id_value UUID,
  discount_amount_value DECIMAL,
  order_total_value DECIMAL,
  user_id_value UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  promo_id UUID;
BEGIN
  -- Get promo code ID
  SELECT id INTO promo_id
  FROM promo_codes
  WHERE code = UPPER(promo_code_value);

  -- If promo code doesn't exist, exit early
  IF promo_id IS NULL THEN
    RETURN;
  END IF;

  -- Increment usage count
  UPDATE promo_codes
  SET usage_count = usage_count + 1
  WHERE id = promo_id;

  -- Log detailed usage
  INSERT INTO promo_code_usage (
    promo_code_id,
    order_id,
    discount_amount,
    order_total,
    user_id
  ) VALUES (
    promo_id,
    order_id_value,
    discount_amount_value,
    order_total_value,
    user_id_value
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION increment_promo_usage IS 'Atomically increments promo code usage count';
COMMENT ON FUNCTION track_promo_usage IS 'Increments usage count AND logs detailed usage in promo_code_usage table';

-- =====================================================
-- VERIFICATION QUERIES (run after applying)
-- =====================================================

-- Check if functions exist:
-- SELECT routine_name, routine_type 
-- FROM information_schema.routines 
-- WHERE routine_name LIKE '%promo%';

-- Check current promo code usage:
-- SELECT code, usage_count, usage_limit 
-- FROM promo_codes;

-- Test increment (DO NOT RUN ON PRODUCTION without testing first):
-- SELECT increment_promo_usage('PRESALE30');
-- SELECT code, usage_count FROM promo_codes WHERE code = 'PRESALE30';


