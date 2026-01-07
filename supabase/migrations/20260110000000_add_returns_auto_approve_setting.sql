-- Add site setting: returns_auto_approve
-- true  => auto approve return requests and allow immediate label payment
-- false => admin must approve returns before customer can pay for label

INSERT INTO site_settings (key, value, description, updated_at)
VALUES (
  'returns_auto_approve',
  'true',
  'Automatisch retouren goedkeuren zodat klant direct kan betalen voor retourlabel (true/false).',
  NOW()
)
ON CONFLICT (key) DO NOTHING;


