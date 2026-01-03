-- Add image_url to categories table
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add display_order for sorting
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Update existing categories with default images (optional - can be set via admin)
UPDATE categories SET image_url = '/hoodieblack.png' WHERE slug = 'hoodies' AND image_url IS NULL;
UPDATE categories SET image_url = '/blacktee.png' WHERE slug = 't-shirts' AND image_url IS NULL;
UPDATE categories SET image_url = '/hoodie_cap.png' WHERE slug = 'caps' AND image_url IS NULL;
UPDATE categories SET image_url = '/hoodie_cap.png' WHERE slug = 'accessoires' AND image_url IS NULL;

