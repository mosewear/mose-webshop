-- Dezelfde zin in de database gelijktrekken met wat de homepage toont.
--
-- De homepage rendert deze alinea uit het vertaalbestand, niet uit deze tabel.
-- Dit veld staat wel in het beheerscherm voor de homepage, dus als het hier
-- blijft staan zoals het was, leest Rick daar straks een zin die nergens meer
-- op de site staat.
UPDATE homepage_settings
SET story_paragraph1 = 'Geen poespas. Alleen karakter. We maken kleding die lang meegaat, lokaal geproduceerd en geen compromissen op kwaliteit.'
WHERE story_paragraph1 = 'Geen poespas. Alleen karakter. We maken kleding die lang meegaat, lokaal geproduceerd zonder compromissen op kwaliteit.';
