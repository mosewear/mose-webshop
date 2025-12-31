-- Test Products voor MOSE Shop
-- 6 producten met variants en images

-- Ensure categories exist first
INSERT INTO categories (name, slug, description) VALUES
('Hoodies', 'hoodies', 'Warme, comfortabele hoodies voor elke dag'),
('T-Shirts', 't-shirts', 'Premium basic t-shirts'),
('Sweaters', 'sweaters', 'Stijlvolle sweaters zonder capuchon'),
('Caps', 'caps', 'Caps om je look af te maken')
ON CONFLICT (slug) DO NOTHING;

-- Insert 6 test products
INSERT INTO products (name, slug, description, base_price, category_id, meta_title, meta_description) VALUES
(
  'MOSE Classic Hoodie Zwart',
  'mose-classic-hoodie-zwart',
  'Onze iconische hoodie in diep zwart. Gemaakt van premium biologisch katoen met een relaxed fit. Perfect voor elke gelegenheid. Lokaal geproduceerd in Groningen.',
  79.99,
  (SELECT id FROM categories WHERE slug = 'hoodies'),
  'MOSE Classic Hoodie Zwart - Premium Lokaal Gemaakt',
  'De perfecte zwarte hoodie. Premium biologisch katoen, lokaal gemaakt in Groningen. Tijdloos design dat jaren meegaat.'
),
(
  'MOSE Oversized Hoodie Grijs',
  'mose-oversized-hoodie-grijs',
  'Extra ruime fit voor die relaxed streetwear look. Premium katoen met geborstelde binnenkant voor maximaal comfort. Drop shoulders en kangaroo pocket.',
  84.99,
  (SELECT id FROM categories WHERE slug = 'hoodies'),
  'MOSE Oversized Hoodie Grijs - Streetwear Premium',
  'Oversized hoodie met premium afwerking. Geborstelde binnenkant, drop shoulders. Lokaal gemaakt.'
),
(
  'MOSE Essential Tee Wit',
  'mose-essential-tee-wit',
  'De perfecte basic tee die nooit verveelt. Heavyweight katoen (220gsm) met verstevigde naden. Een T-shirt dat echt lang meegaat.',
  34.99,
  (SELECT id FROM categories WHERE slug = 't-shirts'),
  'MOSE Essential Tee Wit - Premium Basic T-Shirt',
  'Tijdloze witte T-shirt. Heavyweight katoen, verstevigde naden. Gebouwd om lang mee te gaan.'
),
(
  'MOSE Essential Tee Zwart',
  'mose-essential-tee-zwart',
  'Dezelfde kwaliteit als onze witte tee, maar dan in klassiek zwart. Heavyweight katoen met perfecte pasvorm. Een must-have basic.',
  34.99,
  (SELECT id FROM categories WHERE slug = 't-shirts'),
  'MOSE Essential Tee Zwart - Premium Basic T-Shirt',
  'Zwarte basic tee van heavyweight katoen. Verstevigde naden, perfecte pasvorm. Pure kwaliteit.'
),
(
  'MOSE Crewneck Sweater',
  'mose-crewneck-sweater',
  'Klassieke crewneck zonder poespas. Premium French Terry katoen met geborstelde binnenkant. Ribbed manchetten en zoom voor perfecte fit.',
  69.99,
  (SELECT id FROM categories WHERE slug = 'sweaters'),
  'MOSE Crewneck Sweater - Premium French Terry',
  'Tijdloze crewneck sweater. Premium French Terry katoen, geborstelde binnenkant. Lokaal gemaakt.'
),
(
  'MOSE Snapback Cap',
  'mose-snapback-cap',
  'Clean snapback met geborduurd MOSE logo. Verstevigde front panels en gebogen klep. One size fits all met verstelbare sluiting.',
  29.99,
  (SELECT id FROM categories WHERE slug = 'caps'),
  'MOSE Snapback Cap - Premium Geborduurde Logo',
  'Snapback cap met geborduurd logo. Verstevigde panels, verstelbare sluiting. Clean & stoer.'
)
ON CONFLICT (slug) DO NOTHING;

-- Add variants for each product (sizes, colors, stock)

-- MOSE Classic Hoodie Zwart - Variants
INSERT INTO product_variants (product_id, size, color, color_hex, sku, stock_quantity, price_adjustment, is_available) VALUES
((SELECT id FROM products WHERE slug = 'mose-classic-hoodie-zwart'), 'S', 'Zwart', '#000000', 'MCH-S-BLK', 12, 0, true),
((SELECT id FROM products WHERE slug = 'mose-classic-hoodie-zwart'), 'M', 'Zwart', '#000000', 'MCH-M-BLK', 18, 0, true),
((SELECT id FROM products WHERE slug = 'mose-classic-hoodie-zwart'), 'L', 'Zwart', '#000000', 'MCH-L-BLK', 22, 0, true),
((SELECT id FROM products WHERE slug = 'mose-classic-hoodie-zwart'), 'XL', 'Zwart', '#000000', 'MCH-XL-BLK', 15, 0, true),
((SELECT id FROM products WHERE slug = 'mose-classic-hoodie-zwart'), 'XXL', 'Zwart', '#000000', 'MCH-XXL-BLK', 8, 5.00, true)
ON CONFLICT (product_id, size, color) DO NOTHING;

-- MOSE Oversized Hoodie Grijs - Variants
INSERT INTO product_variants (product_id, size, color, color_hex, sku, stock_quantity, price_adjustment, is_available) VALUES
((SELECT id FROM products WHERE slug = 'mose-oversized-hoodie-grijs'), 'M', 'Grijs', '#808080', 'MOH-M-GRY', 10, 0, true),
((SELECT id FROM products WHERE slug = 'mose-oversized-hoodie-grijs'), 'L', 'Grijs', '#808080', 'MOH-L-GRY', 14, 0, true),
((SELECT id FROM products WHERE slug = 'mose-oversized-hoodie-grijs'), 'XL', 'Grijs', '#808080', 'MOH-XL-GRY', 16, 0, true),
((SELECT id FROM products WHERE slug = 'mose-oversized-hoodie-grijs'), 'XXL', 'Grijs', '#808080', 'MOH-XXL-GRY', 4, 5.00, true)
ON CONFLICT (product_id, size, color) DO NOTHING;

-- MOSE Essential Tee Wit - Variants
INSERT INTO product_variants (product_id, size, color, color_hex, sku, stock_quantity, price_adjustment, is_available) VALUES
((SELECT id FROM products WHERE slug = 'mose-essential-tee-wit'), 'S', 'Wit', '#FFFFFF', 'MET-S-WHT', 25, 0, true),
((SELECT id FROM products WHERE slug = 'mose-essential-tee-wit'), 'M', 'Wit', '#FFFFFF', 'MET-M-WHT', 30, 0, true),
((SELECT id FROM products WHERE slug = 'mose-essential-tee-wit'), 'L', 'Wit', '#FFFFFF', 'MET-L-WHT', 28, 0, true),
((SELECT id FROM products WHERE slug = 'mose-essential-tee-wit'), 'XL', 'Wit', '#FFFFFF', 'MET-XL-WHT', 20, 0, true)
ON CONFLICT (product_id, size, color) DO NOTHING;

-- MOSE Essential Tee Zwart - Variants
INSERT INTO product_variants (product_id, size, color, color_hex, sku, stock_quantity, price_adjustment, is_available) VALUES
((SELECT id FROM products WHERE slug = 'mose-essential-tee-zwart'), 'S', 'Zwart', '#000000', 'MET-S-BLK', 22, 0, true),
((SELECT id FROM products WHERE slug = 'mose-essential-tee-zwart'), 'M', 'Zwart', '#000000', 'MET-M-BLK', 28, 0, true),
((SELECT id FROM products WHERE slug = 'mose-essential-tee-zwart'), 'L', 'Zwart', '#000000', 'MET-L-BLK', 3, 0, true),
((SELECT id FROM products WHERE slug = 'mose-essential-tee-zwart'), 'XL', 'Zwart', '#000000', 'MET-XL-BLK', 18, 0, true)
ON CONFLICT (product_id, size, color) DO NOTHING;

-- MOSE Crewneck Sweater - Variants (Navy + Black)
INSERT INTO product_variants (product_id, size, color, color_hex, sku, stock_quantity, price_adjustment, is_available) VALUES
((SELECT id FROM products WHERE slug = 'mose-crewneck-sweater'), 'M', 'Navy', '#001F3F', 'MCS-M-NVY', 12, 0, true),
((SELECT id FROM products WHERE slug = 'mose-crewneck-sweater'), 'L', 'Navy', '#001F3F', 'MCS-L-NVY', 15, 0, true),
((SELECT id FROM products WHERE slug = 'mose-crewneck-sweater'), 'XL', 'Navy', '#001F3F', 'MCS-XL-NVY', 10, 0, true),
((SELECT id FROM products WHERE slug = 'mose-crewneck-sweater'), 'M', 'Zwart', '#000000', 'MCS-M-BLK', 8, 0, true),
((SELECT id FROM products WHERE slug = 'mose-crewneck-sweater'), 'L', 'Zwart', '#000000', 'MCS-L-BLK', 12, 0, true),
((SELECT id FROM products WHERE slug = 'mose-crewneck-sweater'), 'XL', 'Zwart', '#000000', 'MCS-XL-BLK', 2, 0, true)
ON CONFLICT (product_id, size, color) DO NOTHING;

-- MOSE Snapback Cap - Variants
INSERT INTO product_variants (product_id, size, color, color_hex, sku, stock_quantity, price_adjustment, is_available) VALUES
((SELECT id FROM products WHERE slug = 'mose-snapback-cap'), 'One Size', 'Zwart', '#000000', 'MSC-OS-BLK', 20, 0, true),
((SELECT id FROM products WHERE slug = 'mose-snapback-cap'), 'One Size', 'Navy', '#001F3F', 'MSC-OS-NVY', 15, 0, true),
((SELECT id FROM products WHERE slug = 'mose-snapback-cap'), 'One Size', 'Groen', '#00A676', 'MSC-OS-GRN', 10, 0, true)
ON CONFLICT (product_id, size, color) DO NOTHING;

-- Add product images (using local MOSE images)
INSERT INTO product_images (product_id, url, alt_text, position, is_primary) VALUES
-- Classic Hoodie Zwart
((SELECT id FROM products WHERE slug = 'mose-classic-hoodie-zwart'), '/hoodieblack.png', 'MOSE Classic Hoodie Zwart', 0, true),
((SELECT id FROM products WHERE slug = 'mose-classic-hoodie-zwart'), '/hoodie_cap.png', 'MOSE Classic Hoodie Zwart styling', 1, false),

-- Oversized Hoodie Grijs
((SELECT id FROM products WHERE slug = 'mose-oversized-hoodie-grijs'), '/hoodieblack.png', 'MOSE Oversized Hoodie Grijs', 0, true),
((SELECT id FROM products WHERE slug = 'mose-oversized-hoodie-grijs'), '/hero_mose.png', 'MOSE Oversized Hoodie detail', 1, false),

-- Essential Tee Wit
((SELECT id FROM products WHERE slug = 'mose-essential-tee-wit'), '/blacktee.png', 'MOSE Essential Tee Wit', 0, true),
((SELECT id FROM products WHERE slug = 'mose-essential-tee-wit'), '/hero_mose.png', 'MOSE Essential Tee Wit styling', 1, false),

-- Essential Tee Zwart
((SELECT id FROM products WHERE slug = 'mose-essential-tee-zwart'), '/blacktee.png', 'MOSE Essential Tee Zwart', 0, true),
((SELECT id FROM products WHERE slug = 'mose-essential-tee-zwart'), '/hero_mose.png', 'MOSE Essential Tee Zwart detail', 1, false),

-- Crewneck Sweater
((SELECT id FROM products WHERE slug = 'mose-crewneck-sweater'), '/hoodieblack.png', 'MOSE Crewneck Sweater', 0, true),
((SELECT id FROM products WHERE slug = 'mose-crewneck-sweater'), '/hoodie_cap.png', 'MOSE Crewneck Sweater styling', 1, false),

-- Snapback Cap
((SELECT id FROM products WHERE slug = 'mose-snapback-cap'), '/hoodie_cap.png', 'MOSE Snapback Cap', 0, true),
((SELECT id FROM products WHERE slug = 'mose-snapback-cap'), '/claw.png', 'MOSE Snapback Cap detail', 1, false)
ON CONFLICT DO NOTHING;

