-- Fix site_settings keys - handle both old and new keys existing
-- The code expects: free_shipping_threshold, shipping_cost, tax_rate, currency, site_name, contact_email, low_stock_threshold, maintenance_mode

-- First, check if we have the old key and if the new key exists
-- If both exist, just delete the old one
-- If only old exists, rename it

-- Delete the old shipping_free_threshold key if the new one already exists
DELETE FROM site_settings 
WHERE key = 'shipping_free_threshold' 
AND EXISTS (SELECT 1 FROM site_settings WHERE key = 'free_shipping_threshold');

-- If the new key doesn't exist but old one does, rename it
UPDATE site_settings 
SET key = 'free_shipping_threshold'
WHERE key = 'shipping_free_threshold';

-- Add missing settings that the code expects (with ON CONFLICT DO NOTHING to avoid duplicates)
INSERT INTO site_settings (key, value, description) VALUES
  ('low_stock_threshold', '"5"'::jsonb, 'Low stock warning threshold'),
  ('maintenance_mode', 'false'::jsonb, 'Maintenance mode on/off')
ON CONFLICT (key) DO NOTHING;

-- Remove old processing_time setting if exists (not used in current code)
DELETE FROM site_settings WHERE key = 'processing_time';

-- Show final result
SELECT key, value, description FROM site_settings ORDER BY key;

COMMENT ON TABLE site_settings IS 'Site-wide configuration settings managed via admin panel';
