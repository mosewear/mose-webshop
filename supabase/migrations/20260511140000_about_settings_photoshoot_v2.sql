-- Photoshoot 2026 v2 — refresh about_settings hero with the new
-- "couple-on-the-steps" portrait + landscape pair so the /over-mose
-- page picks up the new imagery on a fresh DB without needing the
-- apply-photoshoot-content script. Live DBs are kept in sync by that
-- same script, but this migration is the source of truth for any
-- environment that's seeded from migrations alone.
--
-- Idempotent. Targets the singleton row created by 20260425160000_about_settings.

UPDATE about_settings
SET
  hero_image_url        = 'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/about/hero-desktop.webp',
  hero_image_url_mobile = 'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/about/hero-mobile.webp',
  image_focal_x         = 50,
  image_focal_y         = 35,
  hero_alt_nl           = 'MOSE — Irma & Rick, oprichters, op de monumentale stenen trappen in Groningen',
  hero_alt_en           = 'MOSE — Irma & Rick, founders, on the monumental stone steps in Groningen'
WHERE id IS NOT NULL;

COMMENT ON COLUMN about_settings.hero_image_url IS 'Photoshoot 2026 v2 hero (couple on Groningse stone steps).';
