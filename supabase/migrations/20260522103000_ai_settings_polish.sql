-- Polish: refresh ai_autopilot_model + ai_creative_* descriptions to
-- match the post-2026-05 reality:
--  * default reasoning model bumped to gpt-5.5 (was gpt-4o-mini)
--  * creative budget cap applies to BOTH Replicate and OpenAI Images,
--    not Replicate alone
--  * default creative model description is provider-agnostic now that
--    gpt-image-2 sits next to Flux Kontext in the dropdown
--
-- Existing rows are kept unless they still hold the old defaults — we
-- never overwrite an admin's deliberate choice.

UPDATE site_settings
SET value = '"gpt-5.5"'::jsonb,
    description = 'Reasoning-model voor de autopilot. Default gpt-5.5 (vlaggenschip, ~€6/mo voor dagelijkse audit). Andere opties: gpt-5.5-pro, gpt-5.4, gpt-5.4-mini, gpt-5-mini.',
    updated_at = now()
WHERE key = 'ai_autopilot_model'
  AND value::text IN ('"gpt-4o-mini"', '"gpt-4o"', '"gpt-4.1"', '"gpt-4.1-mini"');

UPDATE site_settings
SET description = 'Maandelijkse budgetcap voor de AI creative pipeline (Replicate + OpenAI Images samen). Runs worden geweigerd als de cumulatieve maandkosten boven dit bedrag uitkomen.',
    updated_at = now()
WHERE key = 'ai_creative_monthly_cap_eur';

UPDATE site_settings
SET description = 'Standaard image-model voor garment-preserving compositing. Geldig: ''black-forest-labs/flux-kontext-pro'', ''gpt-image-2'', enz. De orchestrator routeert automatisch op model-prefix.',
    updated_at = now()
WHERE key = 'ai_creative_default_model';
