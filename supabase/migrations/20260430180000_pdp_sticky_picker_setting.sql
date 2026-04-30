-- =====================================================
-- PDP sticky variant-picker toggle
-- =====================================================
-- Voegt een site-wide setting toe waarmee de admin de mobiele/desktop
-- sticky "voeg toe aan winkelmand"-balk op de productpagina kan in- of
-- uitschakelen. Default = true (huidige gedrag blijft hetzelfde tot de
-- admin actief uitzet).

INSERT INTO site_settings (key, value, description, updated_at)
SELECT
  'pdp_sticky_picker_enabled',
  'true',
  'Toon de sticky variant-picker (kleur, maat, voeg toe aan winkelmand) op de productpagina zodra de hoofd-CTA uit beeld scrolt.',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM site_settings WHERE key = 'pdp_sticky_picker_enabled'
);
