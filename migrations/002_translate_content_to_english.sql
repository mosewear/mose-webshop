-- Translate all existing Dutch content to English
-- Run this AFTER running 001_add_i18n_support.sql

-- ============================================
-- PRODUCTS TRANSLATION (Based on current database)
-- ============================================

-- T-Shirts
UPDATE products SET 
  name_en = 'MOSE Essential Tee - Black',
  description_en = 'The same quality as our white tee, but in deep black. Heavyweight organic cotton that feels substantial. Made to last for years. This is the black tee you''ve been looking for.'
WHERE slug = 'mose-essential-tee-zwart';

UPDATE products SET 
  name_en = 'MOSE Essential Tee - White',
  description_en = 'The perfect basic tee that never gets boring. Heavyweight organic cotton with a premium feel. Built to last for years. No-nonsense quality that feels just right.'
WHERE slug = 'mose-essential-tee-wit';

-- Hoodies
UPDATE products SET 
  name_en = 'MOSE Classic Hoodie - Black',
  description_en = 'Our iconic hoodie in deep black. Made from premium organic cotton with a perfect fit. Heavyweight fabric that lasts. Locally made in Groningen with attention to every detail. Built for everyday wear.'
WHERE slug = 'mose-classic-hoodie-zwart';

-- Sweaters
UPDATE products SET 
  name_en = 'MOSE Crewneck Sweater',
  description_en = 'Classic crewneck without the fuss. Premium French terry cotton with the perfect weight. Made to last season after season. Quality basics that stand the test of time.'
WHERE slug = 'mose-crewneck-sweater';

-- Watches
UPDATE products SET 
  name_en = 'MOSE Automatic Watch',
  description_en = 'THE WATCH YOU''LL NEVER REPLACE

Automatic Swiss movement. Water resistant to 10 ATM. Sapphire crystal glass that won''t scratch. 316L stainless steel case and bracelet.

This is not a fashion watch. This is a tool built to last a lifetime.

Designed in Groningen. Assembled in Switzerland. Quality without compromise.'
WHERE slug = 'mose-automatisch-horloge';

-- Caps
UPDATE products SET 
  name_en = 'MOSE Snapback Cap',
  description_en = 'Clean snapback with embroidered MOSE logo. Reinforced visor and quality stitching. Adjustable fit that stays comfortable all day. Simple and timeless.'
WHERE slug = 'mose-snapback-cap';


-- ============================================
-- CATEGORIES TRANSLATION
-- ============================================

UPDATE categories SET 
  name_en = 'T-Shirts',
  description_en = 'The perfect tees for everyday wear'
WHERE slug = 't-shirts';

UPDATE categories SET 
  name_en = 'Hoodies',
  description_en = 'Heavyweight hoodies built to last'
WHERE slug = 'hoodies';

UPDATE categories SET 
  name_en = 'Sweaters',
  description_en = 'Classic crewneck sweaters'
WHERE slug = 'sweaters';

UPDATE categories SET 
  name_en = 'Watches',
  description_en = 'Timepieces built to last a lifetime'
WHERE slug = 'horloges';

UPDATE categories SET 
  name_en = 'Caps',
  description_en = 'Quality caps and headwear'
WHERE slug = 'caps';


-- ============================================
-- STATIC PAGES TRANSLATION (if they exist)
-- ============================================

-- Contact page
UPDATE pages SET 
  title_en = 'Contact',
  content_en = 'Questions? We''re here to help. Reach out and we''ll get back to you as soon as possible.'
WHERE slug = 'contact';

-- About page
UPDATE pages SET 
  title_en = 'About MOSE',
  content_en = 'Made in Groningen. No nonsense, just character. We make clothes that last, locally produced without compromising on quality.'
WHERE slug = 'over-mose';

-- Privacy page
UPDATE pages SET 
  title_en = 'Privacy Policy',
  content_en = 'Your privacy matters to us. Read how we handle your data.'
WHERE slug = 'privacy';

-- Terms page
UPDATE pages SET 
  title_en = 'Terms & Conditions',
  content_en = 'Our terms and conditions for orders and services.'
WHERE slug = 'algemene-voorwaarden';


-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after the migration to verify all content has English translations

-- Check products
SELECT 
  slug,
  name as dutch_name,
  name_en as english_name,
  CASE 
    WHEN name_en IS NULL THEN '❌ Missing'
    WHEN name_en = '' THEN '⚠️  Empty'
    ELSE '✅ Translated'
  END as status
FROM products
ORDER BY created_at DESC;

-- Check categories  
SELECT 
  slug,
  name as dutch_name,
  name_en as english_name,
  CASE 
    WHEN name_en IS NULL THEN '❌ Missing'
    WHEN name_en = '' THEN '⚠️  Empty'
    ELSE '✅ Translated'
  END as status
FROM categories
ORDER BY name;

-- Summary statistics
SELECT 
  'Products' as table_name,
  COUNT(*) as total,
  COUNT(name_en) as translated,
  COUNT(*) - COUNT(name_en) as missing
FROM products
UNION ALL
SELECT 
  'Categories' as table_name,
  COUNT(*) as total,
  COUNT(name_en) as translated,
  COUNT(*) - COUNT(name_en) as missing
FROM categories;
