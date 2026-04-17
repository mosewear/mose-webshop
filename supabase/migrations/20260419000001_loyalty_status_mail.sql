-- Loyalty-statusmail tracking.
--
-- We sturen periodiek een statusmail naar alle klanten die een bestelling
-- hebben geplaatst. Dit kan zowel een handmatige broadcast zijn als een
-- automatische trigger vanuit de Stripe webhook bij een tier-promotie.
--
-- Deze migratie voegt drie velden toe op `loyalty_points` zodat we:
--   * Kunnen zien wanneer iemand voor het laatst een statusmail kreeg
--   * Kunnen tellen hoe vaak (voor resume-safe batches en rate-limiting)
--   * Per gebruiker onthouden op welke tier de laatste mail was, zodat we
--     tier-promoties automatisch kunnen detecteren (current_tier != last_tier_mailed)

ALTER TABLE loyalty_points
  ADD COLUMN IF NOT EXISTS status_mail_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_mail_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_tier_mailed TEXT;

-- Optionele check op last_tier_mailed zodat we consistent blijven met de tier-set.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'loyalty_points_last_tier_mailed_check'
  ) THEN
    ALTER TABLE loyalty_points
      ADD CONSTRAINT loyalty_points_last_tier_mailed_check
      CHECK (
        last_tier_mailed IS NULL
        OR last_tier_mailed IN ('bronze', 'silver', 'gold')
      );
  END IF;
END $$;

-- Index om resume-safe batches snel te kunnen selecteren
-- (bijv. alle rows die in deze broadcast-run nog niet hebben gekregen).
CREATE INDEX IF NOT EXISTS idx_loyalty_points_status_mail_sent_at
  ON loyalty_points(status_mail_sent_at);
