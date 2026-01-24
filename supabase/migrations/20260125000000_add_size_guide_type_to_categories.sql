-- Add size_guide_type column to categories table for dynamic size guides
-- This enables different size guide templates per category (clothing, watches, accessories, etc.)

-- Add column with default value
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS size_guide_type VARCHAR(50) DEFAULT 'clothing';

-- Add check constraint for valid values
ALTER TABLE categories
ADD CONSTRAINT categories_size_guide_type_check 
CHECK (size_guide_type IN ('clothing', 'watch', 'accessory', 'shoes', 'jewelry', 'none'));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_categories_size_guide_type 
ON categories(size_guide_type);

-- Add comment
COMMENT ON COLUMN categories.size_guide_type IS 'Type of size guide to display: clothing (maattabel), watch (specs), accessory (info), shoes (maten), jewelry (ring/armband), none (hide button)';

-- Update existing categories with appropriate types
UPDATE categories SET size_guide_type = 'clothing' WHERE slug IN ('caps', 'hoodies', 'sweaters', 't-shirts');
UPDATE categories SET size_guide_type = 'watch' WHERE slug = 'horloges';

-- Log changes
DO $$
BEGIN
  RAISE NOTICE 'Added size_guide_type column to categories';
  RAISE NOTICE 'Updated % categories with appropriate size guide types', (SELECT COUNT(*) FROM categories);
END $$;

