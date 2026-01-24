-- Add size_guide_content JSONB columns for hybrid template system
-- Category-level = default templates
-- Product-level = optional overrides

-- 1. Add to categories table (templates)
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS size_guide_content JSONB DEFAULT NULL;

-- 2. Add to products table (overrides)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS size_guide_content JSONB DEFAULT NULL;

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_size_guide_content 
ON categories USING GIN (size_guide_content);

CREATE INDEX IF NOT EXISTS idx_products_size_guide_content 
ON products USING GIN (size_guide_content);

-- 4. Add comments
COMMENT ON COLUMN categories.size_guide_content IS 'Default size guide/specs template for all products in this category. JSON format with fields array for specs or table data for size charts.';
COMMENT ON COLUMN products.size_guide_content IS 'Product-specific size guide/specs override. If set, this overrides the category template. Same JSON format as category.';

-- 5. Example templates (optional - can be added via admin)
-- Clothing template example:
UPDATE categories 
SET size_guide_content = '{
  "type": "table",
  "columns": ["Maat", "Borst (cm)", "Lengte (cm)", "Schouders (cm)"],
  "rows": [
    ["S", "100-104", "68-70", "44-46"],
    ["M", "104-108", "70-72", "46-48"],
    ["L", "108-112", "72-74", "48-50"],
    ["XL", "112-116", "74-76", "50-52"],
    ["XXL", "116-120", "76-78", "52-54"]
  ],
  "how_to_measure": [
    {"label": "Borst", "description": "Meet rond de breedste punt van je borst"},
    {"label": "Lengte", "description": "Meet vanaf de halsnaad tot aan de onderkant"},
    {"label": "Schouders", "description": "Meet van schouder tot schouder over de rug"}
  ]
}'::jsonb
WHERE slug IN ('hoodies', 'sweaters', 't-shirts', 'caps') 
AND size_guide_content IS NULL;

-- Watch template example:
UPDATE categories 
SET size_guide_content = '{
  "type": "specs",
  "fields": [
    {"label": "Kastmaat", "value": "42mm diameter"},
    {"label": "Materiaal Kast", "value": "RVS 316L (roestvrij staal)"},
    {"label": "Materiaal Band", "value": "RVS 316L schakelband"},
    {"label": "Glas", "value": "Saffierglas (krasbestendig)"},
    {"label": "Uurwerk", "value": "Automatisch Japans uurwerk"},
    {"label": "Waterbestendig", "value": "10 ATM (100 meter)"},
    {"label": "Polsomtrek", "value": "15-20cm (verstelbaar)"},
    {"label": "Bandbreedte", "value": "20mm"},
    {"label": "Gewicht", "value": "±120 gram"},
    {"label": "Garantie", "value": "2 jaar fabrieksgarantie"}
  ],
  "care_instructions": [
    {"label": "Reiniging", "description": "Reinig met zachte doek en lauw water"},
    {"label": "Waterbestendig", "description": "Geschikt voor zwemmen, niet voor duiken"},
    {"label": "Service", "description": "Automatisch uurwerk heeft geen batterij nodig"},
    {"label": "Opbergen", "description": "Bewaar in droge omgeving, bij voorkeur in horloge box"}
  ]
}'::jsonb
WHERE slug = 'horloges'
AND size_guide_content IS NULL;

-- Log changes
DO $$
BEGIN
  RAISE NOTICE '✅ Added size_guide_content columns to categories and products';
  RAISE NOTICE '✅ Added GIN indexes for JSONB performance';
  RAISE NOTICE '✅ Seeded default templates for existing categories';
  RAISE NOTICE '📝 Admin can now customize templates per category';
  RAISE NOTICE '📝 Products can override with specific content';
END $$;

