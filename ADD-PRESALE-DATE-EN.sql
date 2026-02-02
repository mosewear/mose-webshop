-- Add presale_expected_date_en column to product_variants
ALTER TABLE product_variants
ADD COLUMN IF NOT EXISTS presale_expected_date_en TEXT;

-- Add comment
COMMENT ON COLUMN product_variants.presale_expected_date_en IS 'English version of presale expected date (e.g. "Week 10 February")';




