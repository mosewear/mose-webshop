-- Eén tegel per product op de shoppagina in plaats van één per kleur.
--
-- De shop toonde 10 tegels voor 4 producten: vier keer dezelfde Tee, drie keer
-- dezelfde Hoodie. Op mobiel passen er na de opruiming twee tegels boven de
-- vouw, en dan is het verschil groot: gesplitst zie je twee keer hetzelfde
-- shirt, samengevoegd zie je twee verschillende producten.
--
-- GEMETEN, dertig dagen:
--   * van 1.080 sessie-productcombinaties bekeken er 15 (1,4%) meer dan één
--     kleur van hetzelfde product. Kleur is dus geen as waarop mensen bladeren.
--   * 877 van de 1.143 productweergaven zijn de groene kleur uit de
--     advertenties. Advertenties linken rechtstreeks naar de productpagina met
--     de kleur in de link, dus kleurcontinuïteit is daar al geregeld en hoeft
--     niet van de shoppagina te komen.
--
-- De kleuren verdwijnen niet: de tegel toont de blokjes plus "4 kleuren".
-- Dit is één vlag per product. Terugdraaien is deze migratie omkeren.

update products
set show_color_variants_on_shop = false, updated_at = now()
where slug in ('mose-tee', 'mose-essential-hoodie', 'mose-classic-sweater');

-- Handmatige volgorde van de tegels. Bij vier tegels is de volgorde sterker
-- dan alle opmaak samen. Hoodie voorop: dat is het duurste kledingstuk en de
-- advertenties sturen er het meeste verkeer heen. Daarna de sweater, dan de
-- tee als instapstuk, dan het horloge.
update products set display_order = 1 where slug = 'mose-essential-hoodie';
update products set display_order = 2 where slug = 'mose-classic-sweater';
update products set display_order = 3 where slug = 'mose-tee';
update products set display_order = 4 where slug = 'mose-automatisch-horloge';
