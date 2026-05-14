-- Allow admin CSV/Excel bulk imports to set a dedicated source value.

ALTER TABLE newsletter_subscribers
DROP CONSTRAINT IF EXISTS newsletter_subscribers_source_check;

ALTER TABLE newsletter_subscribers
ADD CONSTRAINT newsletter_subscribers_source_check
CHECK (source IN (
  'homepage',
  'product_page',
  'checkout',
  'footer',
  'popup',
  'early_access',
  'early_access_landing',
  'admin_import'
));
