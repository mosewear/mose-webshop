-- =====================================================
-- NEWSLETTER SUBSCRIBERS TABLE
-- =====================================================
-- Creates table for newsletter email subscriptions
-- Includes status tracking, source attribution, and GDPR compliance

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  source TEXT DEFAULT 'homepage' CHECK (source IN ('homepage', 'checkout', 'product_page', 'footer', 'popup', 'manual')),
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribed_at ON newsletter_subscribers(subscribed_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_source ON newsletter_subscribers(source);

-- Enable RLS (Row Level Security)
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can subscribe (insert)
CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Anyone can unsubscribe (update their own)
CREATE POLICY "Anyone can unsubscribe"
  ON newsletter_subscribers
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (status = 'unsubscribed');

-- Policy: Only authenticated users can read (for admin)
CREATE POLICY "Authenticated users can read all subscribers"
  ON newsletter_subscribers
  FOR SELECT
  TO authenticated
  USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_newsletter_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER newsletter_updated_at_trigger
  BEFORE UPDATE ON newsletter_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletter_updated_at();

-- Comment
COMMENT ON TABLE newsletter_subscribers IS 'Newsletter email subscribers with status tracking and GDPR compliance';
COMMENT ON COLUMN newsletter_subscribers.status IS 'Subscription status: active or unsubscribed';
COMMENT ON COLUMN newsletter_subscribers.source IS 'Where the subscriber signed up from';
COMMENT ON COLUMN newsletter_subscribers.metadata IS 'Additional data like preferences, tags, etc.';







