-- =====================================================
-- ADD INCREMENT PROMO USAGE RPC FUNCTION
-- =====================================================
-- This function safely increments the usage count for a promo code
-- and optionally tracks detailed usage in promo_code_usage table

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




