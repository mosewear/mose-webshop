-- De primaire afbeelding van het horloge was een videobestand.
--
-- Overal waar de shop één representatieve afbeelding kiest (`is_primary`),
-- kreeg het horloge dus een .mp4. Een <Image> kan dat niet tonen, dus stond er
-- een leeg grijs vlak: in "Maak je look compleet" in de winkelmand, en op elke
-- andere plek die dezelfde keuze maakt.
--
-- De video blijft gewoon in de galerij staan (die sorteert op `position`, niet
-- op `is_primary`), maar is niet langer de representatieve afbeelding. Per
-- kleur wordt nu een echte foto primair, zoals bij de andere producten.
UPDATE product_images pi
SET is_primary = false
FROM products p
WHERE p.id = pi.product_id
  AND p.slug = 'mose-automatisch-horloge'
  AND pi.url ~* '\.(mp4|webm|mov|m4v)$';

-- Per kleur de laagst genummerde echte foto als primair markeren.
WITH eerste AS (
  SELECT DISTINCT ON (pi.color) pi.id
  FROM product_images pi
  JOIN products p ON p.id = pi.product_id
  WHERE p.slug = 'mose-automatisch-horloge'
    AND pi.url !~* '\.(mp4|webm|mov|m4v)$'
  ORDER BY pi.color, pi.position, pi.created_at
)
UPDATE product_images SET is_primary = true WHERE id IN (SELECT id FROM eerste);
