-- About-page settings: single-row table that powers /over-mose so the
-- founder can manage hero imagery + every copy block from /admin/about.
--
-- Schema follows the same conventions as homepage_settings + lookbook_settings:
--   * One singleton row, RLS enforces public read + admin write
--   * NL columns are the source of truth, _en columns optional fallback
--   * Image fields support an art-directed mobile portrait variant + focal point
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS about_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Hero
  hero_image_url TEXT,
  hero_image_url_mobile TEXT,
  image_focal_x SMALLINT NOT NULL DEFAULT 50 CHECK (image_focal_x BETWEEN 0 AND 100),
  image_focal_y SMALLINT NOT NULL DEFAULT 30 CHECK (image_focal_y BETWEEN 0 AND 100),
  hero_alt_nl TEXT,
  hero_alt_en TEXT,
  hero_title_nl TEXT NOT NULL DEFAULT 'OVER MOSE',
  hero_title_en TEXT,
  hero_subtitle_nl TEXT NOT NULL DEFAULT 'Geen poespas. Wel karakter.',
  hero_subtitle_en TEXT,

  -- Story
  story_title_nl TEXT NOT NULL DEFAULT 'ONS VERHAAL',
  story_title_en TEXT,
  story_paragraph1_nl TEXT NOT NULL DEFAULT '',
  story_paragraph1_en TEXT,
  story_paragraph2_nl TEXT NOT NULL DEFAULT '',
  story_paragraph2_en TEXT,

  -- Local block
  local_title_nl TEXT NOT NULL DEFAULT 'LOKAAL GEMAAKT IN GRONINGEN',
  local_title_en TEXT,
  local_text_nl TEXT NOT NULL DEFAULT '',
  local_text_en TEXT,

  -- Values block
  values_title_nl TEXT NOT NULL DEFAULT 'ONZE WAARDEN',
  values_title_en TEXT,
  value_quality_title_nl TEXT NOT NULL DEFAULT 'Premium kwaliteit',
  value_quality_title_en TEXT,
  value_quality_text_nl TEXT NOT NULL DEFAULT '',
  value_quality_text_en TEXT,
  value_local_made_title_nl TEXT NOT NULL DEFAULT 'Lokaal gemaakt',
  value_local_made_title_en TEXT,
  value_local_made_text_nl TEXT NOT NULL DEFAULT '',
  value_local_made_text_en TEXT,
  value_fair_pricing_title_nl TEXT NOT NULL DEFAULT 'Eerlijke prijzen',
  value_fair_pricing_title_en TEXT,
  value_fair_pricing_text_nl TEXT NOT NULL DEFAULT '',
  value_fair_pricing_text_en TEXT,
  value_no_hassle_title_nl TEXT NOT NULL DEFAULT 'Geen gedoe',
  value_no_hassle_title_en TEXT,
  -- {days} and {threshold} placeholders are interpolated at render time.
  value_no_hassle_text_nl TEXT NOT NULL DEFAULT '{days} dagen retour, gratis verzending vanaf €{threshold}, en snelle klantenservice. Simpel.',
  value_no_hassle_text_en TEXT,

  -- Why block
  why_title_nl TEXT NOT NULL DEFAULT 'WAAROM MOSE?',
  why_title_en TEXT,
  why_sustainable_title_nl TEXT NOT NULL DEFAULT 'Duurzaam zonder bullshit',
  why_sustainable_title_en TEXT,
  why_sustainable_text_nl TEXT NOT NULL DEFAULT '',
  why_sustainable_text_en TEXT,
  why_stylish_title_nl TEXT NOT NULL DEFAULT 'Stoer maar stijlvol',
  why_stylish_title_en TEXT,
  why_stylish_text_nl TEXT NOT NULL DEFAULT '',
  why_stylish_text_en TEXT,
  why_local_title_nl TEXT NOT NULL DEFAULT 'Trots lokaal',
  why_local_title_en TEXT,
  why_local_text_nl TEXT NOT NULL DEFAULT '',
  why_local_text_en TEXT,

  -- CTA
  cta_text_nl TEXT NOT NULL DEFAULT 'Ontdek de collectie',
  cta_text_en TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-bump updated_at
CREATE OR REPLACE FUNCTION about_settings_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS about_settings_updated_at ON about_settings;
CREATE TRIGGER about_settings_updated_at
  BEFORE UPDATE ON about_settings
  FOR EACH ROW EXECUTE FUNCTION about_settings_set_updated_at();

-- Row-level security: anyone can read, only admins can write.
ALTER TABLE about_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "About settings are publicly readable" ON about_settings;
CREATE POLICY "About settings are publicly readable"
  ON about_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can update about settings" ON about_settings;
CREATE POLICY "Only admins can update about settings"
  ON about_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Only admins can insert about settings" ON about_settings;
CREATE POLICY "Only admins can insert about settings"
  ON about_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Seed the singleton row with the copy that previously lived in
-- messages/{nl,en}.json so the public page renders unchanged after the
-- refactor. Only inserts when the table is empty.
INSERT INTO about_settings (
  hero_image_url,
  hero_image_url_mobile,
  image_focal_x,
  image_focal_y,
  hero_alt_nl,
  hero_alt_en,
  hero_title_nl, hero_title_en,
  hero_subtitle_nl, hero_subtitle_en,
  story_title_nl, story_title_en,
  story_paragraph1_nl, story_paragraph1_en,
  story_paragraph2_nl, story_paragraph2_en,
  local_title_nl, local_title_en,
  local_text_nl, local_text_en,
  values_title_nl, values_title_en,
  value_quality_title_nl, value_quality_title_en,
  value_quality_text_nl, value_quality_text_en,
  value_local_made_title_nl, value_local_made_title_en,
  value_local_made_text_nl, value_local_made_text_en,
  value_fair_pricing_title_nl, value_fair_pricing_title_en,
  value_fair_pricing_text_nl, value_fair_pricing_text_en,
  value_no_hassle_title_nl, value_no_hassle_title_en,
  value_no_hassle_text_nl, value_no_hassle_text_en,
  why_title_nl, why_title_en,
  why_sustainable_title_nl, why_sustainable_title_en,
  why_sustainable_text_nl, why_sustainable_text_en,
  why_stylish_title_nl, why_stylish_title_en,
  why_stylish_text_nl, why_stylish_text_en,
  why_local_title_nl, why_local_title_en,
  why_local_text_nl, why_local_text_en,
  cta_text_nl, cta_text_en
)
SELECT
  'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/about/hero-desktop.webp',
  'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/images/photoshoot-2026/about/hero-mobile.webp',
  50,
  30,
  'MOSE — gedragen in het echte leven, gemaakt in Groningen',
  'MOSE — worn in real life, made in Groningen',
  'OVER MOSE', 'ABOUT MOSE',
  'Geen poespas. Wel karakter.', 'No nonsense. Pure character.',
  'ONS VERHAAL', 'OUR STORY',
  'MOSE is geboren uit frustratie. Frustratie over fast fashion, over wegwerpkleding, over merken die grote beloftes maken maar niet nakomen. Wij geloven dat kleding gewoon goed moet zijn. Punt.',
  'MOSE was born from frustration. Frustration about fast fashion, throwaway clothing, and brands that make big promises but don''t deliver. We believe clothing should simply be good. Period.',
  'Daarom maken we premium basics die lang meegaan. Kleding zonder concessies, zonder poespas. Stoer, modern, en met karakter. Gebouwd om te blijven.',
  'That''s why we create premium basics built to last. Clothing without compromises, without nonsense. Rugged, modern, and full of character. Built to stay.',
  'LOKAAL GEMAAKT IN GRONINGEN', 'LOCALLY MADE IN GRONINGEN',
  'Al onze producten worden lokaal gemaakt in Groningen. Niet omdat het hip is, maar omdat we precies willen weten waar onze kleding vandaan komt en hoe het gemaakt wordt. Eerlijk, transparant, en met respect voor iedereen die eraan werkt.',
  'All our products are locally made in Groningen. Not because it''s trendy, but because we want to know exactly where our clothing comes from and how it''s made. Honest, transparent, and with respect for everyone involved in the process.',
  'ONZE WAARDEN', 'OUR VALUES',
  'Premium kwaliteit', 'Premium quality',
  'Alleen de beste materialen en perfecte afwerking. Kleding die jarenlang meegaat.',
  'Only the finest materials and perfect finishing. Clothing that lasts for years.',
  'Lokaal gemaakt', 'Locally made',
  '100% geproduceerd in Groningen. We kennen iedereen die aan je kleding werkt.',
  '100% produced in Groningen. We know everyone who works on your clothing.',
  'Eerlijke prijzen', 'Fair pricing',
  'Geen opgeblazen prijzen of fake sales. Gewoon eerlijk geprijsd voor wat je krijgt.',
  'No inflated prices or fake sales. Just honest pricing for what you get.',
  'Geen gedoe', 'No hassle',
  '{days} dagen retour, gratis verzending vanaf €{threshold}, en snelle klantenservice. Simpel.',
  '{days} days return policy, free shipping from €{threshold}, and fast customer service. Simple.',
  'WAAROM MOSE?', 'WHY MOSE?',
  'Duurzaam zonder bullshit', 'Sustainable without the BS',
  'We maken kleding die lang meegaat. Dat is de beste sustainability.',
  'We make clothing that lasts. That''s the best sustainability.',
  'Stoer maar stijlvol', 'Rugged yet stylish',
  'Basics met karakter. Voor moderne mannen die weten wat ze willen.',
  'Basics with character. For modern men who know what they want.',
  'Trots lokaal', 'Proudly local',
  'Gemaakt in Groningen, gedragen door heel Nederland.',
  'Made in Groningen, worn throughout the Netherlands.',
  'Ontdek de collectie', 'Discover the collection'
WHERE NOT EXISTS (SELECT 1 FROM about_settings);

COMMENT ON TABLE about_settings IS 'Single-row settings powering the public /over-mose page. Managed from /admin/about.';
