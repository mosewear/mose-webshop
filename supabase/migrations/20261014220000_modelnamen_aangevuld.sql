-- Modelnamen aangevuld, en de pasvormregel weg bij detailfoto's.
--
-- Rick heeft per foto doorgegeven wie erop staat, en stelde daarbij terecht de
-- vraag waarom dat voor detailfoto's zou moeten. Dat hoeft ook niet: de regel
-- "X is 1,88 m en draagt maat L" is een pasvormverwijzing, en die zegt alleen
-- iets als je het kledingstuk gedragen ziet. Bij een close-up van het borduursel
-- of van een mouw voegt hij niets toe en leidt hij alleen af van wat je bekijkt.
--
-- De velden op een foto betekenen dus: toon hier een pasvormverwijzing. Op een
-- detailfoto blijven ze leeg, net als op een groepsfoto.

-- 1. Bruine hoodie. Nr 0 is Marc, de rest van de gedragen foto's is Willem.
update product_images i
set model_name = 'Willem', model_height = '1,86 m', model_size_worn = 'L'
from products p
where p.id = i.product_id and p.slug = 'mose-essential-hoodie'
  and i.color = 'Bruin' and i.position in (1, 2, 3, 4, 5);

-- 2. Detailfoto's: geen pasvormregel. Dit haalt ook de regels weg die eerder
--    wél op close-ups stonden, zoals het borduursel van de groene hoodie en de
--    stofopname van de beige tee.
update product_images
set model_name = null, model_height = null, model_size_worn = null,
    model_build = null, model_build_en = null
where url ~ '/detail[^/]*-desktop\.webp$';

-- 3. Classic Sweater. De namen leggen we vast, maar de regel verschijnt pas
--    zodra lengte en gedragen maat bekend zijn: zonder die twee kan de zin niet
--    gemaakt worden, en een maat gokken op kleding is precies het soort fout
--    waar een retour uit voortkomt.
update product_images i
set model_name = 'Meertend'
from products p
where p.id = i.product_id and p.slug = 'mose-classic-sweater'
  and i.color = 'Off White' and i.position in (0, 1);

update product_images i
set model_name = 'Rick'
from products p
where p.id = i.product_id and p.slug = 'mose-classic-sweater'
  and i.color = 'Off White' and i.position = 2;
