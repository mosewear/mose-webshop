-- =====================================================
-- ANNOUNCEMENT BANNER — i18n (NL/EN)
-- =====================================================
-- Add English fields to announcement_messages so the marketing
-- banner can render in the visitor's current locale.
--
-- Convention (matches src/lib/i18n-db.ts):
--   - Dutch is the default; keep existing columns (`text`, `cta_text`)
--   - English uses the `_en` suffix; columns are NULLABLE and fall
--     back to the Dutch value when empty.
--
-- link_url is kept as a single column. URLs are normalized to a
-- locale-agnostic path (e.g. `/shop`, `/verzending`) so the app
-- can prefix the current locale via next-intl's Link helper.

ALTER TABLE announcement_messages
  ADD COLUMN IF NOT EXISTS text_en TEXT,
  ADD COLUMN IF NOT EXISTS cta_text_en TEXT;

-- Normalize existing link_url values: strip leading `/nl/` or `/en/`
-- so the app's locale-aware Link can inject the current locale.
-- Also normalize the bare `/nl` / `/en` that would otherwise point
-- at the locale home page.
UPDATE announcement_messages
SET link_url = regexp_replace(link_url, '^/(nl|en)(/|$)', '/', 'i')
WHERE link_url ~* '^/(nl|en)(/|$)';

COMMENT ON COLUMN announcement_messages.text_en IS
  'English translation of `text`. Falls back to Dutch `text` when NULL.';

COMMENT ON COLUMN announcement_messages.cta_text_en IS
  'English translation of `cta_text`. Falls back to Dutch `cta_text` when NULL.';
