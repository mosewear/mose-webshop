-- =====================================================
-- PDP brand-discovery widget DESIGN selector
-- =====================================================
-- Voegt een site-wide setting toe waarmee de admin kan kiezen welk
-- visueel design de brand-discovery pill op de productpagina krijgt.
-- Geldige waarden: 'classic', 'story-card', 'polaroid', 'avatar',
-- 'minimal'. Default = 'classic' (= het oorspronkelijke ontwerp).

-- Value-kolom is jsonb; string-waarden moeten als JSON-string
-- ge-encodeerd worden (dubbele quotes binnen single quotes).
INSERT INTO site_settings (key, value, description, updated_at)
SELECT
  'pdp_brand_widget_design',
  '"classic"'::jsonb,
  'Welk design de brand-discovery pill op de productpagina gebruikt. Opties: classic (horizontale pill), story-card (vertical magazine cover), polaroid (tilted photo card), avatar (round profile mention), minimal (compact text tag).',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM site_settings WHERE key = 'pdp_brand_widget_design'
);
