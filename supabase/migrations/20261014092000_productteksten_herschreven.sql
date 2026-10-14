-- Alle productteksten herschreven.
--
-- Wat er stond: drie kledingteksten die één sjabloon waren met andere
-- zelfstandige naamwoorden. De openingszinnen van de sweater en de hoodie waren
-- voor 92% identiek, de slotzinnen voor 85 tot 91%. "Wat je krijgt:" en
-- "Strakke, tijdloze pasvorm" stonden letterlijk in alle drie. Ze openden met
-- een retorische vraag die de lezer verweet wat hij tot nu toe kocht, en ze
-- noemden Groningen nergens.
--
-- Onderzoek naar elf echt opgehaalde productpagina's (Asket, Norse Projects,
-- Les Deux, Carhartt WIP NL, Pockies NL, OLAF, Colorful Standard, Suitsupply,
-- Blue LOOP): geen van de elf opent met een retorische vraag, negen openen met
-- stof, gewicht of pasvorm. Herkomst staat er altijd als feit op één regel,
-- nooit als alinea.
--
-- Nederlands geschreven door een copywriter voor herenmode, Engels door een
-- Engelse copywriter met de Nederlandse tekst als bron, zodat de twee talen
-- elkaar niet meer tegenspreken. Dat deden ze wel: de Nederlandse sweater zei
-- "strakke pasvorm", de Engelse "Regular fit, plenty of room to move".
--
-- Geen kleuren meer in de tekst: die staan in de kleurkiezer ernaast en
-- verouderen zodra er een kleur bij komt of uitverkoopt.

UPDATE products SET
  description = 'Zwaar jersey van 240 GSM, OEKO-Tex gecertificeerd. Het shirt houdt zijn model, was na was.

De regular fit sluit netjes aan zonder te knellen. De hals is geribd, de naden zijn verstevigd. Je draagt hem los of onder een sweater.

Gemaakt in Groningen, in één atelier waar elk stuk met de hand wordt afgewerkt. Geen sweatshops, geen lange transportlijnen.

Voor 17:00 besteld, dan ligt hij er meestal de volgende werkdag.',
  description_en = 'Heavy 240 GSM jersey, OEKO-Tex certified. The shirt holds its shape, wash after wash.

The regular fit sits close without pinching. The collar is ribbed and the seams are reinforced. Wear it on its own or under a sweater.

Made in Groningen, in one studio where every piece is finished by hand. No sweatshops, no long transport lines.

Order before 17:00 and it will usually be with you the next working day.',
  meta_title = 'MOSE Tee | zwaar 240 GSM jersey uit Groningen',
  meta_description = 'Zwaar jersey van 240 GSM dat zijn vorm vasthoudt, was na was. Regular fit, geribde hals, lokaal gemaakt in Groningen. 30 dagen retour, 2 jaar garantie.',
  updated_at = NOW()
WHERE slug = 'mose-tee';

UPDATE categories SET default_product_details = '**Materiaal:** 240 GSM OEKO-Tex jersey
**Fit:** Regular fit, sluit netjes aan zonder te knellen
**Constructie:** Geribde hals, verstevigde naden
**Vormvast:** Houdt zijn model, was na was
**Afwerking:** Met de hand afgewerkt in Groningen', updated_at = NOW()
WHERE slug = 't-shirts';

UPDATE products SET
  description = 'Joggingfleece van katoen, 300 GSM. Een kwart zwaarder dan onze tee, en dat voel je zodra je hem oppakt.

De binnenkant is zacht, de buitenkant blijft clean en glad. De regular fit laat genoeg bewegingsruimte. Geribde manchetten en zoom werken de mouwen en de onderkant af.

Het katoen is OEKO-Tex gecertificeerd. Eén atelier in Groningen maakt al onze kleding, met de hand afgewerkt.

Dertig dagen bedenktijd, en vanaf 150 euro verzenden we gratis.',
  description_en = 'Cotton sweat fleece at 300 GSM. That''s a quarter heavier than our tee, and you notice it the moment you pick it up.

The inside is soft, the outside stays smooth and clean. The regular fit leaves enough room to move. Ribbed cuffs and hem finish the sleeves and the bottom edge.

The cotton is OEKO-Tex certified. One studio in Groningen makes everything we sell, finished by hand.

Thirty days to change your mind, and shipping is free over 150 euro.',
  meta_title = 'MOSE Classic Sweater | 300 GSM fleece uit Groningen',
  meta_description = 'Sweater van 300 GSM joggingfleece, zacht van binnen en clean van buiten. Regular fit, met de hand afgewerkt in Groningen. Gratis verzending vanaf 150 euro.',
  updated_at = NOW()
WHERE slug = 'mose-classic-sweater';

UPDATE categories SET default_product_details = '**Materiaal:** 300 GSM OEKO-Tex joggingfleece katoen
**Gewicht:** Een kwart zwaarder dan onze tee
**Fit:** Regular fit, genoeg bewegingsruimte
**Constructie:** Geribde manchetten en zoom
**Afwerking:** Met de hand afgewerkt in Groningen', updated_at = NOW()
WHERE slug = 'sweaters';

UPDATE products SET
  description = 'Dezelfde joggingfleece van 300 GSM als de Classic Sweater, nu met capuchon. Dat is het enige verschil, en het is waar die vijf euro heen gaat.

Het katoen is OEKO-Tex gecertificeerd, zwaar, en zacht aan de binnenkant. De regular fit laat ruimte voor een shirt eronder zonder dat het trekt. Manchetten en zoom zijn geribd.

Met de hand afgewerkt in ons atelier in Groningen.

Past hij niet, dan stuur je hem binnen dertig dagen terug voor 6,95.',
  description_en = 'The same 300 GSM sweat fleece as the Classic Sweater, now with a hood. That is the only difference, and that is where the extra five euro goes.

The cotton is OEKO-Tex certified, heavy, and soft on the inside. The regular fit leaves space for a shirt underneath without pulling. Cuffs and hem are ribbed.

Finished by hand in our own studio in Groningen.

If it doesn''t fit, send it back within thirty days for 6.95.',
  meta_title = 'MOSE Essential Hoodie | 300 GSM fleece met capuchon',
  meta_description = 'Hoodie van 300 GSM joggingfleece, dezelfde stof als onze sweater maar met capuchon. Regular fit, met de hand afgewerkt in Groningen. Twee jaar garantie.',
  updated_at = NOW()
WHERE slug = 'mose-essential-hoodie';

UPDATE categories SET default_product_details = '**Materiaal:** 300 GSM OEKO-Tex joggingfleece katoen
**Verschil met de sweater:** De capuchon
**Fit:** Regular fit, ruimte voor een shirt eronder
**Constructie:** Geribde manchetten en zoom
**Afwerking:** Met de hand afgewerkt in Groningen', updated_at = NOW()
WHERE slug = 'hoodies';

UPDATE products SET
  description = 'Japans automatisch uurwerk, geen batterij. Je polsbeweging houdt hem lopend.

De kast is 40 millimeter in doorsnee, van 316L roestvrij staal met een matte coating. Het glas is saffier en daarmee krasbestendig. Waterdicht tot 5 ATM. De schakelband is van hetzelfde staal en verstelbaar.

Met ongeveer 120 gram voel je dat je iets om hebt, zonder dat het zwaar wordt.

Elk horloge gaat voor verzending met de hand langs een controle. Twee jaar fabrieksgarantie, en laat hem elke drie tot vijf jaar nakijken.',
  description_en = 'Japanese automatic movement, so there is no battery. The motion of your wrist keeps it running.

The case measures 40 millimetres across, in 316L stainless steel with a matte coating. The crystal is sapphire, which makes it scratch resistant. Water resistant to 5 ATM. The link bracelet is the same steel and adjustable.

At roughly 120 grams you can tell you''re wearing something, without it feeling heavy.

Every watch passes a check by hand before it ships. Two-year manufacturer warranty, and have it serviced every three to five years.',
  meta_title = 'MOSE Automatisch Horloge | Japans uurwerk, saffierglas',
  meta_description = 'Japans automatisch uurwerk zonder batterij. 40 mm kast van 316L staal, saffierglas, waterdicht tot 5 ATM. Twee jaar garantie en gratis verzending.',
  updated_at = NOW()
WHERE slug = 'mose-automatisch-horloge';
