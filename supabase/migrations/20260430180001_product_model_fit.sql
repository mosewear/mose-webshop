-- =====================================================
-- Pasvorm-referentie per product (model fit info)
-- =====================================================
-- Stelt de admin in staat om per product op te geven hoe lang het
-- model in de productfoto's is, wat voor bouw hij heeft en welke maat
-- hij draagt. Klanten zien dit op de PDP direct onder de size-picker
-- zodat ze hun eigen maat kunnen referencen.
--
-- Velden:
--   model_height      - vrije tekst (universeel, bv. "1,85 m" of "6'1\"")
--   model_build       - bouwomschrijving NL (bv. "atletisch")
--   model_build_en    - bouwomschrijving EN (bv. "athletic")
--   model_size_worn   - vrije tekst, de maat die het model draagt
--                       (bv. "M"). Vrije tekst zodat we ook met
--                       afwijkende maatsystemen (XS-XXL, 39-47, etc.)
--                       en categorieën zonder maten (one-size, watch)
--                       kunnen omgaan.
--
-- Alle velden zijn optioneel: als ze leeg blijven verschijnt er niets
-- op de PDP.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS model_height    TEXT,
  ADD COLUMN IF NOT EXISTS model_build     TEXT,
  ADD COLUMN IF NOT EXISTS model_build_en  TEXT,
  ADD COLUMN IF NOT EXISTS model_size_worn TEXT;

COMMENT ON COLUMN products.model_height IS
  'Lengte van het model in de productfoto''s (vrije tekst, bv. "1,85 m"). Universele weergave, geen vertaling nodig.';
COMMENT ON COLUMN products.model_build IS
  'Bouwomschrijving NL voor het model (bv. "atletisch", "slank", "stevig").';
COMMENT ON COLUMN products.model_build_en IS
  'Bouwomschrijving EN voor het model (bv. "athletic", "slim", "stocky").';
COMMENT ON COLUMN products.model_size_worn IS
  'De maat die het model draagt (vrije tekst, bv. "M"). Helpt klanten hun eigen maat kiezen.';
