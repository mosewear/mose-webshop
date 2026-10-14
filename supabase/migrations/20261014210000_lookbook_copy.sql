-- Lookbookteksten in dezelfde stem als de productteksten.
--
-- De bijschriften stonden in telegramstijl en bleven vaag: "Geen studio.
-- Baksteen, beton, verf op de muur." en "Past overal." Dat zegt niets over wat
-- je koopt en het klinkt niet als de rest van de winkel. De productteksten
-- schrijven in hele zinnen, noemen de stof in grammen, noemen Groningen en de
-- handmatige afwerking, en sluiten af met een korte regel. Die lijn trekken we
-- hier door, met per hoofdstuk één concreet feit over het kledingstuk op de foto.

update lookbook_settings set
  header_subtitle = 'De hoodie, de sweater en de tee, gefotografeerd op straat in Groningen. Alles wat je hier ziet, ligt in de winkel.',
  header_subtitle_en = 'The hoodie, the sweater and the tee, photographed on the streets of Groningen. Everything you see here is in the shop.',
  final_cta_title = 'IN DE SHOP',
  final_cta_title_en = 'IN THE SHOP',
  final_cta_text = 'Alles uit deze shoot ligt in de winkel, gemaakt en met de hand afgewerkt in Groningen. Vanaf 150 euro verzenden we gratis en je hebt dertig dagen om van gedachten te veranderen.',
  final_cta_text_en = 'Everything from this shoot is in the shop, made and hand-finished in Groningen. Shipping is free from 150 euro and you have thirty days to change your mind.',
  final_cta_button_text = 'Bekijk de collectie',
  final_cta_button_text_en = 'View the collection',
  updated_at = now();

update lookbook_chapters set
  caption_nl = 'We fotograferen niet in een studio, maar tegen de baksteen en het beton van Groningen. De Essential Hoodie is gemaakt van katoenen joggingfleece van 300 gram per vierkante meter en voelt stevig aan, met een zachte binnenkant. De regular fit geeft ruimte om te bewegen, ook met een shirt eronder.',
  caption_en = 'No studio. We photographed this against the brick and concrete of Groningen. The Essential Hoodie is made from 300 gsm cotton sweatshirt fleece with a soft interior, and the regular fit leaves room to move, even with a tee underneath.',
  updated_at = now()
where sort_order = 10;

update lookbook_chapters set
  caption_nl = 'Deze foto''s zijn gemaakt langs het water, op een van de eerste dagen dat je zonder jas de deur uit kunt. De MOSE Tee is gemaakt van jersey van 240 gram per vierkante meter: stevig genoeg om zijn vorm te houden, licht genoeg om de hele dag te dragen. De geribde hals blijft strak, was na was.',
  caption_en = 'We shot this by the water, on one of the first days you can leave the jacket at home. The MOSE Tee is made from 240 gsm jersey: substantial enough to hold its shape, light enough to wear all day. The ribbed neck stays neat, wash after wash.',
  updated_at = now()
where sort_order = 20;

update lookbook_chapters set
  caption_nl = 'De Classic Sweater is gemaakt van katoenen joggingfleece van 300 gram per vierkante meter, met een ronde hals in plaats van een capuchon. Het logo zit klein op de borst en de geribde manchetten en zoom houden de afwerking strak. Je trekt hem aan zonder erover na te denken, en dat is precies de bedoeling.',
  caption_en = 'The Classic Sweater is made from 300 gsm cotton sweatshirt fleece, with a crew neck instead of a hood. The logo sits small on the chest, and ribbed cuffs and hem keep the finish clean. You pull it on without thinking about it, which is exactly the point.',
  updated_at = now()
where sort_order = 30;

update lookbook_chapters set
  caption_nl = 'Irma en Rick, en een atelier in Groningen. We maken de kleding die we zelf dragen en werken ieder exemplaar hier met de hand af. Als het hier goed zit, zit het de rest van de week ook goed.',
  caption_en = 'Irma and Rick, and an atelier in Groningen. We make the clothes we wear ourselves and finish every piece here by hand. If it sits right here, it sits right the rest of the week too.',
  updated_at = now()
where sort_order = 40;

-- De eenheid stond in het ene hoofdstuk als "240 gsm" en in het andere als
-- "300 GSM", terwijl de productteksten "gram per vierkante meter" schrijven.
update lookbook_chapters
set meta = replace(meta::text, '240 GSM OEKO-Tex jersey', '240 gram per vierkante meter, OEKO-Tex jersey')::jsonb
where meta::text like '%240 GSM OEKO-Tex jersey%';

update lookbook_chapters
set meta = replace(meta::text, '300 GSM OEKO-Tex joggingfleece katoen', '300 gram per vierkante meter, OEKO-Tex joggingfleece')::jsonb
where meta::text like '%300 GSM OEKO-Tex joggingfleece katoen%';
