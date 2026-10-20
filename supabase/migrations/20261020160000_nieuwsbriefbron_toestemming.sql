-- Nieuwe bron voor de nieuwsbrief: adressen die in de toestemmingsronde van
-- oktober 2026 zelf op "ja" drukten. Zonder deze waarde weigerde de CHECK de
-- inschrijving stil.
ALTER TABLE public.newsletter_subscribers DROP CONSTRAINT IF EXISTS newsletter_subscribers_source_check;
ALTER TABLE public.newsletter_subscribers ADD CONSTRAINT newsletter_subscribers_source_check
  CHECK (source = ANY (ARRAY['homepage', 'product_page', 'checkout', 'footer', 'popup',
                             'early_access', 'early_access_landing', 'admin_import', 'toestemming']));
