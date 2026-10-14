-- Definitieve productteksten, aangeleverd door Rick.
--
-- Letterlijk overgenomen in beide talen, inclusief de ** voor vetgedrukt op de
-- openings- en slotregel. formatBoldText in ProductPageClient zet die om naar
-- <strong>.

UPDATE products SET
  description = '**MOSE Tee. Jouw nieuwe everyday essential.**

Een goed T-shirt begint bij de stof. Voor de MOSE Tee gebruiken we stevige jersey van 240 gram per vierkante meter. Hij voelt zacht aan, valt mooi en houdt zijn vorm, was na was.

Dankzij de regular fit sluit het shirt netjes aan zonder te knellen. Een geribde hals en verstevigde naden maken de afwerking compleet.

De stof heeft een OEKO-Tex-certificaat. De Tee wordt gemaakt in Groningen; ons lokale atelier werkt ieder exemplaar met de hand af.

**Minimalistisch in ontwerp. Met aandacht gemaakt. Klaar voor iedere dag.**',
  description_en = '**MOSE Tee. The everyday essential, done properly.**

A good tee starts with its fabric. We use substantial 240 gsm jersey that feels soft, drapes neatly and keeps its shape, wash after wash.

The regular fit sits comfortably without feeling restrictive. A ribbed neck and reinforced seams give it a clean finish.

The fabric carries an OEKO-Tex certificate. Production takes place in Groningen, with the final finishing done by hand at our local atelier.

**Nothing unnecessary in the design. Just a well-considered T-shirt you''ll want to wear again tomorrow.**',
  updated_at = NOW()
WHERE slug = 'mose-tee';

UPDATE products SET
  description = '**MOSE Classic Sweater. Comfort dat je voelt.**

Sommige sweaters hebben weinig nodig om goed te zijn. De Classic Sweater is gemaakt van katoenen joggingfleece van 300 gram per vierkante meter. De stevige stof heeft een zachte binnenkant en een OEKO-Tex-certificaat.

De regular fit biedt ruimte om te bewegen, terwijl de geribde manchetten en zoom zorgen voor een verzorgde afwerking. Geen onnodige details, wel aandacht voor wat telt.

We maken de sweater in Groningen, bij ons lokale atelier.

**Zacht vanbinnen. Sterk in eenvoud. Een sweater waar je graag naar teruggrijpt.**',
  description_en = '**MOSE Classic Sweater. Comfort, with nothing to prove.**

Made from 300 gsm cotton sweatshirt fleece, the Classic Sweater has a substantial feel and a soft inside. Its fabric carries an OEKO-Tex certificate.

The regular fit gives you room to move, while ribbed cuffs and hem keep the finish clean and simple.

We produce the sweater at our atelier in Groningen, where the finishing is done by hand.

**The kind of comfort you notice the moment you put it on. The kind of design that doesn''t ask for attention.**',
  updated_at = NOW()
WHERE slug = 'mose-classic-sweater';

UPDATE products SET
  description = '**MOSE Essential Hoodie. Comfort voor iedere dag.**

Een hoodie moet goed zitten en prettig aanvoelen. De Essential Hoodie is gemaakt van katoenen joggingfleece van 300 gram per vierkante meter. De stof voelt stevig aan, met een zachte binnenkant en een OEKO-Tex-certificaat.

De regular fit geeft je ruimte om te bewegen. De capuchon en buikzak maken het ontwerp compleet, terwijl geribde manchetten en zoom zorgen voor een nette afwerking.

In Groningen maken we de hoodie bij ons lokale atelier, waar de afwerking met de hand gebeurt.

**Ontspannen in pasvorm. Verzorgd in uitstraling. Zonder gedoe.**',
  description_en = '**MOSE Essential Hoodie. Comfort you can count on.**

The Essential Hoodie is made from 300 gsm cotton sweatshirt fleece with a soft interior and an OEKO-Tex certificate. It''s substantial without needing to make a statement.

A regular fit keeps things comfortable, with a hood, a front pouch pocket and ribbed cuffs and hem.

The hoodie comes from our workshop in Groningen, where each one is finished by hand.

**Easy to wear, considered in the details. No extra noise, just the things a good hoodie should have.**',
  updated_at = NOW()
WHERE slug = 'mose-essential-hoodie';

UPDATE products SET
  description = '**MOSE Automatisch Horloge. Mechaniek met karakter.**

Geen batterij, maar een Japans automatisch uurwerk dat draait op de beweging van je pols. De kast van 40 mm is gemaakt van 316L roestvrij staal en afgewerkt met een matte coating. Krasbestendig saffierglas beschermt de wijzerplaat.

De verstelbare stalen schakelband laat zich afstellen op jouw pols. Het horloge weegt ongeveer 120 gram en is waterdicht tot 5 ATM.

Ieder exemplaar controleren we handmatig voor verzending. Je krijgt twee jaar fabrieksgarantie; een onderhoudsbeurt adviseren we elke drie tot vijf jaar.

**Tijd zonder omwegen.**',
  description_en = '**MOSE Automatic Watch. Time, without the battery.**

At its centre is a Japanese automatic movement, powered by the motion of your wrist. A 40 mm case in 316L stainless steel has a matte coating, with scratch-resistant sapphire crystal above the dial.

The adjustable steel link bracelet completes the design. It weighs around 120 grams and is water-resistant to 5 ATM.

Every watch is checked by hand before shipping and comes with a two-year manufacturer''s warranty. We recommend servicing every three to five years.

**Mechanical where it matters. Uncomplicated everywhere else.**',
  updated_at = NOW()
WHERE slug = 'mose-automatisch-horloge';
