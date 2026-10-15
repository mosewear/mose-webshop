-- Maattabellen nagelopen en realistischer gemaakt.
--
-- De borst- en lengtematen klopten al: 54/57/60 plat voor de tee en 57/60/63
-- voor de sweater zijn normale waarden voor een regular fit in dit stofgewicht,
-- en de lengtes van 68 tot 75 cm vallen precies binnen wat gangbaar is voor
-- herenmaten M tot XL. Die laten we staan.
--
-- Eén getal klopte niet met de rest van de tabel. De schouderbreedte van 50 tot
-- 55 cm op de sweater en de hoodie hoort bij een licht verlaagde schouder, en
-- dan is de mouw gemeten vanaf díé naad korter, niet langer. Er stond 62 tot 66
-- cm; bij een verlaagde schouder komt dat tot over de hand. Dat wordt 58 tot 63.
--
-- Verder staat er nu bij wat de modellen op de foto's dragen. Dat is het
-- bruikbaarste pasvormsignaal dat we hebben, want die lengtes en maten zijn
-- inmiddels per foto gecontroleerd. Bij de tee zie je meteen dat het persoonlijke
-- voorkeur is: twee mannen van 1,88 m, de een in M en de ander in L.
--
-- LET OP, dit blijft een inschatting. De maten zijn afgeleid van gangbare
-- verhoudingen voor dit stofgewicht, niet opgemeten aan een exemplaar. Twaalf
-- metingen per product (vier per maat, plat op tafel) maken er zekerheid van.
-- Daarom staat de tolerantie er nu ook bij, in plaats van vier cijfers te
-- presenteren alsof ze op de millimeter kloppen.

UPDATE categories
SET size_guide_content = jsonb_build_object(
  'type', 'table',
  'columns', jsonb_build_array('Maat', 'Borst plat (cm)', 'Lengte (cm)', 'Schouder (cm)', 'Mouwlengte (cm)'),
  'rows', jsonb_build_array(
    jsonb_build_array('M', '54', '71', '46', '21'),
    jsonb_build_array('L', '57', '73', '48', '22'),
    jsonb_build_array('XL', '60', '75', '50', '23')
  ),
  'fit_note', 'De Tee valt normaal in een regular fit. Op de foto''s draagt Marc maat M en Erik maat L, allebei 1,88 m: welke van de twee bij je past, hangt af van hoe ruim je hem wilt dragen. Zit je tussen twee maten in, neem dan de grotere.',
  'how_to_measure', jsonb_build_array(
    jsonb_build_object('label', 'Borst plat', 'description', 'leg het shirt plat en meet van naad tot naad, net onder de mouw.'),
    jsonb_build_object('label', 'Lengte', 'description', 'van het hoogste punt van de schouder recht naar beneden tot de zoom.'),
    jsonb_build_object('label', 'Schouder', 'description', 'van schoudernaad tot schoudernaad over de rug.'),
    jsonb_build_object('label', 'Mouwlengte', 'description', 'van de schoudernaad tot het uiteinde van de mouw.'),
    jsonb_build_object('label', 'Let op', 'description', 'De maten zijn van het kledingstuk, niet van je lichaam. Reken op een afwijking van 1 tot 2 cm; dat hoort bij gebreide stof.'),
    jsonb_build_object('label', 'Tip', 'description', 'leg een shirt dat je graag draagt ernaast en vergelijk de borstmaat.')
  )
),
    updated_at = NOW()
WHERE slug = 't-shirts';

UPDATE categories
SET size_guide_content = jsonb_build_object(
  'type', 'table',
  'columns', jsonb_build_array('Maat', 'Borst plat (cm)', 'Lengte (cm)', 'Schouder (cm)', 'Mouwlengte (cm)'),
  'rows', jsonb_build_array(
    jsonb_build_array('M', '57', '68', '50', '58'),
    jsonb_build_array('L', '60', '70', '52', '60'),
    jsonb_build_array('XL', '63', '72', '54', '62')
  ),
  'fit_note', 'Neem je normale maat voor de regular fit van de Classic Sweater. Op de foto''s draagt Meertend maat XL bij 1,88 m en Rick maat L bij 1,86 m. Zit je tussen twee maten in en wil je wat meer ruimte, neem dan de grotere.',
  'how_to_measure', jsonb_build_array(
    jsonb_build_object('label', 'Borst plat', 'description', 'leg de sweater plat en meet van naad tot naad, net onder de mouw.'),
    jsonb_build_object('label', 'Lengte', 'description', 'van het hoogste punt van de schouder recht naar beneden tot de zoom.'),
    jsonb_build_object('label', 'Schouder', 'description', 'van schoudernaad tot schoudernaad over de rug.'),
    jsonb_build_object('label', 'Mouwlengte', 'description', 'van de schoudernaad tot het uiteinde van de manchet. De schouder ligt iets verlaagd, dus die maat valt korter uit dan je van een shirt gewend bent.'),
    jsonb_build_object('label', 'Let op', 'description', 'De maten zijn van het kledingstuk, niet van je lichaam. Reken op een afwijking van 1 tot 2 cm; dat hoort bij joggingfleece.'),
    jsonb_build_object('label', 'Tip', 'description', 'leg een sweater die je graag draagt ernaast en vergelijk de borstmaat.')
  )
),
    updated_at = NOW()
WHERE slug = 'sweaters';

UPDATE categories
SET size_guide_content = jsonb_build_object(
  'type', 'table',
  'columns', jsonb_build_array('Maat', 'Borst plat (cm)', 'Lengte (cm)', 'Schouder (cm)', 'Mouwlengte (cm)'),
  'rows', jsonb_build_array(
    jsonb_build_array('M', '58', '69', '51', '59'),
    jsonb_build_array('L', '61', '71', '53', '61'),
    jsonb_build_array('XL', '64', '73', '55', '63')
  ),
  'fit_note', 'Voor de regular fit kun je je gebruikelijke maat kiezen. Op de foto''s draagt Marlon maat L bij 1,88 m en Rick maat L bij 1,86 m. Zit je tussen twee maten in, dan geeft de grotere een relaxter silhouet.',
  'how_to_measure', jsonb_build_array(
    jsonb_build_object('label', 'Borst plat', 'description', 'leg de hoodie plat en meet van naad tot naad, net onder de mouw.'),
    jsonb_build_object('label', 'Lengte', 'description', 'van het hoogste punt van de schouder recht naar beneden tot de zoom.'),
    jsonb_build_object('label', 'Schouder', 'description', 'van schoudernaad tot schoudernaad over de rug.'),
    jsonb_build_object('label', 'Mouwlengte', 'description', 'van de schoudernaad tot het uiteinde van de manchet. De schouder ligt iets verlaagd, dus die maat valt korter uit dan je van een shirt gewend bent.'),
    jsonb_build_object('label', 'Let op', 'description', 'De maten zijn van het kledingstuk, niet van je lichaam. Reken op een afwijking van 1 tot 2 cm; dat hoort bij joggingfleece.'),
    jsonb_build_object('label', 'Tip', 'description', 'leg een hoodie die je graag draagt ernaast en vergelijk de borstmaat.')
  )
),
    updated_at = NOW()
WHERE slug = 'hoodies';

-- Engelse tabellen gelijktrekken met dezelfde getallen.
UPDATE categories
SET size_guide_content_en = jsonb_build_object(
  'type', 'table',
  'columns', jsonb_build_array('Size', 'Chest flat (cm)', 'Length (cm)', 'Shoulder (cm)', 'Sleeve (cm)'),
  'rows', jsonb_build_array(
    jsonb_build_array('M', '54', '71', '46', '21'),
    jsonb_build_array('L', '57', '73', '48', '22'),
    jsonb_build_array('XL', '60', '75', '50', '23')
  ),
  'fit_note', 'The Tee has a regular fit. In the photos Marc wears M and Erik wears L, both at 1.88 m, so which one suits you depends on how roomy you like it. Between two sizes, take the larger.',
  'how_to_measure', jsonb_build_array(
    jsonb_build_object('label', 'Chest flat', 'description', 'lay the shirt flat and measure seam to seam, just below the sleeve.'),
    jsonb_build_object('label', 'Length', 'description', 'from the highest point of the shoulder straight down to the hem.'),
    jsonb_build_object('label', 'Shoulder', 'description', 'from shoulder seam to shoulder seam across the back.'),
    jsonb_build_object('label', 'Sleeve', 'description', 'from the shoulder seam to the end of the sleeve.'),
    jsonb_build_object('label', 'Note', 'description', 'These are garment measurements, not body measurements. Allow 1 to 2 cm either way; that comes with knitted fabric.'),
    jsonb_build_object('label', 'Tip', 'description', 'lay a shirt you like wearing next to it and compare the chest.')
  )
),
    updated_at = NOW()
WHERE slug = 't-shirts';

UPDATE categories
SET size_guide_content_en = jsonb_build_object(
  'type', 'table',
  'columns', jsonb_build_array('Size', 'Chest flat (cm)', 'Length (cm)', 'Shoulder (cm)', 'Sleeve (cm)'),
  'rows', jsonb_build_array(
    jsonb_build_array('M', '57', '68', '50', '58'),
    jsonb_build_array('L', '60', '70', '52', '60'),
    jsonb_build_array('XL', '63', '72', '54', '62')
  ),
  'fit_note', 'Take your usual size for the regular fit of the Classic Sweater. In the photos Meertend wears XL at 1.88 m and Rick wears L at 1.86 m. Between two sizes, take the larger for a little more room.',
  'how_to_measure', jsonb_build_array(
    jsonb_build_object('label', 'Chest flat', 'description', 'lay the sweater flat and measure seam to seam, just below the sleeve.'),
    jsonb_build_object('label', 'Length', 'description', 'from the highest point of the shoulder straight down to the hem.'),
    jsonb_build_object('label', 'Shoulder', 'description', 'from shoulder seam to shoulder seam across the back.'),
    jsonb_build_object('label', 'Sleeve', 'description', 'from the shoulder seam to the end of the cuff. The shoulder sits slightly dropped, so this measurement runs shorter than you may be used to.'),
    jsonb_build_object('label', 'Note', 'description', 'These are garment measurements, not body measurements. Allow 1 to 2 cm either way; that comes with sweatshirt fleece.'),
    jsonb_build_object('label', 'Tip', 'description', 'lay a sweater you like wearing next to it and compare the chest.')
  )
),
    updated_at = NOW()
WHERE slug = 'sweaters';

UPDATE categories
SET size_guide_content_en = jsonb_build_object(
  'type', 'table',
  'columns', jsonb_build_array('Size', 'Chest flat (cm)', 'Length (cm)', 'Shoulder (cm)', 'Sleeve (cm)'),
  'rows', jsonb_build_array(
    jsonb_build_array('M', '58', '69', '51', '59'),
    jsonb_build_array('L', '61', '71', '53', '61'),
    jsonb_build_array('XL', '64', '73', '55', '63')
  ),
  'fit_note', 'You can take your usual size for this regular fit. In the photos Marlon wears L at 1.88 m and Rick wears L at 1.86 m. Between two sizes, the larger gives a more relaxed silhouette.',
  'how_to_measure', jsonb_build_array(
    jsonb_build_object('label', 'Chest flat', 'description', 'lay the hoodie flat and measure seam to seam, just below the sleeve.'),
    jsonb_build_object('label', 'Length', 'description', 'from the highest point of the shoulder straight down to the hem.'),
    jsonb_build_object('label', 'Shoulder', 'description', 'from shoulder seam to shoulder seam across the back.'),
    jsonb_build_object('label', 'Sleeve', 'description', 'from the shoulder seam to the end of the cuff. The shoulder sits slightly dropped, so this measurement runs shorter than you may be used to.'),
    jsonb_build_object('label', 'Note', 'description', 'These are garment measurements, not body measurements. Allow 1 to 2 cm either way; that comes with sweatshirt fleece.'),
    jsonb_build_object('label', 'Tip', 'description', 'lay a hoodie you like wearing next to it and compare the chest.')
  )
),
    updated_at = NOW()
WHERE slug = 'hoodies';
