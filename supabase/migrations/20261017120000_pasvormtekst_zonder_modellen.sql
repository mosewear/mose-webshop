-- Maattabellen: geen verwijzing meer naar modellen op de foto's.
--
-- De galerijen van de hoodie en de sweater zijn vervangen door het pakket
-- MOSE-Webshop-productfotografie van 16 oktober. Op die nieuwe beelden staan
-- andere personen, en het leesmij-bestand is daar uitdrukkelijk over:
--
--   "Gebruik de namen/hoogtes/maten van de eerdere modellen niet voor de
--    nieuwe fictieve modellen. Toon uitsluitend een werkelijke maatvoering en
--    de echte maattabel van het artikel."
--
-- De pasvormtekst zei nog "Op de foto's draagt Marlon maat L bij 1,88 m en
-- Rick maat L bij 1,86 m". Die mannen staan niet meer op die foto's, dus dat
-- was vanaf vandaag een onjuiste mededeling bij een maatadvies. Weg ermee.
--
-- De tekst bij t-shirts blijft staan: de Tee-foto's zijn niet vervangen en
-- Marc en Erik staan daar nog wel op.

UPDATE categories
SET size_guide_content = jsonb_set(
      size_guide_content,
      '{fit_note}',
      to_jsonb('Voor de regular fit kun je je gebruikelijke maat kiezen. Zit je tussen twee maten in, dan geeft de grotere een relaxter silhouet.'::text)
    ),
    size_guide_content_en = jsonb_set(
      size_guide_content_en,
      '{fit_note}',
      to_jsonb('You can take your usual size for this regular fit. Between two sizes, the larger gives a more relaxed silhouette.'::text)
    ),
    updated_at = NOW()
WHERE slug = 'hoodies';

UPDATE categories
SET size_guide_content = jsonb_set(
      size_guide_content,
      '{fit_note}',
      to_jsonb('Neem je normale maat voor de regular fit van de Classic Sweater. Zit je tussen twee maten in en wil je wat meer ruimte, neem dan de grotere.'::text)
    ),
    size_guide_content_en = jsonb_set(
      size_guide_content_en,
      '{fit_note}',
      to_jsonb('Take your usual size for the regular fit of the Classic Sweater. Between two sizes, take the larger for a little more room.'::text)
    ),
    updated_at = NOW()
WHERE slug = 'sweaters';
