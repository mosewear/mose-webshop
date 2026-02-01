-- =====================================================
-- FAVICON MIGRATIONS (COMBINED - FIXED)
-- =====================================================
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- MIGRATION 1: Add favicon_url to site_settings
-- =====================================================

INSERT INTO site_settings (key, value, description)
VALUES (
  'favicon_url',
  '"/favicon.ico"'::jsonb,
  'URL to the site favicon (can be local path like /favicon.ico or Supabase storage URL)'
)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE site_settings IS 'Site-wide configuration settings. Values are stored as JSONB for flexibility. Use upsert to update settings via admin panel.';

-- =====================================================
-- MIGRATION 2: Fix site_settings RLS policies
-- =====================================================

-- Drop ALL existing policies first (including new ones if they exist)
DROP POLICY IF EXISTS "Admins can view settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can view site settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can manage site settings" ON site_settings;
DROP POLICY IF EXISTS "Public can view public site settings" ON site_settings;

-- Create new policies using profiles.is_admin
CREATE POLICY "Admins can view site settings"
  ON site_settings
  FOR SELECT
  USING (
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
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow public read access for certain settings (like favicon_url)
CREATE POLICY "Public can view public site settings"
  ON site_settings
  FOR SELECT
  USING (
    key IN ('favicon_url', 'site_name', 'currency', 'free_shipping_threshold', 'shipping_cost', 'tax_rate', 'return_days')
  );

COMMENT ON POLICY "Public can view public site settings" ON site_settings IS 
  'Allows public access to non-sensitive settings needed for the frontend (favicon, shipping info, etc.)';

-- =====================================================
-- DONE! Now go to admin settings and upload favicon
-- =====================================================
