-- Phase 2: configurable provider, model and prompt version in
-- site_settings so admins can tweak the autopilot's reasoning engine
-- without a code deploy.

INSERT INTO site_settings (key, value, description, updated_at)
VALUES
  ('ai_autopilot_provider', '"openai"'::JSONB,
   'AI-provider voor de autopilot. Geldig: openai | mock. Mock is alleen voor smoke-tests.',
   now()),
  ('ai_autopilot_model', '"gpt-4o-mini"'::JSONB,
   'Model dat de provider gebruikt. Bv. gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini.',
   now()),
  ('ai_autopilot_prompt_override', 'null'::JSONB,
   'Optionele override van de actieve prompt versie. NULL = code-default (v1-daily-audit@1.0.0).',
   now())
ON CONFLICT (key) DO NOTHING;
