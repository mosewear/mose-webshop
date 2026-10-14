-- Definitieve productcopy, kernpunten, meta en maattabellen.
--
-- Beschrijvingen en de ** voor vetgedrukt zijn letterlijk aangeleverd.
-- Kernpunten, meta-teksten en pasvormregels komen uit de tweede aanlevering.
--
-- Drie dingen die ik hierbij repareer:
--  1. `how_to_measure` stond als platte strings in de maattabel, terwijl
--     DynamicSizeGuideModal {label, description}-objecten verwacht. De uitleg
--     rendeerde daardoor leeg.
--  2. Er was nog geen Engelse maattabel (`size_guide_content_en`), dus de
--     Engelse site kreeg de Nederlandse kolomnamen.
--  3. De pasvormregel staat nu bovenaan in de maatgids, via het nieuwe veld
--     `fit_note`. Dat is de vraag waarmee iemand die gids opent.

UPDATE products SET
  description = '**MOSE Tee. Jouw nieuwe everyday essential.**

Een goed T-shirt begint bij de stof. Voor de MOSE Tee gebruiken we stevige jersey van 240 gram per vierkante meter. Hij voelt zacht aan, valt mooi en houdt zijn vorm, was na was.

Dankzij de regular fit sluit het shirt netjes aan zonder te knellen. Een geribde hals en verstevigde naden maken de afwerking compleet.

De stof heeft een OEKO-Tex-certificaat. De Tee wordt gemaakt in Groningen; ons lokale atelier werkt ieder exemplaar met de hand af.

**Minimalistisch in ontwerp. Met aandacht gemaakt. Klaar voor iedere dag.**', description_en = '**MOSE Tee. The everyday essential, done properly.**

A good tee starts with its fabric. We use substantial 240 gsm jersey that feels soft, drapes neatly and keeps its shape, wash after wash.

The regular fit sits comfortably without feeling restrictive. A ribbed neck and reinforced seams give it a clean finish.

The fabric carries an OEKO-Tex certificate. Production takes place in Groningen, with the final finishing done by hand at our local atelier.

**Nothing unnecessary in the design. Just a well-considered T-shirt you''ll want to wear again tomorrow.**',
  meta_title = 'MOSE Tee | T-shirt van 240 g/m² jersey', meta_description = 'De MOSE Tee is gemaakt van stevige jersey van 240 g/m². Regular fit, geribde hals en verstevigde naden. Gemaakt in Groningen.',
  meta_title_en = 'MOSE Tee | 240 GSM Jersey T-Shirt', meta_description_en = 'Discover the MOSE Tee: substantial 240 gsm jersey, a regular fit, ribbed neckline and reinforced seams. Made in Groningen.',
  updated_at = NOW()
WHERE slug = 'mose-tee';

UPDATE products SET
  description = '**MOSE Classic Sweater. Comfort dat je voelt.**

Sommige sweaters hebben weinig nodig om goed te zijn. De Classic Sweater is gemaakt van katoenen joggingfleece van 300 gram per vierkante meter. De stevige stof heeft een zachte binnenkant en een OEKO-Tex-certificaat.

De regular fit biedt ruimte om te bewegen, terwijl de geribde manchetten en zoom zorgen voor een verzorgde afwerking. Geen onnodige details, wel aandacht voor wat telt.

We maken de sweater in Groningen, bij ons lokale atelier.

**Zacht vanbinnen. Sterk in eenvoud. Een sweater waar je graag naar teruggrijpt.**', description_en = '**MOSE Classic Sweater. Comfort, with nothing to prove.**

Made from 300 gsm cotton sweatshirt fleece, the Classic Sweater has a substantial feel and a soft inside. Its fabric carries an OEKO-Tex certificate.

The regular fit gives you room to move, while ribbed cuffs and hem keep the finish clean and simple.

We produce the sweater at our atelier in Groningen, where the finishing is done by hand.

**The kind of comfort you notice the moment you put it on. The kind of design that doesn''t ask for attention.**',
  meta_title = 'MOSE Classic Sweater | Katoenen sweater van 300 g/m²', meta_description = 'Katoenen joggingfleece van 300 g/m², een zachte binnenkant en regular fit. Ontdek de MOSE Classic Sweater, gemaakt in Groningen.',
  meta_title_en = 'MOSE Classic Sweater | 300 GSM Cotton Sweatshirt', meta_description_en = 'The MOSE Classic Sweater uses 300 gsm cotton sweatshirt fleece, with a soft interior, regular fit and ribbed cuffs. Made in Groningen.',
  updated_at = NOW()
WHERE slug = 'mose-classic-sweater';

UPDATE products SET
  description = '**MOSE Essential Hoodie. Comfort voor iedere dag.**

Een hoodie moet goed zitten en prettig aanvoelen. De Essential Hoodie is gemaakt van katoenen joggingfleece van 300 gram per vierkante meter. De stof voelt stevig aan, met een zachte binnenkant en een OEKO-Tex-certificaat.

De regular fit geeft je ruimte om te bewegen. De capuchon en buikzak maken het ontwerp compleet, terwijl geribde manchetten en zoom zorgen voor een nette afwerking.

In Groningen maken we de hoodie bij ons lokale atelier, waar de afwerking met de hand gebeurt.

**Ontspannen in pasvorm. Verzorgd in uitstraling. Zonder gedoe.**', description_en = '**MOSE Essential Hoodie. Comfort you can count on.**

The Essential Hoodie is made from 300 gsm cotton sweatshirt fleece with a soft interior and an OEKO-Tex certificate. It''s substantial without needing to make a statement.

A regular fit keeps things comfortable, with a hood, a front pouch pocket and ribbed cuffs and hem.

The hoodie comes from our workshop in Groningen, where each one is finished by hand.

**Easy to wear, considered in the details. No extra noise, just the things a good hoodie should have.**',
  meta_title = 'MOSE Essential Hoodie | Hoodie van katoenfleece', meta_description = 'De MOSE Essential Hoodie heeft katoenen joggingfleece van 300 g/m², een zachte binnenkant, capuchon en buikzak. Gemaakt in Groningen.',
  meta_title_en = 'MOSE Essential Hoodie | 300 GSM Cotton Hoodie', meta_description_en = 'The MOSE Essential Hoodie features 300 gsm cotton sweatshirt fleece, a soft interior, regular fit, hood and front pouch pocket. Made in Groningen.',
  updated_at = NOW()
WHERE slug = 'mose-essential-hoodie';

UPDATE products SET
  description = '**MOSE Automatisch Horloge. Mechaniek met karakter.**

Geen batterij, maar een Japans automatisch uurwerk dat draait op de beweging van je pols. De kast van 40 mm is gemaakt van 316L roestvrij staal en afgewerkt met een matte coating. Krasbestendig saffierglas beschermt de wijzerplaat.

De verstelbare stalen schakelband laat zich afstellen op jouw pols. Het horloge weegt ongeveer 120 gram en is waterdicht tot 5 ATM.

Ieder exemplaar controleren we handmatig voor verzending. Je krijgt twee jaar fabrieksgarantie; een onderhoudsbeurt adviseren we elke drie tot vijf jaar.

**Tijd zonder omwegen.**', description_en = '**MOSE Automatic Watch. Time, without the battery.**

At its centre is a Japanese automatic movement, powered by the motion of your wrist. A 40 mm case in 316L stainless steel has a matte coating, with scratch-resistant sapphire crystal above the dial.

The adjustable steel link bracelet completes the design. It weighs around 120 grams and is water-resistant to 5 ATM.

Every watch is checked by hand before shipping and comes with a two-year manufacturer''s warranty. We recommend servicing every three to five years.

**Mechanical where it matters. Uncomplicated everywhere else.**',
  meta_title = 'MOSE Automatisch Horloge | Japans uurwerk, 40 mm', meta_description = 'MOSE Automatisch Horloge met Japans uurwerk, saffierglas, 40 mm kast van 316L staal en verstelbare schakelband. Zonder batterij.',
  meta_title_en = 'MOSE Automatic Watch | Japanese Movement, 40 mm', meta_description_en = 'MOSE Automatic Watch with a Japanese movement, sapphire crystal, 40 mm case in 316L steel and an adjustable link bracelet. No battery.',
  updated_at = NOW()
WHERE slug = 'mose-automatisch-horloge';

UPDATE categories SET
  default_product_details = '**Stof:** Stevige jersey, 240 g/m²
**Fit:** Regular fit zonder knellen
**Certificaat:** Stof met OEKO-Tex-certificaat
**Afwerking:** Geribde hals, verstevigde naden
**Kwaliteit:** Houdt vorm na wassen',
  default_product_details_en = '**Fabric:** Substantial 240 gsm jersey
**Fit:** Regular fit without restriction
**Certificate:** Fabric with OEKO-Tex certificate
**Finish:** Ribbed neck, reinforced seams
**Quality:** Holds shape after washing',
  size_guide_content = '{"type": "table", "columns": ["Maat", "Borst plat (cm)", "Lengte (cm)", "Schouder (cm)", "Mouwlengte (cm)"], "rows": [["M", "54", "71", "46", "21"], ["L", "57", "73", "48", "22"], ["XL", "60", "75", "50", "23"]], "how_to_measure": [{"label": "Borst plat", "description": "leg het kledingstuk plat en meet van naad tot naad, net onder de mouw"}, {"label": "Lengte", "description": "van het hoogste punt van de schouder recht naar beneden tot de zoom"}, {"label": "Schouder", "description": "van schoudernaad tot schoudernaad, over de rug gemeten"}, {"label": "Mouwlengte", "description": "van de schoudernaad tot het uiteinde van de mouw"}, {"label": "Tip", "description": "leg een kledingstuk dat je graag draagt ernaast en vergelijk de borstmaat"}], "fit_note": "De Tee valt normaal in een regular fit; kies je gebruikelijke maat in M, L of XL, of de grotere als je tussen twee maten zit en een relaxter silhouet wilt."}'::jsonb,
  size_guide_content_en = '{"type": "table", "columns": ["Size", "Chest flat (cm)", "Length (cm)", "Shoulder (cm)", "Sleeve (cm)"], "rows": [["M", "54", "71", "46", "21"], ["L", "57", "73", "48", "22"], ["XL", "60", "75", "50", "23"]], "how_to_measure": [{"label": "Chest, flat", "description": "lay the garment flat and measure seam to seam, just below the sleeve"}, {"label": "Length", "description": "from the highest point of the shoulder straight down to the hem"}, {"label": "Shoulder", "description": "from shoulder seam to shoulder seam, measured across the back"}, {"label": "Sleeve length", "description": "from the shoulder seam to the end of the sleeve"}, {"label": "Tip", "description": "lay a garment you already like next to it and compare the chest measurement"}], "fit_note": "The tee has a true-to-size regular fit; choose your usual size in M, L or XL, or size up if you''re between sizes and prefer a more relaxed silhouette."}'::jsonb,
  updated_at = NOW()
WHERE slug = 't-shirts';

UPDATE categories SET
  default_product_details = '**Stof:** Katoenen joggingfleece, 300 g/m²
**Binnenkant:** Zachte binnenkant
**Fit:** Regular fit met bewegingsruimte
**Afwerking:** Geribde manchetten en zoom
**Herkomst:** Gemaakt in Groningen',
  default_product_details_en = '**Fabric:** 300 gsm cotton sweatshirt fleece
**Interior:** Soft on the inside
**Fit:** Regular fit, easy movement
**Finish:** Ribbed cuffs and hem
**Origin:** Made in Groningen',
  size_guide_content = '{"type": "table", "columns": ["Maat", "Borst plat (cm)", "Lengte (cm)", "Schouder (cm)", "Mouwlengte (cm)"], "rows": [["M", "57", "68", "50", "62"], ["L", "60", "70", "52", "64"], ["XL", "63", "72", "54", "66"]], "how_to_measure": [{"label": "Borst plat", "description": "leg het kledingstuk plat en meet van naad tot naad, net onder de mouw"}, {"label": "Lengte", "description": "van het hoogste punt van de schouder recht naar beneden tot de zoom"}, {"label": "Schouder", "description": "van schoudernaad tot schoudernaad, over de rug gemeten"}, {"label": "Mouwlengte", "description": "van de schoudernaad tot het uiteinde van de mouw"}, {"label": "Tip", "description": "leg een kledingstuk dat je graag draagt ernaast en vergelijk de borstmaat"}], "fit_note": "Neem je normale maat voor de regular fit van de Classic Sweater, of een maat groter als je tussen twee maten zit en wat meer ruimte wilt; verkrijgbaar in M, L en XL."}'::jsonb,
  size_guide_content_en = '{"type": "table", "columns": ["Size", "Chest flat (cm)", "Length (cm)", "Shoulder (cm)", "Sleeve (cm)"], "rows": [["M", "57", "68", "50", "62"], ["L", "60", "70", "52", "64"], ["XL", "63", "72", "54", "66"]], "how_to_measure": [{"label": "Chest, flat", "description": "lay the garment flat and measure seam to seam, just below the sleeve"}, {"label": "Length", "description": "from the highest point of the shoulder straight down to the hem"}, {"label": "Shoulder", "description": "from shoulder seam to shoulder seam, measured across the back"}, {"label": "Sleeve length", "description": "from the shoulder seam to the end of the sleeve"}, {"label": "Tip", "description": "lay a garment you already like next to it and compare the chest measurement"}], "fit_note": "Choose your usual M, L or XL for a true-to-size regular fit, or go up a size when you''re between sizes and want a more relaxed silhouette."}'::jsonb,
  updated_at = NOW()
WHERE slug = 'sweaters';

UPDATE categories SET
  default_product_details = '**Stof:** Joggingfleece van katoen, 300 g/m²
**Binnenkant:** Zacht aan de binnenkant
**Ontwerp:** Capuchon en buikzak
**Fit:** Regular fit met bewegingsruimte
**Afwerking:** Geribde manchetten en zoom',
  default_product_details_en = '**Fabric:** Substantial cotton fleece, 300 gsm
**Interior:** Soft interior
**Design:** Hood and front pouch pocket
**Fit:** Regular fit for movement
**Finish:** Ribbing at cuffs and hem',
  size_guide_content = '{"type": "table", "columns": ["Maat", "Borst plat (cm)", "Lengte (cm)", "Schouder (cm)", "Mouwlengte (cm)"], "rows": [["M", "58", "69", "51", "62"], ["L", "61", "71", "53", "64"], ["XL", "64", "73", "55", "66"]], "how_to_measure": [{"label": "Borst plat", "description": "leg het kledingstuk plat en meet van naad tot naad, net onder de mouw"}, {"label": "Lengte", "description": "van het hoogste punt van de schouder recht naar beneden tot de zoom"}, {"label": "Schouder", "description": "van schoudernaad tot schoudernaad, over de rug gemeten"}, {"label": "Mouwlengte", "description": "van de schoudernaad tot het uiteinde van de mouw"}, {"label": "Tip", "description": "leg een kledingstuk dat je graag draagt ernaast en vergelijk de borstmaat"}], "fit_note": "Voor de regular fit kun je je gebruikelijke maat kiezen in M, L of XL; zit je tussen twee maten in, dan geeft de grotere een relaxter silhouet."}'::jsonb,
  size_guide_content_en = '{"type": "table", "columns": ["Size", "Chest flat (cm)", "Length (cm)", "Shoulder (cm)", "Sleeve (cm)"], "rows": [["M", "58", "69", "51", "62"], ["L", "61", "71", "53", "64"], ["XL", "64", "73", "55", "66"]], "how_to_measure": [{"label": "Chest, flat", "description": "lay the garment flat and measure seam to seam, just below the sleeve"}, {"label": "Length", "description": "from the highest point of the shoulder straight down to the hem"}, {"label": "Shoulder", "description": "from shoulder seam to shoulder seam, measured across the back"}, {"label": "Sleeve length", "description": "from the shoulder seam to the end of the sleeve"}, {"label": "Tip", "description": "lay a garment you already like next to it and compare the chest measurement"}], "fit_note": "The hoodie fits true to size with a regular fit in M, L and XL; if you''re between sizes, take the larger one for a more relaxed silhouette."}'::jsonb,
  updated_at = NOW()
WHERE slug = 'hoodies';

UPDATE categories SET
  default_product_details = '**Uurwerk:** Japans automatisch uurwerk
**Kast:** 316L staal, kast 40 mm
**Glas:** Krasbestendig saffierglas
**Band:** Verstelbare stalen schakelband
**Waterdicht:** Waterdicht tot 5 ATM',
  default_product_details_en = '**Movement:** Japanese automatic movement
**Case:** 40 mm 316L steel case
**Crystal:** Scratch-resistant sapphire crystal
**Bracelet:** Adjustable steel link bracelet
**Water resistance:** Water-resistant to 5 ATM',
  updated_at = NOW()
WHERE slug = 'horloges';
