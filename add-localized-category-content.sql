-- Add English columns for category default content
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS default_product_details_en TEXT,
ADD COLUMN IF NOT EXISTS default_materials_care_en TEXT;

-- Update Hoodies category with English translations
UPDATE categories 
SET 
  default_product_details_en = E'<p><span style="font-weight: 600;">Premium quality:</span> High-quality materials that last</p>\n<p><span style="font-weight: 600;">Perfect fit:</span> Designed for comfort and style</p>\n<p><span style="font-weight: 600;">Locally made:</span> Produced with love in Groningen</p>',
  default_materials_care_en = E'<p><span style="font-weight: 600;">Material:</span> 100% organic cotton, 300gsm</p>\n<p><span style="font-weight: 600;">Washing instructions:</span> Machine washable at 30°C</p>\n<p><span style="font-weight: 600;">Ironing:</span> Low temperature, inside out</p>\n<p><span style="font-weight: 600;">Drying:</span> Do not tumble dry, hang to dry</p>'
WHERE slug = 'hoodies';

-- Update Sweaters category with English translations
UPDATE categories 
SET 
  default_product_details_en = E'<p><span style="font-weight: 600;">Premium quality:</span> High-quality materials that last</p>\n<p><span style="font-weight: 600;">Perfect fit:</span> Designed for comfort and style</p>\n<p><span style="font-weight: 600;">Locally made:</span> Produced with love in Groningen</p>',
  default_materials_care_en = E'<p><span style="font-weight: 600;">Material:</span> 100% organic cotton, 300gsm</p>\n<p><span style="font-weight: 600;">Washing instructions:</span> Machine washable at 30°C</p>\n<p><span style="font-weight: 600;">Ironing:</span> Low temperature, inside out</p>\n<p><span style="font-weight: 600;">Drying:</span> Do not tumble dry, hang to dry</p>'
WHERE slug = 'sweaters';

-- Update Accessories category with English translations
UPDATE categories 
SET 
  default_product_details_en = E'<p><span style="font-weight: 600;">Premium quality:</span> Carefully selected high-end accessories</p>\n<p><span style="font-weight: 600;">Perfect finish:</span> The perfect complement to your outfit</p>\n<p><span style="font-weight: 600;">Durable:</span> Made to last for years</p>',
  default_materials_care_en = E'<p><span style="font-weight: 600;">Care instructions:</span> Handle with care, avoid extreme temperatures</p>\n<p><span style="font-weight: 600;">Storage:</span> Store in a dry, cool place</p>\n<p><span style="font-weight: 600;">Cleaning:</span> Clean according to material specifications</p>'
WHERE slug = 'accessoires';

