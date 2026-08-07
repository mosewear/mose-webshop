-- Lookbook copy rewrite (Aug 2026): founder voice, natural NL/EN.
-- Drops slogan titles ("STEEN & STAAL", "GRONINGEN, GEWOON"), moodboard
-- lines, and English calques ("geschoten", "gebouwd om te blijven").
-- Targets chapters by sort_order (10/20/30/40) as seeded by apply-photoshoot-content.

UPDATE lookbook_settings
SET
  header_subtitle = 'Hoodie, sweater en tee. Gefotografeerd in Groningen.',
  header_subtitle_en = 'Hoodie, sweater and tee. Photographed in Groningen.',
  ticker_text_nl = 'GEEN FAST FASHION • GEMAAKT IN GRONINGEN • GOEDE BASICS • BLIJFT LANG MEE',
  ticker_text_en = 'NO FAST FASHION • MADE IN GRONINGEN • SOLID BASICS • MADE TO LAST',
  final_cta_title = 'IN DE SHOP',
  final_cta_title_en = 'IN THE SHOP',
  final_cta_text = 'Alles uit deze shoot kun je gewoon bestellen. Gemaakt in Groningen.',
  final_cta_text_en = 'Everything from this shoot is up for order. Made in Groningen.',
  final_cta_button_text = 'Shop de collectie',
  final_cta_button_text_en = 'Shop the collection',
  hero_title = 'LOOKBOOK',
  hero_title_en = 'LOOKBOOK',
  hero_subtitle = 'Gemaakt in Groningen.',
  hero_subtitle_en = 'Made in Groningen.',
  quote_text = 'KLEDING HOEFT NIET INGEWIKKELD TE ZIJN.',
  quote_text_en = 'CLOTHING DOES NOT NEED TO BE COMPLICATED.',
  quote_subtext = 'Geen fast fashion. Goede basics. Lang houdbaar.',
  quote_subtext_en = 'No fast fashion. Solid basics. Built to last.',
  updated_at = NOW();

UPDATE lookbook_chapters
SET
  title_nl   = 'HOODIE IN DE STAD.',
  title_en   = 'HOODIE IN THE CITY.',
  caption_nl = 'Geen studio. Baksteen, beton, verf op de muur. Groningen, waar we vandaan komen. Precies waar onze hoodie thuishoort.',
  caption_en = 'No studio. Brick, concrete, paint on the wall. Groningen, where we come from. Exactly where our hoodie belongs.',
  meta = '[
    {"label_nl":"MATERIAAL","label_en":"MATERIAL","value_nl":"300 GSM OEKO-Tex joggingfleece katoen","value_en":"300 GSM OEKO-Tex jogging fleece cotton"},
    {"label_nl":"PASVORM","label_en":"FIT","value_nl":"Normale pasvorm","value_en":"Regular fit"},
    {"label_nl":"GEMAAKT IN","label_en":"MADE IN","value_nl":"Groningen, NL","value_en":"Groningen, NL"}
  ]'::jsonb,
  updated_at = NOW()
WHERE sort_order = 10;

UPDATE lookbook_chapters
SET
  title_nl   = 'TEE AAN HET WATER.',
  title_en   = 'TEE BY THE WATER.',
  caption_nl = '240 gsm jersey. Valt lekker, voelt licht. Voor dagen waarop je langs het water loopt zonder jas.',
  caption_en = '240 gsm jersey. Nice drape, feels light. For days you walk by the water without a jacket.',
  meta = '[
    {"label_nl":"MATERIAAL","label_en":"MATERIAL","value_nl":"240 GSM OEKO-Tex jersey","value_en":"240 GSM OEKO-Tex jersey"},
    {"label_nl":"PASVORM","label_en":"FIT","value_nl":"Normale pasvorm","value_en":"Regular fit"},
    {"label_nl":"GEMAAKT IN","label_en":"MADE IN","value_nl":"Groningen, NL","value_en":"Groningen, NL"}
  ]'::jsonb,
  updated_at = NOW()
WHERE sort_order = 20;

UPDATE lookbook_chapters
SET
  title_nl   = 'DE CLASSIC SWEATER.',
  title_en   = 'THE CLASSIC SWEATER.',
  caption_nl = 'Strak logo, zachte fleece binnenin. Trek hem aan, ga de deur uit. Past overal.',
  caption_en = 'Clean logo, soft fleece inside. Pull it on, head out. Works anywhere.',
  meta = '[
    {"label_nl":"MATERIAAL","label_en":"MATERIAL","value_nl":"300 GSM OEKO-Tex joggingfleece katoen","value_en":"300 GSM OEKO-Tex jogging fleece cotton"},
    {"label_nl":"PASVORM","label_en":"FIT","value_nl":"Normale pasvorm","value_en":"Regular fit"},
    {"label_nl":"GEMAAKT IN","label_en":"MADE IN","value_nl":"Groningen, NL","value_en":"Groningen, NL"}
  ]'::jsonb,
  updated_at = NOW()
WHERE sort_order = 30;

UPDATE lookbook_chapters
SET
  title_nl   = 'DIT ZIJN WIJ.',
  title_en   = 'THIS IS US.',
  caption_nl = 'Irma en Rick. Groningen. De kleding die we zelf maken. Als het hier goed zit, zit het de rest van de week ook goed.',
  caption_en = 'Irma and Rick. Groningen. Clothes we make ourselves. If it sits right here, it sits right the rest of the week too.',
  updated_at = NOW()
WHERE sort_order = 40;
