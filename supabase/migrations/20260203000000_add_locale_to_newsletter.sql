-- Add locale column to newsletter_subscribers table
ALTER TABLE newsletter_subscribers 
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'nl' CHECK (locale IN ('nl', 'en'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_locale ON newsletter_subscribers(locale);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_source ON newsletter_subscribers(source);

-- Add comment
COMMENT ON COLUMN newsletter_subscribers.locale IS 'Language preference of the subscriber (nl or en)';

