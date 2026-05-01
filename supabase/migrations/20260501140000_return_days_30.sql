-- Bumps the customer-facing return window from 14 to 30 days, in line
-- with the new MOSE return policy. `site_settings.return_days` is the
-- single source of truth that is consumed by:
--   * homepage trust strip + "X dagen retour" hero stat
--   * cart / checkout / order-confirmation copy
--   * order-shipped e-mail (sets the deadline shown to the customer)
--   * /returns/new page (calculates the actual eligibility window)
--   * AI chat assistant context
-- so by flipping this single row we keep all surfaces consistent.
UPDATE site_settings
SET
  value = '"30"'::jsonb,
  description = 'Number of days a customer has to register a return after delivery (consumer right of withdrawal).',
  updated_at = NOW()
WHERE key = 'return_days';

-- Defensive insert for envs where the row does not yet exist (fresh
-- installs, brand-new staging projects). Skips silently when present.
INSERT INTO site_settings (key, value, description, updated_at)
SELECT
  'return_days',
  '"30"'::jsonb,
  'Number of days a customer has to register a return after delivery (consumer right of withdrawal).',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM site_settings WHERE key = 'return_days'
);
