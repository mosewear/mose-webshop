-- =============================================================================
-- Lookbook Chapters + Chapter Products
-- =============================================================================
-- Replaces the rigid, fixed-section layout of lookbook_settings with an
-- unlimited, ordered list of "chapters" — each one an editorial page with
-- a hero image, typography, a sticky caption and a zero-to-many relation
-- to actual products. The public lookbook page renders chapters in order
-- and auto-picks a shop-module variant based on the number of linked
-- products (1 = THE PIECE, 2-3 = THE OUTFIT, 4+ = SHOP THE LOOK).
--
-- `lookbook_settings` is preserved for global/header/ticker/final-CTA
-- settings. The section/triple/wide/quote columns on that table become
-- deprecated once this migration runs but are not dropped in this PR to
-- keep rollback trivial; a later migration will remove them.
-- =============================================================================

-- ------------------------------------------------------------------
-- 1. Tables
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lookbook_chapters (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order        INT NOT NULL DEFAULT 0,

  -- Editorial copy (NL is authoritative, EN falls back to NL when empty)
  eyebrow_nl        TEXT,                         -- e.g. "CHAPTER 01", auto-filled if null
  eyebrow_en        TEXT,
  title_nl          TEXT NOT NULL,
  title_en          TEXT,
  caption_nl        TEXT,                         -- sticky side-caption / body text
  caption_en        TEXT,

  -- Hero imagery
  hero_image_url    TEXT NOT NULL,
  image_focal_x     INT NOT NULL DEFAULT 50 CHECK (image_focal_x BETWEEN 0 AND 100),
  image_focal_y     INT NOT NULL DEFAULT 50 CHECK (image_focal_y BETWEEN 0 AND 100),

  -- Layout / theme variant (affects grid + colour inversion)
  --   'wide'        : full-bleed hero, caption below
  --   'split-right' : image left / caption right   (7:5 grid)
  --   'split-left'  : caption left / image right   (5:7 grid)
  --   'dark'        : inverted colour scheme for drama
  layout_variant    TEXT NOT NULL DEFAULT 'wide'
                    CHECK (layout_variant IN ('wide','split-right','split-left','dark')),

  -- Custom marquee text for THIS chapter (optional, falls back to global
  -- default set on lookbook_settings.ticker_text_* if null)
  ticker_text_nl    TEXT,
  ticker_text_en    TEXT,

  -- Editorial meta pairs shown in THE PIECE variant. JSONB array of
  -- { label_nl, label_en, value_nl, value_en } objects, max 3. Admin
  -- UI enforces the limit; DB allows it for flexibility.
  meta              JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Toggle to hide a chapter without deleting it
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lookbook_chapters_sort_idx
  ON lookbook_chapters (sort_order) WHERE is_active;

-- ------------------------------------------------------------------
-- 2. Chapter <-> Product join table
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lookbook_chapter_products (
  chapter_id  UUID NOT NULL REFERENCES lookbook_chapters(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chapter_id, product_id)
);

CREATE INDEX IF NOT EXISTS lookbook_chapter_products_sort_idx
  ON lookbook_chapter_products (chapter_id, sort_order);

-- ------------------------------------------------------------------
-- 3. Keep updated_at fresh
-- ------------------------------------------------------------------

CREATE OR REPLACE FUNCTION lookbook_chapters_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lookbook_chapters_touch ON lookbook_chapters;
CREATE TRIGGER lookbook_chapters_touch
  BEFORE UPDATE ON lookbook_chapters
  FOR EACH ROW EXECUTE FUNCTION lookbook_chapters_touch_updated_at();

-- ------------------------------------------------------------------
-- 4. RLS — mirrors the pattern used by homepage_settings and
--    lookbook_settings: public can read, authenticated can write
--    (admin gate is enforced in application code via requireAdmin).
-- ------------------------------------------------------------------

ALTER TABLE lookbook_chapters          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookbook_chapter_products  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_lookbook_chapters"        ON lookbook_chapters;
DROP POLICY IF EXISTS "auth_write_lookbook_chapters"         ON lookbook_chapters;
DROP POLICY IF EXISTS "public_read_lookbook_chapter_products" ON lookbook_chapter_products;
DROP POLICY IF EXISTS "auth_write_lookbook_chapter_products"  ON lookbook_chapter_products;

CREATE POLICY "public_read_lookbook_chapters"
  ON lookbook_chapters FOR SELECT TO public USING (true);

CREATE POLICY "auth_write_lookbook_chapters"
  ON lookbook_chapters FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "public_read_lookbook_chapter_products"
  ON lookbook_chapter_products FOR SELECT TO public USING (true);

CREATE POLICY "auth_write_lookbook_chapter_products"
  ON lookbook_chapter_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------
-- 5. Add a shared global-ticker column to lookbook_settings
--    (the new Chapters UI will use this as the default marquee text
--    when a chapter leaves ticker_text_* blank).
-- ------------------------------------------------------------------

ALTER TABLE lookbook_settings
  ADD COLUMN IF NOT EXISTS ticker_text_nl TEXT DEFAULT 'NO FAST FASHION • MADE IN GRONINGEN • PREMIUM ESSENTIALS • BUILT TO STAY',
  ADD COLUMN IF NOT EXISTS ticker_text_en TEXT DEFAULT 'NO FAST FASHION • MADE IN GRONINGEN • PREMIUM ESSENTIALS • BUILT TO STAY';

-- ------------------------------------------------------------------
-- 6. Seed initial chapters from the existing lookbook_settings row
--    so the public page has content from day one without needing an
--    admin to redo the work. Guarded: only seeds when no chapters
--    exist yet. Source fields that are NULL are skipped to avoid
--    empty chapters.
-- ------------------------------------------------------------------

DO $$
DECLARE
  s lookbook_settings%ROWTYPE;
BEGIN
  IF EXISTS (SELECT 1 FROM lookbook_chapters LIMIT 1) THEN
    RETURN;
  END IF;

  SELECT * INTO s FROM lookbook_settings ORDER BY created_at ASC LIMIT 1;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- CHAPTER 01  — from hero block (wide, open)
  IF s.hero_image_url IS NOT NULL AND s.hero_title IS NOT NULL THEN
    INSERT INTO lookbook_chapters
      (sort_order, eyebrow_nl, eyebrow_en, title_nl, title_en,
       caption_nl, caption_en, hero_image_url, layout_variant)
    VALUES
      (10, 'CHAPTER 01', 'CHAPTER 01', s.hero_title, s.hero_title_en,
       s.hero_subtitle, s.hero_subtitle_en, s.hero_image_url, 'wide');
  END IF;

  -- CHAPTER 02  — section 1 (image left / text right)
  IF s.section1_image_url IS NOT NULL AND s.section1_title IS NOT NULL THEN
    INSERT INTO lookbook_chapters
      (sort_order, eyebrow_nl, eyebrow_en, title_nl, title_en,
       caption_nl, caption_en, hero_image_url, layout_variant)
    VALUES
      (20, 'CHAPTER 02', 'CHAPTER 02', s.section1_title, s.section1_title_en,
       s.section1_text, s.section1_text_en, s.section1_image_url, 'split-right');
  END IF;

  -- CHAPTER 03  — dark / quote block
  IF s.quote_text IS NOT NULL THEN
    INSERT INTO lookbook_chapters
      (sort_order, eyebrow_nl, eyebrow_en, title_nl, title_en,
       caption_nl, caption_en, hero_image_url, layout_variant)
    VALUES
      (30, 'CHAPTER 03', 'CHAPTER 03',
       s.quote_text, s.quote_text_en,
       s.quote_subtext, s.quote_subtext_en,
       COALESCE(s.wide_image_url, s.hero_image_url), 'dark');
  END IF;

  -- CHAPTER 04  — section 2 (text left / image right)
  IF s.section2_image_url IS NOT NULL AND s.section2_title IS NOT NULL THEN
    INSERT INTO lookbook_chapters
      (sort_order, eyebrow_nl, eyebrow_en, title_nl, title_en,
       caption_nl, caption_en, hero_image_url, layout_variant)
    VALUES
      (40, 'CHAPTER 04', 'CHAPTER 04', s.section2_title, s.section2_title_en,
       s.section2_text, s.section2_text_en, s.section2_image_url, 'split-left');
  END IF;

  -- CHAPTER 05  — wide lifestyle photo
  IF s.wide_image_url IS NOT NULL AND s.wide_title IS NOT NULL THEN
    INSERT INTO lookbook_chapters
      (sort_order, eyebrow_nl, eyebrow_en, title_nl, title_en,
       caption_nl, caption_en, hero_image_url, layout_variant)
    VALUES
      (50, 'CHAPTER 05', 'CHAPTER 05', s.wide_title, s.wide_title_en,
       NULL, NULL, s.wide_image_url, 'wide');
  END IF;
END $$;
