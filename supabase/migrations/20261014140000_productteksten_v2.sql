-- Productteksten opnieuw geschreven.
--
-- Wat er mis was met de vorige versie, en dat was mijn fout: ik had de
-- onderzoeksbevinding "elk product moet zijn eigen kernverschil tonen"
-- toegepast op de OPENINGSZIN. De hoodie begon met "Dezelfde joggingfleece van
-- 300 GSM als de Classic Sweater, nu met capuchon. Dat is het enige verschil,
-- en het is waar die vijf euro heen gaat."
--
-- Iemand die uit een advertentie op de hoodiepagina landt, heeft de sweater
-- nooit gezien en weet niet wat die kost. Voor hem is dat geen onderscheidend
-- feit maar een zin die nergens op slaat. Een vergelijking hoort niet vooraan
-- en zeker niet als haakje; van de elf onderzochte productpagina's opent er
-- geen enkele met een verwijzing naar een ander product.
--
-- Elke tekst staat nu op zichzelf: wat is het, hoe voelt het, hoe zit het,
-- waar komt het vandaan. Geen productvergelijkingen, geen prijsverschillen,
-- geen kleuren (die staan in de kleurkiezer en verouderen).

UPDATE products SET
  description = 'Een T-shirt van 240 grams jersey. Dikker dan het gemiddelde shirt, waardoor het valt in plaats van om je lijf te plakken.

De hals is geribd en de naden zijn verstevigd, zodat de vorm blijft zoals hij was. Ook na een stapel wasbeurten.

Regular fit: sluit netjes aan zonder te knellen. Kies gewoon je gebruikelijke maat.

OEKO-Tex gecertificeerd katoen, met de hand afgewerkt in ons atelier in Groningen.',
  description_en = 'A T-shirt in 240 gsm jersey. Thicker than the average tee, so it hangs instead of clinging to you.

The collar is ribbed and the seams are reinforced, which keeps the shape where it started. Through a long stack of washes.

Regular fit: close without squeezing. Take the size you normally wear.

OEKO-Tex certified cotton, finished by hand in our studio in Groningen.',
  meta_title = 'MOSE Tee | zwaar 240 grams jersey uit Groningen',
  meta_description = 'T-shirt van 240 grams jersey dat valt in plaats van plakt. Geribde hals, verstevigde naden, regular fit. Met de hand afgewerkt in Groningen.',
  updated_at = NOW()
WHERE slug = 'mose-tee';

UPDATE products SET
  description = 'Een sweater van 300 grams joggingfleece. Zwaar katoen met een nette afwerking, dus hij staat op zichzelf en kan net zo goed onder een jas.

Van binnen zacht, van buiten glad en egaal. De mouwen en de zoom zijn afgewerkt met geribde boorden die hun vorm houden.

Regular fit, met genoeg bewegingsruimte. Kies gewoon je gebruikelijke maat.

OEKO-Tex gecertificeerd katoen, met de hand afgewerkt in ons atelier in Groningen.',
  description_en = 'A sweater in 300 gsm sweat fleece. Heavy cotton with a clean finish, so it stands on its own and works just as well under a jacket.

Soft on the inside, smooth and even on the outside. The cuffs and hem are finished with ribbing that holds its shape.

Regular fit, with room to move. Take the size you normally wear.

OEKO-Tex certified cotton, finished by hand in our studio in Groningen.',
  meta_title = 'MOSE Classic Sweater | 300 grams fleece uit Groningen',
  meta_description = 'Sweater van 300 grams joggingfleece. Zwaar katoen, zacht van binnen, geribde boorden en een regular fit. Met de hand afgewerkt in Groningen.',
  updated_at = NOW()
WHERE slug = 'mose-classic-sweater';

UPDATE products SET
  description = 'Een hoodie van 300 grams joggingfleece. Je voelt het gewicht zodra je hem optilt, en dat is precies waarom hij zijn model houdt.

Dit is het stuk dat je pakt als je de deur uitgaat en er niet over wilt nadenken. Capuchon op als het tegenzit, handen in de zak.

Van binnen zacht, van buiten glad. Geribde boorden aan de mouwen en de zoom. Regular fit, met ruimte voor een shirt eronder.

OEKO-Tex gecertificeerd katoen, met de hand afgewerkt in ons atelier in Groningen.',
  description_en = 'A hoodie in 300 gsm sweat fleece. You feel the weight the moment you pick it up, and that weight is why it keeps its shape.

This is the one you grab on the way out without thinking about it. Hood up when the weather turns, hands in the pocket.

Soft inside, smooth outside. Ribbed cuffs and hem. Regular fit, with room for a shirt underneath.

OEKO-Tex certified cotton, finished by hand in our studio in Groningen.',
  meta_title = 'MOSE Essential Hoodie | 300 grams fleece met capuchon',
  meta_description = 'Hoodie van 300 grams joggingfleece. Zwaar katoen dat zijn model houdt, zacht van binnen, geribde boorden. Met de hand afgewerkt in Groningen.',
  updated_at = NOW()
WHERE slug = 'mose-essential-hoodie';

UPDATE products SET
  description = 'Een automatisch horloge, dus zonder batterij. De beweging van je pols houdt het uurwerk lopend.

De kast meet 40 millimeter en is van 316L staal met een matte afwerking. Het glas is saffier en krast niet snel. Waterdicht tot 5 ATM, dus handen wassen en een regenbui kunnen geen kwaad.

Met zo''n 120 gram merk je dat je iets omhebt. De stalen schakelband stel je af op je eigen pols.

Elk horloge wordt met de hand gecontroleerd voor verzending. Twee jaar fabrieksgarantie, en laat hem elke drie tot vijf jaar nakijken.',
  description_en = 'An automatic watch, so no battery. The movement of your wrist keeps it running.

The case measures 40 millimetres, in 316L steel with a matte finish. The crystal is sapphire and resists scratches. Water resistant to 5 ATM, so washing your hands or walking through rain is fine.

At around 120 grams you notice it on your wrist. The steel link bracelet adjusts to your size.

Every watch is checked by hand before it ships. Two-year manufacturer warranty, and have it serviced every three to five years.',
  meta_title = 'MOSE Automatisch Horloge | 40 mm, saffierglas',
  meta_description = 'Automatisch horloge zonder batterij. 40 mm kast van 316L staal, saffierglas, waterdicht tot 5 ATM. Twee jaar fabrieksgarantie.',
  updated_at = NOW()
WHERE slug = 'mose-automatisch-horloge';
