-- =====================================================
-- PDP brand-discovery widget toggle
-- =====================================================
-- Voegt een site-wide setting toe waarmee de admin de sticky
-- "WIE ZIJN WIJ?" merk-introductie-pill (links onderin de PDP, met
-- roterende Instagram-thumbnail) kan in- of uitschakelen. Default
-- = true: zolang er IG-posts zijn én de admin niet expliciet uit
-- zet, verschijnt de widget op elke productpagina.

INSERT INTO site_settings (key, value, description, updated_at)
SELECT
  'pdp_brand_widget_enabled',
  'true',
  'Toon de sticky brand-discovery widget bottom-left op de productpagina (Instagram-thumbnail + WIE ZIJN WIJ? CTA, opent modal met merkverhaal en IG-grid).',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM site_settings WHERE key = 'pdp_brand_widget_enabled'
);
