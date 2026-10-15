-- Verzending van de verlaten-mandmail aan.
--
-- De reparatie staat live en de selectie is nagelopen: van de acht onbetaalde
-- bestellingen blijft er één over die werkelijk niet is afgerekend. De andere
-- zeven hebben een betaalde bestelling van hetzelfde adres vlak erna en vallen
-- af door de regel uit 20261015140000.
--
-- Rick heeft akkoord gegeven om de herinnering naar Leo Wassing te laten gaan.
UPDATE site_settings
SET value = 'true'::jsonb
WHERE key = 'abandoned_cart_email_enabled';
