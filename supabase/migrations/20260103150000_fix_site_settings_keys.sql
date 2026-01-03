-- Fix site_settings keys to match code expectations
-- The code expects: free_shipping_threshold, shipping_cost, tax_rate, currency, site_name, contact_email, low_stock_threshold, maintenance_mode
-- Database has: shipping_free_threshold (wrong key name)

-- Update the key name from shipping_free_threshold to free_shipping_threshold
UPDATE site_settings 
SET key = 'free_shipping_threshold'
WHERE key = 'shipping_free_threshold';

-- Add missing settings that the code expects
INSERT INTO site_settings (key, value, description) VALUES
  ('low_stock_threshold', '"5"'::jsonb, 'Low stock warning threshold'),
  ('maintenance_mode', 'false'::jsonb, 'Maintenance mode on/off')
ON CONFLICT (key) DO NOTHING;

-- Remove old processing_time setting if exists (not used in current code)
DELETE FROM site_settings WHERE key = 'processing_time';

COMMENT ON TABLE site_settings IS 'Site-wide configuration settings managed via admin panel';

