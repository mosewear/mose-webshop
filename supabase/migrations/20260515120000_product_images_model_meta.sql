-- Per product image: model info for PDP overlay (overrides product-level
-- model fields when height + worn size are set on the row).

ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS model_name TEXT,
  ADD COLUMN IF NOT EXISTS model_height TEXT,
  ADD COLUMN IF NOT EXISTS model_build TEXT,
  ADD COLUMN IF NOT EXISTS model_build_en TEXT,
  ADD COLUMN IF NOT EXISTS model_size_worn TEXT;

COMMENT ON COLUMN product_images.model_name IS 'Model name for this shot (PDP overlay).';
COMMENT ON COLUMN product_images.model_height IS 'Model height label, e.g. 1,85 m or 182 cm.';
COMMENT ON COLUMN product_images.model_build IS 'Build / body type (Dutch), optional in overlay.';
COMMENT ON COLUMN product_images.model_build_en IS 'Build / body type (English), optional in overlay.';
COMMENT ON COLUMN product_images.model_size_worn IS 'Size the model wears in this image.';
