-- ================================================================
-- STAP 1: Voeg kolommen toe aan categories tabel
-- ================================================================
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS default_product_details_en TEXT,
ADD COLUMN IF NOT EXISTS default_materials_care_en TEXT;

-- ================================================================
-- STAP 2: Update Hoodies categorie met Engelse vertalingen
-- ================================================================
UPDATE categories 
SET 
  default_product_details_en = '<p><span style="font-weight: 600;">Premium quality:</span> High-quality materials that last</p>
<p><span style="font-weight: 600;">Perfect fit:</span> Designed for comfort and style</p>
<p><span style="font-weight: 600;">Locally made:</span> Produced with love in Groningen</p>',
  default_materials_care_en = '<p><span style="font-weight: 600;">Material:</span> 100% organic cotton, 300gsm</p>
<p><span style="font-weight: 600;">Washing instructions:</span> Machine washable at 30°C</p>
<p><span style="font-weight: 600;">Ironing:</span> Low temperature, inside out</p>
<p><span style="font-weight: 600;">Drying:</span> Do not tumble dry, hang to dry</p>'
WHERE slug = 'hoodies';

-- ================================================================
-- STAP 3: Update Sweaters categorie met Engelse vertalingen
-- ================================================================
UPDATE categories 
SET 
  default_product_details_en = '<p><span style="font-weight: 600;">Premium quality:</span> High-quality materials that last</p>
<p><span style="font-weight: 600;">Perfect fit:</span> Designed for comfort and style</p>
<p><span style="font-weight: 600;">Locally made:</span> Produced with love in Groningen</p>',
  default_materials_care_en = '<p><span style="font-weight: 600;">Material:</span> 100% organic cotton, 300gsm</p>
<p><span style="font-weight: 600;">Washing instructions:</span> Machine washable at 30°C</p>
<p><span style="font-weight: 600;">Ironing:</span> Low temperature, inside out</p>
<p><span style="font-weight: 600;">Drying:</span> Do not tumble dry, hang to dry</p>'
WHERE slug = 'sweaters';

-- ================================================================
-- STAP 4: Update Accessoires categorie met Engelse vertalingen
-- ================================================================
UPDATE categories 
SET 
  default_product_details_en = '<p><span style="font-weight: 600;">Premium quality:</span> Carefully selected high-end accessories</p>
<p><span style="font-weight: 600;">Perfect finish:</span> The perfect complement to your outfit</p>
<p><span style="font-weight: 600;">Durable:</span> Made to last for years</p>',
  default_materials_care_en = '<p><span style="font-weight: 600;">Care instructions:</span> Handle with care, avoid extreme temperatures</p>
<p><span style="font-weight: 600;">Storage:</span> Store in a dry, cool place</p>
<p><span style="font-weight: 600;">Cleaning:</span> Clean according to material specifications</p>'
WHERE slug = 'accessoires';
