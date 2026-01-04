-- Update existing homepage_settings to use star icon instead of infinity
UPDATE homepage_settings
SET stats_3_number = '⭐'
WHERE stats_3_number = '∞' OR stats_3_number IS NULL;

