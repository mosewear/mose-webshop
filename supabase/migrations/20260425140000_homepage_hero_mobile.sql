-- =============================================================================
-- Homepage hero — split desktop / mobile imagery
-- =============================================================================
-- Adds a dedicated mobile hero column so we can serve a portrait-cropped photo
-- on phones and a landscape one on desktop without relying on awkward
-- object-cover guesswork. The desktop column keeps its existing role as the
-- canonical hero image; the mobile column is optional and the client falls
-- back to the desktop one when it's NULL.
-- =============================================================================

ALTER TABLE homepage_settings
  ADD COLUMN IF NOT EXISTS hero_image_url_mobile TEXT;
