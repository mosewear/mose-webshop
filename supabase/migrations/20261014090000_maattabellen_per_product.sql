-- Maattabellen per product in plaats van één gedeelde tabel.
--
-- Wat er stond: één tabel op categorieniveau met LICHAAMSMATEN (borst 88-96 voor
-- maat S), identiek voor t-shirt, sweater en hoodie. Twee problemen. Een shirt
-- van 240 gram en een hoodie van 300 gram hebben niet dezelfde afmetingen, dus
-- die tabel kon per definitie niet voor alle drie kloppen. En lichaamsmaten
-- vertellen welke maat bij je lichaam hoort, niet hoe ruim het kledingstuk zelf
-- valt; bij zware basics, waar de pasvorm het hele verhaal is, is dat net de
-- verkeerde van de twee.
--
-- De tabel noemde bovendien maat S en XXL terwijl MOSE alleen M, L en XL
-- verkoopt. Een bezoeker die S zoekt, dacht dus dat die bestond.
--
-- LET OP: deze waarden volgen de gangbare maatverhoudingen voor regular fit bij
-- dit stofgewicht. Ze moeten nog gecontroleerd worden tegen een echt exemplaar
-- per maat, plat op tafel. Dat staat als open punt.

UPDATE categories
SET size_guide_content = '{"type": "table", "columns": ["Maat", "Borst plat (cm)", "Lengte (cm)", "Schouder (cm)", "Mouwlengte (cm)"], "rows": [["M", "54", "71", "46", "21"], ["L", "57", "73", "48", "22"], ["XL", "60", "75", "50", "23"]], "how_to_measure": ["Borst plat: leg het shirt plat en meet van naad tot naad, net onder de mouw.", "Lengte: van het hoogste punt van de schouder recht naar beneden tot de zoom.", "Schouder: van schoudernaad tot schoudernaad over de rug.", "Mouwlengte: van de schoudernaad tot het uiteinde van de mouw.", "Tip: leg een shirt dat je graag draagt ernaast en vergelijk de borstmaat."]}'::jsonb,
    updated_at = NOW()
WHERE slug = 't-shirts';

UPDATE categories
SET size_guide_content = '{"type": "table", "columns": ["Maat", "Borst plat (cm)", "Lengte (cm)", "Schouder (cm)", "Mouwlengte (cm)"], "rows": [["M", "57", "68", "50", "62"], ["L", "60", "70", "52", "64"], ["XL", "63", "72", "54", "66"]], "how_to_measure": ["Borst plat: leg de sweater plat en meet van naad tot naad, net onder de mouw.", "Lengte: van het hoogste punt van de schouder recht naar beneden tot de zoom.", "Schouder: van schoudernaad tot schoudernaad over de rug.", "Mouwlengte: van de schoudernaad tot het uiteinde van de manchet.", "Tip: leg een sweater die je graag draagt ernaast en vergelijk de borstmaat."]}'::jsonb,
    updated_at = NOW()
WHERE slug = 'sweaters';

UPDATE categories
SET size_guide_content = '{"type": "table", "columns": ["Maat", "Borst plat (cm)", "Lengte (cm)", "Schouder (cm)", "Mouwlengte (cm)"], "rows": [["M", "58", "69", "51", "62"], ["L", "61", "71", "53", "64"], ["XL", "64", "73", "55", "66"]], "how_to_measure": ["Borst plat: leg de hoodie plat en meet van naad tot naad, net onder de mouw.", "Lengte: van het hoogste punt van de schouder recht naar beneden tot de zoom.", "Schouder: van schoudernaad tot schoudernaad over de rug.", "Mouwlengte: van de schoudernaad tot het uiteinde van de manchet.", "Tip: leg een hoodie die je graag draagt ernaast en vergelijk de borstmaat."]}'::jsonb,
    updated_at = NOW()
WHERE slug = 'hoodies';
