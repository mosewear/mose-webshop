-- Phase 3b: monthly Replicate budget cap for the creative pipeline.
-- A run that would push the rolling month-to-date spend above this
-- ceiling is rejected by the API before any Replicate call is issued.

INSERT INTO site_settings (key, value, description, updated_at)
VALUES
  (
    'ai_creative_monthly_cap_eur',
    '150'::JSONB,
    'Maandelijkse Replicate-budgetcap voor de creative pipeline. Runs worden geweigerd als de cumulatieve maandkosten boven dit bedrag uitkomen.',
    now()
  ),
  (
    'ai_creative_default_model',
    '"black-forest-labs/flux-kontext-pro"'::JSONB,
    'Standaard Replicate-model voor garment-preserving compositing.',
    now()
  ),
  (
    'ai_creative_auto_approve',
    'true'::JSONB,
    'Auto-approve variants die door alle QA-drempels gaan (SSIM, palette, ad-policy). Bij false blijven ze altijd in handmatige review.',
    now()
  )
ON CONFLICT (key) DO NOTHING;
