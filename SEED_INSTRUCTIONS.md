# MOSE Seed Data Instructions

## Stap 1: Open Supabase SQL Editor
Ga naar: https://supabase.com/dashboard/project/bsklcgeyvdsxjxvmghbp/editor

## Stap 2: Kopieer onderstaande SQL en run in SQL Editor

Klik op "New query" en plak deze SQL:

\`\`\`sql
-- Seed data voor MOSE webshop
-- Test producten met variants

-- Categories
INSERT INTO categories (name, slug, description, display_order) VALUES
('Hoodies', 'hoodies', 'Premium hoodies zonder poespas', 1),
('T-Shirts', 't-shirts', 'Essentiële tees met karakter', 2),
('Caps', 'caps', 'Stoere caps uit Groningen', 3),
('Accessoires', 'accessoires', 'De finishing touch', 4);

-- Products
WITH cat_ids AS (
  SELECT id, slug FROM categories
)
INSERT INTO products (name, slug, description, base_price, category_id, is_featured, is_active) VALUES
-- Hoodies
(
  'MOSE Basic Hoodie',
  'mose-basic-hoodie',
  'De ultieme no-nonsense hoodie. Gemaakt van premium katoen, lokaal geproduceerd.',
  79.99,
  (SELECT id FROM cat_ids WHERE slug = 'hoodies'),
  true,
  true
),
(
  'MOSE Signature Hoodie',
  'mose-signature-hoodie',
  'Onze signature hoodie met subtiel MOSE logo. Extra dikke stof (400gsm).',
  89.99,
  (SELECT id FROM cat_ids WHERE slug = 'hoodies'),
  true,
  true
),
-- T-Shirts
(
  'MOSE Basic Tee',
  'mose-basic-tee',
  'Het perfecte basic shirt. 100% organisch katoen, regular fit.',
  34.99,
  (SELECT id FROM cat_ids WHERE slug = 't-shirts'),
  true,
  true
),
(
  'MOSE Groningen Tee',
  'mose-groningen-tee',
  'Trots op je stad? Deze tee ook. Met subtiel Groningen print op de borst.',
  39.99,
  (SELECT id FROM cat_ids WHERE slug = 't-shirts'),
  false,
  true
),
-- Caps
(
  'MOSE Snapback',
  'mose-snapback',
  'Strakke snapback met geborduurde MOSE logo. Verstelbaar, comfortabel, stoer.',
  29.99,
  (SELECT id FROM cat_ids WHERE slug = 'caps'),
  false,
  true
);

-- Product Variants
WITH hoodie_basic AS (SELECT id FROM products WHERE slug = 'mose-basic-hoodie'),
     hoodie_signature AS (SELECT id FROM products WHERE slug = 'mose-signature-hoodie'),
     tee_basic AS (SELECT id FROM products WHERE slug = 'mose-basic-tee'),
     tee_groningen AS (SELECT id FROM products WHERE slug = 'mose-groningen-tee'),
     cap AS (SELECT id FROM products WHERE slug = 'mose-snapback')
INSERT INTO product_variants (product_id, sku, size, color, color_hex, stock_quantity, price_adjustment) VALUES
-- Basic Hoodie variants
((SELECT id FROM hoodie_basic), 'MOSE-HB-BLK-S', 'S', 'Black', '#000000', 12, 0),
((SELECT id FROM hoodie_basic), 'MOSE-HB-BLK-M', 'M', 'Black', '#000000', 20, 0),
((SELECT id FROM hoodie_basic), 'MOSE-HB-BLK-L', 'L', 'Black', '#000000', 18, 0),
((SELECT id FROM hoodie_basic), 'MOSE-HB-BLK-XL', 'XL', 'Black', '#000000', 15, 0),
((SELECT id FROM hoodie_basic), 'MOSE-HB-JAD-M', 'M', 'Jade', '#00A676', 15, 0),
((SELECT id FROM hoodie_basic), 'MOSE-HB-JAD-L', 'L', 'Jade', '#00A676', 12, 0),
-- Signature Hoodie variants
((SELECT id FROM hoodie_signature), 'MOSE-HS-BLK-M', 'M', 'Black', '#000000', 12, 0),
((SELECT id FROM hoodie_signature), 'MOSE-HS-BLK-L', 'L', 'Black', '#000000', 10, 0),
-- Basic Tee variants
((SELECT id FROM tee_basic), 'MOSE-TB-BLK-M', 'M', 'Black', '#000000', 30, 0),
((SELECT id FROM tee_basic), 'MOSE-TB-BLK-L', 'L', 'Black', '#000000', 28, 0),
((SELECT id FROM tee_basic), 'MOSE-TB-WHT-M', 'M', 'White', '#FFFFFF', 28, 0),
((SELECT id FROM tee_basic), 'MOSE-TB-WHT-L', 'L', 'White', '#FFFFFF', 25, 0),
((SELECT id FROM tee_basic), 'MOSE-TB-JAD-M', 'M', 'Jade', '#00A676', 15, 0),
-- Groningen Tee variants
((SELECT id FROM tee_groningen), 'MOSE-TG-BLK-M', 'M', 'Black', '#000000', 18, 0),
((SELECT id FROM tee_groningen), 'MOSE-TG-BLK-L', 'L', 'Black', '#000000', 16, 0),
-- Cap variants
((SELECT id FROM cap), 'MOSE-CAP-BLK-OS', 'One Size', 'Black', '#000000', 30, 0),
((SELECT id FROM cap), 'MOSE-CAP-JAD-OS', 'One Size', 'Jade', '#00A676', 25, 0);

-- Product images (placeholder)
INSERT INTO product_images (product_id, url, alt_text, position, is_primary)
SELECT 
  id,
  'https://placehold.co/800x1000/000000/00A676?text=' || REPLACE(name, ' ', '+'),
  name || ' - Front view',
  1,
  true
FROM products;
\`\`\`

## Stap 3: Run de query
Klik op "Run" (of Cmd+Enter) om de seed data toe te voegen.

## Verificatie
Na het runnen, check of de data is toegevoegd:
\`\`\`sql
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM product_variants;
SELECT COUNT(*) FROM categories;
\`\`\`

Je zou moeten zien:
- 5 products
- ~17 variants
- 4 categories

✅ Klaar! Je database is nu gevuld met test data.


