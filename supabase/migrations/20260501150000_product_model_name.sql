-- Optionele naam van het model in de productfoto's. Wanneer ingevuld
-- gebruikt de PDP-overlay deze om een persoonlijke pasvorm-zin te maken
-- ("TYLER IS 1,88 M EN DRAAGT MAAT XL") in plaats van het generieke
-- "MODEL IS …". Veld blijft optioneel zodat bestaande producten zonder
-- naam gewoon op de generieke variant blijven draaien.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS model_name TEXT;

COMMENT ON COLUMN products.model_name IS
  'Optional first name of the model wearing the product in the PDP imagery (e.g. "Tyler"). Used by the fit-overlay tag.';
