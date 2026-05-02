-- Per product instelbaar of de PDP color-picker als kleur-swatches
-- (huidig: gekleurde vierkantjes per kleur) of als product-foto-tegels
-- (zoals concurrenten als ICON, je ziet dan een mini-foto van de
-- variant). Default 'swatch' zodat bestaande producten exact blijven
-- zoals ze nu zijn (geen visuele verrassingen na deploy).
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS pdp_color_picker_style TEXT
    NOT NULL DEFAULT 'swatch'
    CHECK (pdp_color_picker_style IN ('swatch', 'image'));

COMMENT ON COLUMN products.pdp_color_picker_style IS
  'Visuele stijl van de color-picker op de productpagina. Opties: ''swatch'' (gekleurd vierkant per variant, default) of ''image'' (mini productfoto per variant met klein swatch-puntje rechtsboven).';
