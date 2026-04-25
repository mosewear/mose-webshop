-- ============================================================================
-- LOOKBOOK BILINGUAL SEED FIX — 2026-04-25
--
-- Why:
--   The lookbook_chapters seed migration (20260425120000) populated the NL-
--   side columns with English defaults — both `ticker_text_nl` and
--   `eyebrow_nl` ended up holding English copy. Combined with our pickLocalized
--   helper (which only falls back to NL when EN is null/empty), this meant a
--   visitor on /nl/lookbook saw English principles and English chapter labels.
--
-- What this migration does:
--   1. Replace the English-as-NL global ticker with proper Dutch — but only
--      if the row still holds the original seeded English value, so admins
--      who already customized it in the UI keep their content.
--   2. Update the column DEFAULT for `ticker_text_nl` to the Dutch version,
--      so any future settings row inserts come out bilingual from the start.
--   3. NULL out the seeded `CHAPTER 0X` eyebrow values on both NL and EN
--      columns (again only when they match the seeded pattern). Once null,
--      the LookbookChapter component renders an auto-numbered fallback that
--      respects the active locale ("HOOFDSTUK 01" on NL, "CHAPTER 01" on EN)
--      via the next-intl `lookbook.chapterLabel` key.
-- ============================================================================

-- 1. Replace English-as-NL ticker text on the existing settings row.
--    Guard: only touch rows that still hold the exact seeded English value.
UPDATE lookbook_settings
SET ticker_text_nl = 'GEEN FAST FASHION • GEMAAKT IN GRONINGEN • PREMIUM BASICS • DUURZAAM GEMAAKT'
WHERE ticker_text_nl = 'NO FAST FASHION • MADE IN GRONINGEN • PREMIUM ESSENTIALS • BUILT TO STAY';

-- 2. Future-proof the column default so the NL slot starts in Dutch.
ALTER TABLE lookbook_settings
  ALTER COLUMN ticker_text_nl
  SET DEFAULT 'GEEN FAST FASHION • GEMAAKT IN GRONINGEN • PREMIUM BASICS • DUURZAAM GEMAAKT';

-- 3. Null out auto-fillable eyebrow values so the locale-aware fallback
--    inside LookbookChapter ("HOOFDSTUK NN" on NL / "CHAPTER NN" on EN)
--    takes over. Custom admin-authored eyebrows (anything that doesn't
--    match the seeded pattern) are left untouched.
UPDATE lookbook_chapters
SET eyebrow_nl = NULL
WHERE eyebrow_nl ~ '^CHAPTER\s+\d{2}$';

UPDATE lookbook_chapters
SET eyebrow_en = NULL
WHERE eyebrow_en ~ '^CHAPTER\s+\d{2}$';
