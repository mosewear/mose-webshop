-- ============================================
-- MIGRATION: Guest-Friendly Profiles
-- ============================================
-- This migration makes profiles work for both:
-- 1. Authenticated users (future)
-- 2. Guest customers (current)
-- ============================================

-- Step 1: Drop the foreign key constraint to auth.users
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Step 2: Make id a standalone UUID (not tied to auth.users)
-- Note: Existing admin profile will remain intact

-- Step 3: Add a user_id column for future authenticated users
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 4: Add index for email lookups (important for performance)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Step 5: Update RLS policies to work with both auth and guest users
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;

-- Admin/service role can do everything
CREATE POLICY "Service role can manage all profiles"
  ON profiles
  USING (true)
  WITH CHECK (true);

-- Everyone can view profiles (for admin dashboard)
CREATE POLICY "Public profiles are viewable by everyone." 
  ON profiles FOR SELECT 
  USING (TRUE);

-- Authenticated users can update their own profile
CREATE POLICY "Users can update their own profile." 
  ON profiles FOR UPDATE 
  USING (auth.uid() = user_id);

-- Step 6: Add phone column for better customer data
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Step 7: Add last_order_at for better tracking
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS last_order_at TIMESTAMP WITH TIME ZONE;

-- Step 8: Add total_orders and total_spent for quick stats
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS total_spent NUMERIC(10, 2) DEFAULT 0.00;

-- Step 9: Create function to upsert customer profile during checkout
CREATE OR REPLACE FUNCTION public.upsert_customer_profile(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT
)
RETURNS UUID AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Try to find existing profile by email
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE email = p_email;
  
  -- If exists, update it
  IF v_profile_id IS NOT NULL THEN
    UPDATE profiles
    SET 
      first_name = COALESCE(p_first_name, first_name),
      last_name = COALESCE(p_last_name, last_name),
      phone = COALESCE(p_phone, phone),
      updated_at = NOW()
    WHERE id = v_profile_id;
    
    RETURN v_profile_id;
  END IF;
  
  -- If not exists, create new profile
  INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_email,
    p_first_name,
    p_last_name,
    p_phone,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_profile_id;
  
  RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create function to update profile stats after order
CREATE OR REPLACE FUNCTION public.update_customer_stats(
  p_email TEXT,
  p_order_total NUMERIC,
  p_order_date TIMESTAMP WITH TIME ZONE
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET 
    total_orders = total_orders + 1,
    total_spent = total_spent + p_order_total,
    last_order_at = p_order_date,
    updated_at = NOW()
  WHERE email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Backfill profiles from existing orders
INSERT INTO profiles (id, email, first_name, last_name, phone, created_at, updated_at)
SELECT 
  gen_random_uuid() as id,
  o.email,
  (o.shipping_address->>'name')::TEXT as first_name,
  NULL as last_name,
  (o.shipping_address->>'phone')::TEXT as phone,
  MIN(o.created_at) as created_at,
  MAX(o.created_at) as updated_at
FROM orders o
WHERE o.email IS NOT NULL
  AND o.email NOT IN (SELECT email FROM profiles WHERE email IS NOT NULL)
GROUP BY o.email, o.shipping_address->>'name', o.shipping_address->>'phone'
ON CONFLICT (email) DO NOTHING;

-- Step 12: Update customer stats for all existing profiles
UPDATE profiles p
SET 
  total_orders = (
    SELECT COUNT(*)
    FROM orders o
    WHERE o.email = p.email
      AND o.payment_status = 'paid'
  ),
  total_spent = (
    SELECT COALESCE(SUM(o.total), 0)
    FROM orders o
    WHERE o.email = p.email
      AND o.payment_status = 'paid'
  ),
  last_order_at = (
    SELECT MAX(o.created_at)
    FROM orders o
    WHERE o.email = p.email
  );

-- Step 13: Add comments for documentation
COMMENT ON COLUMN profiles.user_id IS 'Links to auth.users for authenticated users. NULL for guest customers.';
COMMENT ON COLUMN profiles.total_orders IS 'Cached count of paid orders. Updated by update_customer_stats().';
COMMENT ON COLUMN profiles.total_spent IS 'Cached sum of paid order totals. Updated by update_customer_stats().';
COMMENT ON FUNCTION public.upsert_customer_profile IS 'Creates or updates a customer profile during checkout. Returns profile ID.';
COMMENT ON FUNCTION public.update_customer_stats IS 'Updates cached order statistics for a customer profile.';






