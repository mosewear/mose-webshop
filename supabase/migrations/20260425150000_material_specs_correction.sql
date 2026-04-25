-- Correct fabric / material / fit specifications across the database.
--
-- Authoritative MOSE specs (source: founder, 2026-04-25):
--   * Tees     -> 240 GSM OEKO-Tex jersey, regular fit
--   * Sweaters -> 300 GSM OEKO-Tex jogging fleece cotton, regular fit
--   * Hoodies  -> 300 GSM OEKO-Tex jogging fleece cotton, regular fit
--
-- This migration is idempotent and only rewrites strings that match the
-- known incorrect seed values, so re-running is safe.

-- ----------------------------------------------------------------------
-- 1. T-shirts category defaults (currently claim 95% cotton / 5% polyester)
-- ----------------------------------------------------------------------
UPDATE categories
SET default_materials_care = '**Materiaal:** 240 GSM OEKO-Tex jersey
**Fit:** Regular fit
**Was instructies:** Machinewasbaar op 30°C, binnenstebuiten
**Strijken:** Op lage temperatuur indien nodig, binnenstebuiten
**Drogen:** Niet in de droger, ophangen aan de lijn
**Bleekmiddel:** Niet bleken
**Tip:** Was met vergelijkbare kleuren voor het beste resultaat',
    default_materials_care_en = '**Material:** 240 GSM OEKO-Tex jersey
**Fit:** Regular fit
**Washing instructions:** Machine washable at 30°C, inside out
**Ironing:** Low temperature if needed, inside out
**Drying:** Do not tumble dry, hang to dry
**Bleach:** Do not bleach
**Tip:** Wash with similar colors for best results',
    default_product_details = '**Materiaal:** 240 GSM OEKO-Tex jersey
**Fit:** Regular fit - sluit netjes aan zonder te knellen
**Constructie:** Ribbed hals, verstevigde naden voor duurzaamheid
**Kwaliteit:** Premium jersey die zijn vorm vasthoudt, was na was
**Afwerking:** Zorgvuldig lokaal geproduceerd in Groningen',
    default_product_details_en = '**Material:** 240 GSM OEKO-Tex jersey
**Fit:** Regular fit - sits well without pressure
**Construction:** Ribbed collar, reinforced seams for durability
**Quality:** Premium jersey that holds its shape, wash after wash
**Finishing:** Carefully produced locally in Groningen'
WHERE slug = 't-shirts';

-- ----------------------------------------------------------------------
-- 2. Lookbook chapter meta (was seeded with fabricated specs)
-- ----------------------------------------------------------------------
-- Chapter 01 - hoodie chapter (sort_order = 10)
UPDATE lookbook_chapters
SET meta = '[
  {"label_nl":"MATERIAAL","label_en":"MATERIAL","value_nl":"300 GSM OEKO-Tex joggingfleece katoen","value_en":"300 GSM OEKO-Tex jogging fleece cotton"},
  {"label_nl":"PASVORM","label_en":"FIT","value_nl":"Regular fit","value_en":"Regular fit"},
  {"label_nl":"GEMAAKT IN","label_en":"MADE IN","value_nl":"Groningen, NL","value_en":"Groningen, NL"}
]'::jsonb
WHERE sort_order = 10
  AND meta::text ILIKE '%420%';

-- Chapter 02 - tee chapter (sort_order = 20)
UPDATE lookbook_chapters
SET meta = '[
  {"label_nl":"MATERIAAL","label_en":"MATERIAL","value_nl":"240 GSM OEKO-Tex jersey","value_en":"240 GSM OEKO-Tex jersey"},
  {"label_nl":"PASVORM","label_en":"FIT","value_nl":"Regular fit","value_en":"Regular fit"},
  {"label_nl":"GEMAAKT IN","label_en":"MADE IN","value_nl":"Groningen, NL","value_en":"Groningen, NL"}
]'::jsonb
WHERE sort_order = 20
  AND meta::text ILIKE '%peached%';

-- Chapter 03 - sweater chapter (sort_order = 30)
UPDATE lookbook_chapters
SET meta = '[
  {"label_nl":"MATERIAAL","label_en":"MATERIAL","value_nl":"300 GSM OEKO-Tex joggingfleece katoen","value_en":"300 GSM OEKO-Tex jogging fleece cotton"},
  {"label_nl":"PASVORM","label_en":"FIT","value_nl":"Regular fit","value_en":"Regular fit"},
  {"label_nl":"GEMAAKT IN","label_en":"MADE IN","value_nl":"Groningen, NL","value_en":"Groningen, NL"}
]'::jsonb
WHERE sort_order = 30
  AND meta::text ILIKE '%brushed fleece%';

-- ----------------------------------------------------------------------
-- 3. MOSE Tee product description: drop the polyester claim
-- ----------------------------------------------------------------------
UPDATE products
SET description = 'Dit t-shirt trek je aan en het zit direct goed. De stof voelt stevig maar soepel. Het shirt blijft in model en ziet er ook na veel wassen netjes uit. Geen krimp, geen slappe pasvorm. Gewoon een shirt dat je blijft dragen.

De stof is 240 GSM OEKO-Tex jersey. Een stevige, ademende kwaliteit die comfortabel draagt en zijn vorm goed vasthoudt. Veilig getest, duurzaam gemaakt.

De pasvorm laat je bovenlichaam goed uitkomen. Rond schouders en borst sluit het shirt netjes aan zonder te knellen. Je ziet er direct fit en verzorgd uit.

**Wat je krijgt:**

**240 GSM OEKO-Tex jersey**
Stevige, ademende stof die niet inzakt en mooi blijft na vaak wassen

**Regular fit**
Sluit goed aan zonder te knellen of te trekken

**Ribbed hals**
Blijft strak, geen uitgerekte kraag

**Kleuren:**
* Zwart
* Wit
* Beige
* Groen'
WHERE slug = 'mose-tee'
  AND description ILIKE '%polyester%';

UPDATE products
SET description_en = 'You put this t-shirt on and it feels right straight away. The fabric feels solid but smooth. The shirt keeps its shape and still looks clean after many washes. No shrinking, no loose fit. Just a shirt you keep wearing.

The fabric is 240 GSM OEKO-Tex jersey. A solid, breathable quality that wears comfortably and holds its shape. Safely tested, built to last.

The fit is designed to show your upper body well. Around the shoulders and chest it sits close without squeezing. You look put together without extra effort.

**What you get:**

**240 GSM OEKO-Tex jersey**
Solid, breathable fabric that does not sag and stays sharp after frequent washing

**Regular fit**
Sits well in the right places without pressure

**Ribbed collar**
Keeps its shape, no stretched neckline

**Colors:**
* Black
* White
* Beige
* Green'
WHERE slug = 'mose-tee'
  AND description_en ILIKE '%polyester%';

-- ----------------------------------------------------------------------
-- 4. MOSE Essential Hoodie - merge the split bullets into one unified spec
-- ----------------------------------------------------------------------
UPDATE products
SET description = REPLACE(
  description,
  '**300 GSM joggingfleece**
Dikke, stevige stof die warm blijft (zonder te warm te worden) en zijn vorm houdt

**OEKO-Tex katoen**
Comfortabele stof die veilig getest is en perfect draagt',
  '**300 GSM OEKO-Tex joggingfleece katoen**
Dikke, stevige stof die warm blijft (zonder te warm te worden), zijn vorm houdt en veilig getest is voor comfortabel dragen'
)
WHERE slug = 'mose-essential-hoodie'
  AND description LIKE '%300 GSM joggingfleece%OEKO-Tex katoen%';
