-- Add preview images notice setting to site_settings
INSERT INTO site_settings (key, value, description, updated_at)
VALUES (
  'show_preview_images_notice',
  false,
  'Show preview images notice on product pages (while using AI-generated images)',
  NOW()
)
ON CONFLICT (key) DO NOTHING;
