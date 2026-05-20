-- Phase 3c: Meta Page id + default storefront link template, used when
-- promoting an approved AI creative variant into a Meta AdCreative.
-- Both columns are nullable so existing rows continue to work; the
-- publish flow surfaces a clear "configure your page id first" error
-- when they're empty.

ALTER TABLE meta_credentials
  ADD COLUMN IF NOT EXISTS page_id TEXT,
  ADD COLUMN IF NOT EXISTS default_link_template TEXT;

COMMENT ON COLUMN meta_credentials.page_id IS
  'Facebook Page ID used as object_story_spec.page_id when publishing AI creatives.';
COMMENT ON COLUMN meta_credentials.default_link_template IS
  'Optional URL template; supports {{slug}} placeholder. Defaults to https://www.mosewear.com/nl/winkel/{{slug}} when null.';
