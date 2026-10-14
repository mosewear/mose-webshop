-- Producttekst voor de MOSE Tee, aangeleverd door Rick.
--
-- Letterlijk overgenomen zoals hij hem gaf, inclusief de ** voor vetgedrukt
-- in de Engelse versie. Die worden door formatBoldText in ProductPageClient
-- omgezet naar <strong>.
--
-- De Nederlandse versie die hij aanleverde heeft GEEN ** op de openings- en
-- slotregel, de Engelse wel. Bewust niet zelf toegevoegd: dat is zijn keuze,
-- niet de mijne. Staat als vraag bij hem uit.
UPDATE products SET
  description = 'MOSE Tee. Jouw nieuwe everyday essential.

Een goed T-shirt begint bij de juiste kwaliteit. De MOSE Tee is gemaakt van stevige 240 GSM jersey. Een premium stof die zacht aanvoelt, mooi valt en zijn vorm behoudt.

De regular fit zorgt voor een comfortabele pasvorm die netjes aansluit, zonder strak te zitten. De geribde hals en verstevigde naden zorgen voor een verzorgde afwerking die lang mooi blijft, ook na veelvuldig wassen.

De stof is OEKO-TEX gecertificeerd en het T-shirt wordt gemaakt in Groningen.

Minimalistisch in design. Sterk in kwaliteit. Gemaakt om keer op keer te dragen.',
  description_en = '**MOSE Tee. Your new everyday essential.**

A great T-shirt starts with quality. The MOSE Tee is crafted from heavyweight 240 GSM jersey. A premium fabric that feels soft, drapes naturally, and holds its shape.

The regular fit offers a comfortable silhouette that follows the body without feeling restrictive. A ribbed neckline and reinforced seams provide a clean, durable finish that stays looking great, wash after wash.

The fabric is OEKO-TEX certified, and every T-shirt is made in Groningen, the Netherlands.

**Minimal in design. Premium in quality. Made to be worn on repeat.**',
  updated_at = NOW()
WHERE slug = 'mose-tee';
