-- =====================================================
-- ADD FAVICON_URL TO SITE SETTINGS
-- =====================================================
--
-- Adds favicon_url setting to site_settings table
-- This allows admins to customize the favicon via the settings page
--

-- Insert favicon_url setting if it doesn't exist
INSERT INTO site_settings (key, value, description)
VALUES (
  'favicon_url',
  '"/favicon.ico"'::jsonb,
  'URL to the site favicon (can be local path like /favicon.ico or Supabase storage URL)'
)
ON CONFLICT (key) DO NOTHING;

-- Add comment for clarity
COMMENT ON TABLE site_settings IS 'Site-wide configuration settings. Values are stored as JSONB for flexibility. Use upsert to update settings via admin panel.';


