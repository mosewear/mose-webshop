-- Engelse meta-titel en meta-beschrijving per product.
--
-- De shop is tweetalig, maar er waren alleen `meta_title` en
-- `meta_description`. De Engelse pagina's kregen daardoor de Nederlandse
-- zoekresultaattekst, of een automatisch gegenereerde terugval.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS meta_title_en text,
  ADD COLUMN IF NOT EXISTS meta_description_en text;
