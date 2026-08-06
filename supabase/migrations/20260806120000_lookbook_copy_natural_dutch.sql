-- Lookbook copy: natural Dutch (and matching EN), Aug 2026.
-- Page-level settings were still on Winter '25 marketing phrasing;
-- chapter captions tightened to match MOSE voice (direct, no poespas).
-- Targets chapters by sort_order (10/20/30/40) as seeded by apply-photoshoot-content.

UPDATE lookbook_settings
SET
  header_subtitle = 'Hoodie, sweater en tee. Geschoten in Groningen.',
  header_subtitle_en = 'Hoodie, sweater and tee. Shot in Groningen.',
  ticker_text_nl = 'GEEN FAST FASHION • GEMAAKT IN GRONINGEN • PREMIUM BASICS • GEBOUWD OM TE BLIJVEN',
  ticker_text_en = 'NO FAST FASHION • MADE IN GRONINGEN • PREMIUM BASICS • BUILT TO LAST',
  final_cta_title = 'DE COLLECTIE',
  final_cta_title_en = 'THE COLLECTION',
  final_cta_text = 'Alles uit deze shoot vind je in de shop. Gemaakt in Groningen, geen poespas.',
  final_cta_text_en = 'Everything from this shoot is in the shop. Made in Groningen, no fuss.',
  final_cta_button_text = 'Shop de collectie',
  final_cta_button_text_en = 'Shop the collection',
  updated_at = NOW();

UPDATE lookbook_chapters
SET
  title_nl    = 'GRONINGEN, GEWOON.',
  title_en    = 'JUST GRONINGEN.',
  caption_nl  = 'Geen witte studio. Deze foto''s zijn gemaakt waar MOSE vandaan komt: baksteen, beton en kleur in de stad. Precies de plek voor onze hoodie.',
  caption_en  = 'No white studio. These shots are where MOSE comes from: brick, concrete and colour in the city. The right place for our hoodie.',
  updated_at  = NOW()
WHERE sort_order = 10;

UPDATE lookbook_chapters
SET
  title_nl    = 'LENTE OP DE GRACHT.',
  title_en    = 'SPRING BY THE CANAL.',
  caption_nl  = '240 gsm jersey: stevig genoeg om mooi te vallen, licht genoeg voor warmere dagen. Deze tee hoort bij de gracht, niet bij een moodboard.',
  caption_en  = '240 gsm jersey: enough body to hang well, light enough for warmer days. This tee belongs by the canal, not on a moodboard.',
  updated_at  = NOW()
WHERE sort_order = 20;

UPDATE lookbook_chapters
SET
  title_nl    = 'STEEN & STAAL.',
  title_en    = 'STONE & STEEL.',
  caption_nl  = 'De Classic Sweater is onze rustige basis: strak logo, zachte fleece binnenin, een pasvorm die overal werkt. Meer verhaal hoeft er niet bij.',
  caption_en  = 'The Classic Sweater is our quiet base: clean logo, soft fleece inside, a fit that works anywhere. No extra story needed.',
  updated_at  = NOW()
WHERE sort_order = 30;

UPDATE lookbook_chapters
SET
  title_nl    = 'SAMEN OP DE TRAP.',
  title_en    = 'TOGETHER ON THE STEPS.',
  caption_nl  = 'Geen slogan nodig: dit zijn wij, in Groningen, in de kleding die we zelf maken. Als het hier goed zit, zit het de rest van de week ook goed.',
  caption_en  = 'No slogan needed: this is us, in Groningen, in clothes we make ourselves. If it feels right here, it will feel right the rest of the week too.',
  updated_at  = NOW()
WHERE sort_order = 40;
