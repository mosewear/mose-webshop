-- Add color column to product_images for color-specific images
-- NULL = general product image (shown for all colors)
-- 'Zwart' = only shown when that color is selected

ALTER TABLE product_images ADD COLUMN IF NOT EXISTS color TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_images_color ON product_images(product_id, color);

-- Comment for clarity
COMMENT ON COLUMN product_images.color IS 'Color name this image belongs to. NULL means general product image shown for all colors.';

