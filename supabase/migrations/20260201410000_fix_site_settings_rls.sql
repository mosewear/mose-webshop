-- =====================================================
-- FIX SITE_SETTINGS RLS POLICIES
-- =====================================================
--
-- Problem: RLS policies check admin_users table, but we use profiles.is_admin
-- Solution: Update policies to check profiles.is_admin instead
--

-- Drop old policies that reference admin_users
DROP POLICY IF EXISTS "Admins can view settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON site_settings;

-- Create new policies using profiles.is_admin
CREATE POLICY "Admins can view site settings"
  ON site_settings
  FOR SELECT
  USING (
    -- Allow if user is admin in profiles table
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage site settings"
  ON site_settings
  FOR ALL
  USING (
    -- Allow if user is admin in profiles table
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Also allow public read access for certain settings (like favicon_url)
-- This is needed for the layout to fetch settings without auth
CREATE POLICY "Public can view public site settings"
  ON site_settings
  FOR SELECT
  USING (
    -- Allow reading specific public settings
    key IN ('favicon_url', 'site_name', 'currency', 'free_shipping_threshold', 'shipping_cost', 'tax_rate', 'return_days')
  );

COMMENT ON POLICY "Public can view public site settings" ON site_settings IS 
  'Allows public access to non-sensitive settings needed for the frontend (favicon, shipping info, etc.)';



