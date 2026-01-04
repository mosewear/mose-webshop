-- Add icon field to homepage_settings table
ALTER TABLE homepage_settings
ADD COLUMN IF NOT EXISTS stats_3_icon TEXT DEFAULT 'Star';

-- Update existing row to use Star icon
UPDATE homepage_settings 
SET stats_3_icon = 'Star' 
WHERE stats_3_icon IS NULL;

-- Add comment
COMMENT ON COLUMN homepage_settings.stats_3_icon IS 'Lucide icon name for stats_3 (Premium kwaliteit)';

