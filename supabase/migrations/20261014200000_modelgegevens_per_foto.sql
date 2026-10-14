-- Pasvormtag: gegevens per foto kloppend maken.
--
-- Aanleiding: op de PDP wisselde het bijschrift van persoon zodra je doorbladerde.
-- Foto 1 van de groene hoodie zei "Marlon is 1,88 m en draagt maat L", foto 2 zei
-- "Model is 1,86, normaal, draagt maat M". Op beide foto's staat dezelfde man.
--
-- Oorzaak: alleen de eerste foto per kleur had eigen modelgegevens. Alle andere
-- foto's vielen terug op één veld op productniveau, en dat veld kan per definitie
-- niet kloppen voor een shoot waarin elke kleur door een ander model wordt gedragen.
--
-- De terugval is uit de code gehaald. Hieronder krijgt elke foto waarvan het model
-- visueel is vastgesteld zijn eigen gegevens. Groepsfoto's (lineup, trio, duo,
-- quartet, couple) krijgen juist GEEN gegevens: één naam en één maat zeggen daar
-- niets, en "Rick en Willem is 1,86 m" is geen zin.
--
-- Lengtes staan nu overal in dezelfde notatie, met "m" erachter.

-- 1. Groene hoodie: alle negen foto's tonen Marlon (geverifieerd per foto).
update product_images i
set model_name = 'Marlon', model_height = '1,88 m', model_size_worn = 'L',
    model_build = null, model_build_en = null
from products p
where p.id = i.product_id and p.slug = 'mose-essential-hoodie'
  and i.color = 'Groen' and i.media_type = 'image';

-- 2. Zwarte hoodie: alle vijf foto's tonen Rick.
update product_images i
set model_name = 'Rick', model_height = '1,86 m', model_size_worn = 'L',
    model_build = null, model_build_en = null
from products p
where p.id = i.product_id and p.slug = 'mose-essential-hoodie'
  and i.color = 'Zwart' and i.media_type = 'image';

-- 3. Bruine hoodie: hier dragen twee mannen hetzelfde model. De hero is Marc,
--    de tweede foto Willem. De overige zes wachten op bevestiging per foto en
--    krijgen daarom nog geen naam: liever geen bijschrift dan de verkeerde man.
update product_images i
set model_height = '1,88 m', model_build = null, model_build_en = null
from products p
where p.id = i.product_id and p.slug = 'mose-essential-hoodie'
  and i.color = 'Bruin' and i.model_name = 'Marc';

update product_images i
set model_height = '1,86 m', model_build = null, model_build_en = null
from products p
where p.id = i.product_id and p.slug = 'mose-essential-hoodie'
  and i.color = 'Bruin' and i.model_name = 'Willem';

-- 4. Tee: de twee detailfoto's van de witte tee horen bij dezelfde opname als
--    de hero, dus die krijgen Erik mee. De overige kleuren hadden hun gegevens al.
update product_images i
set model_name = 'Erik', model_height = '1,88 m', model_size_worn = 'L',
    model_build = null, model_build_en = null
from products p
where p.id = i.product_id and p.slug = 'mose-tee'
  and i.color = 'Wit' and i.media_type = 'image';

update product_images i
set model_height = '1,88 m', model_build = null, model_build_en = null
from products p
where p.id = i.product_id and p.slug = 'mose-tee' and i.model_name in ('Marlon', 'Marc');

update product_images i
set model_height = '1,86 m', model_build = null, model_build_en = null
from products p
where p.id = i.product_id and p.slug = 'mose-tee' and i.model_name = 'Willem';

-- 5. Groepsfoto's: geen pasvormbijschrift. Twee modellen, twee maten.
update product_images
set model_name = null, model_height = null, model_size_worn = null,
    model_build = null, model_build_en = null
where model_name is not null and model_name like '% en %';

-- 6. De productvelden worden niet meer gelezen door de winkel. Ze leegmaken,
--    zodat niemand ze per ongeluk opnieuw als bron gaat gebruiken.
update products
set model_name = null, model_height = null, model_size_worn = null,
    model_build = null, model_build_en = null
where model_height is not null or model_size_worn is not null
   or model_name is not null or model_build is not null;
