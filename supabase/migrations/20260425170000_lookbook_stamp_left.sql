-- Replace the loud "GEEN FAST FASHION • GEMAAKT IN GRONINGEN •
-- PREMIUM BASICS • DUURZAAM GEMAAKT" black ticker between lookbook
-- chapters with a quiet editorial location stamp.
--
-- The new pattern (rendered by LookbookStamp on the public page) is:
--   {stamp_left}    ───────    NEXT — 02 / 04 · {next chapter title}
--
-- Only the LEFT side needs admin input (location coordinates that are
-- valid in either language). The RIGHT side is auto-generated client-
-- side from existing chapter data, so editors don't have to repeat
-- themselves on every transition.
--
-- We add new optional columns instead of repurposing ticker_text_*: the
-- old strings stay around for back-compat / audit, but the public page
-- no longer renders them.
--
-- Idempotent.

ALTER TABLE lookbook_settings
  ADD COLUMN IF NOT EXISTS stamp_left_nl TEXT,
  ADD COLUMN IF NOT EXISTS stamp_left_en TEXT;

-- Seed the singleton row with the canonical Groningen coordinates.
-- Coordinates are universally formatted, so NL and EN share the same
-- string by default — editors can still override per language.
UPDATE lookbook_settings
SET
  stamp_left_nl = COALESCE(stamp_left_nl, 'GRONINGEN · 53.21°N 6.57°E'),
  stamp_left_en = COALESCE(stamp_left_en, 'GRONINGEN · 53.21°N 6.57°E')
WHERE stamp_left_nl IS NULL OR stamp_left_en IS NULL;

COMMENT ON COLUMN lookbook_settings.stamp_left_nl IS
  'Left side of the editorial stamp shown between lookbook chapters. Typically location + coordinates (e.g. "GRONINGEN · 53.21°N 6.57°E").';
COMMENT ON COLUMN lookbook_settings.stamp_left_en IS
  'English variant of stamp_left_nl. Falls back to NL when blank.';
