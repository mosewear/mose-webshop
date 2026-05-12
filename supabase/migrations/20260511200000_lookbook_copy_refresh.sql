-- Lookbook chapter copy refresh (May 2026): concrete, place-led NL/EN.
-- Removes legacy taglines ("GEDRAGEN, NIET GEPOSEERD", etc.).
-- Targets rows by sort_order (10, 20, 30, 40) as seeded by apply-photoshoot-content.

UPDATE lookbook_chapters
SET
  title_nl    = 'GRONINGEN, GEWOON.',
  title_en    = 'GRONINGEN. STRAIGHT UP.',
  caption_nl  = 'We fotograferen niet in een witte studio. Deze beelden staan waar MOSE vandaan komt: tussen baksteen, beton en kleur in de stad. Dat is de plek voor onze hoodie.',
  caption_en  = 'We do not shoot in a white box. These frames are where MOSE comes from: brick, concrete and paint in the city. That is the right backdrop for the hoodie.',
  updated_at  = NOW()
WHERE sort_order = 10;

UPDATE lookbook_chapters
SET
  title_nl    = 'LENTE OP DE GRACHT.',
  title_en    = 'SPRING BY THE CANAL.',
  caption_nl  = '240 gsm jersey: stevig genoeg om mooi te vallen, licht genoeg voor warmere dagen. Deze tee hoort bij wandelen langs water en bloesem, niet bij een moodboard.',
  caption_en  = '240 gsm jersey with enough body to drape well, light enough for warmer days. This tee belongs by water and blossom, not on a moodboard.',
  updated_at  = NOW()
WHERE sort_order = 20;

UPDATE lookbook_chapters
SET
  title_nl    = 'STEEN & STAAL.',
  title_en    = 'STONE & STEEL.',
  caption_nl  = 'De Classic Sweater is onze rustige basis: strak logo, zachte fleece aan de binnenkant, en een pasvorm die op straat net zo makkelijk draagt als binnen. We hoeven er geen extra verhaal omheen te maken.',
  caption_en  = 'The Classic Sweater is our quiet base: clean logo, soft fleece inside, and a fit that works on the street and indoors. No extra story required.',
  updated_at  = NOW()
WHERE sort_order = 30;

UPDATE lookbook_chapters
SET
  title_nl    = 'SAMEN OP DE TRAP.',
  title_en    = 'TOGETHER ON THE STEPS.',
  caption_nl  = 'Geen one-liner nodig: dit zijn wij, in Groningen, in de kleding die we zelf maken. Als het hier goed voelt, voelt het in de rest van de week ook thuis.',
  caption_en  = 'No punchline needed: this is us, in Groningen, in clothes we make ourselves. If it feels right here, it will feel right the rest of the week too.',
  updated_at  = NOW()
WHERE sort_order = 40;

-- About hero alt: same wording as apply-photoshoot-content (no em dash).
UPDATE about_settings
SET
  hero_alt_nl = 'Irma en Rick (MOSE), oprichters, op de monumentale stenen trappen in Groningen',
  hero_alt_en = 'Irma and Rick (MOSE), founders, on the monumental stone steps in Groningen'
WHERE id IS NOT NULL;
