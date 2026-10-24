-- Bron voor wie zich via een Brevo-campagne afmeldt zonder dat er al een
-- nieuwsbriefrij was (bijvoorbeeld een betalende klant). De webhook legt die
-- afmelding dan vast als nieuwe rij met status unsubscribed.
ALTER TABLE public.newsletter_subscribers DROP CONSTRAINT IF EXISTS newsletter_subscribers_source_check;
ALTER TABLE public.newsletter_subscribers ADD CONSTRAINT newsletter_subscribers_source_check
  CHECK (source = ANY (ARRAY['homepage', 'product_page', 'checkout', 'footer', 'popup',
                             'early_access', 'early_access_landing', 'admin_import', 'toestemming', 'brevo']));
