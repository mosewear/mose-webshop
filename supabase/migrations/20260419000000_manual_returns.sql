-- Handmatig retour aanmaken vanuit de admin.
--
-- Voegt drie extra kolommen toe aan `returns` zodat we:
--   * Weten hoe het retourlabel afgehandeld moet worden (label_mode)
--   * Zien welke admin de retour handmatig heeft aangemaakt
--   * Kunnen filteren op handmatig aangemaakte retouren
--
-- Er zijn GEEN nieuwe statussen nodig: de bestaande statussen dekken
-- alle flow-paden (zie plan).

ALTER TABLE returns
  ADD COLUMN IF NOT EXISTS label_mode TEXT,
  ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_created_at TIMESTAMP WITH TIME ZONE;

-- Check constraint op label_mode (nullable voor bestaande rijen).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'returns_label_mode_check'
  ) THEN
    ALTER TABLE returns
      ADD CONSTRAINT returns_label_mode_check
      CHECK (
        label_mode IS NULL
        OR label_mode IN (
          'admin_generated',
          'customer_paid',
          'customer_free',
          'in_store'
        )
      );
  END IF;
END $$;

-- Index om handmatig aangemaakte retouren snel te vinden in de admin UI.
CREATE INDEX IF NOT EXISTS idx_returns_created_by_admin
  ON returns(created_by_admin_id)
  WHERE created_by_admin_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_returns_label_mode
  ON returns(label_mode)
  WHERE label_mode IS NOT NULL;
