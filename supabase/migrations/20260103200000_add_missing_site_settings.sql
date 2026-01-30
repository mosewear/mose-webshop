-- Add missing site settings for contact info and return policy
-- This ensures all settings are manageable from the admin panel

-- Add contact phone (as JSON string)
INSERT INTO site_settings (key, value, description, updated_at)
VALUES ('contact_phone', '"+31 50 211 1931"', 'Contact phone number', NOW())
ON CONFLICT (key) DO UPDATE 
SET value = '"+31 50 211 1931"', updated_at = NOW();

-- Add contact address (as JSON string)
INSERT INTO site_settings (key, value, description, updated_at)
VALUES ('contact_address', '"Stavangerweg 13, 9723 JC Groningen"', 'Physical address', NOW())
ON CONFLICT (key) DO UPDATE 
SET value = '"Stavangerweg 13, 9723 JC Groningen"', updated_at = NOW();

-- Add return days (as JSON string)
INSERT INTO site_settings (key, value, description, updated_at)
VALUES ('return_days', '"14"', 'Number of days for return policy', NOW())
ON CONFLICT (key) DO UPDATE 
SET value = '"14"', updated_at = NOW();

-- Update free_shipping_threshold default to 100 (if it's currently 50)
UPDATE site_settings 
SET value = '"100"', updated_at = NOW()
WHERE key = 'free_shipping_threshold' AND (value = '50' OR value = '"50"');

-- Show results
SELECT key, value, description 
FROM site_settings 
WHERE key IN ('contact_phone', 'contact_address', 'return_days', 'free_shipping_threshold')
ORDER BY key;
