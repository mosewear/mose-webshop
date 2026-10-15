-- Verzending van de verlaten-mandmail tijdelijk uit, en een bovengrens erbij.
--
-- De mail is nooit verstuurd (geen enkele regel van dit type in order_emails),
-- omdat Vercel de cron met GET aanriep terwijl het versturen achter POST zat.
-- Zodra die fout is uitgerold, gaat de eerstvolgende run wél post versturen.
-- Rick wil de mail eerst zien, dus de vlag gaat uit tot hij zegt dat het mag.
-- Aanzetten kan via Beheer > Instellingen of hier.
UPDATE site_settings
SET value = 'false'::jsonb
WHERE key = 'abandoned_cart_email_enabled';

-- Hoe oud een winkelmand hoogstens mag zijn voordat we er nog iets over
-- sturen. Zonder deze grens zou de eerste geslaagde run ook een bestelling
-- van 3 februari 2026 een herinnering sturen.
INSERT INTO site_settings (key, value)
VALUES ('abandoned_cart_max_hours', '168'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
