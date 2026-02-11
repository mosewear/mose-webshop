-- Create table to track which insider emails have been sent to which subscribers
CREATE TABLE IF NOT EXISTS insider_email_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN ('welcome', 'community', 'behind-scenes', 'launch-week')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscriber_id, email_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_insider_email_sent_subscriber_id ON insider_email_sent(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_insider_email_sent_email_type ON insider_email_sent(email_type);
CREATE INDEX IF NOT EXISTS idx_insider_email_sent_sent_at ON insider_email_sent(sent_at DESC);

-- Enable RLS
ALTER TABLE insider_email_sent ENABLE ROW LEVEL SECURITY;

-- Admins can read all sent emails
CREATE POLICY "Admins can view all insider email sent records"
  ON insider_email_sent
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Service role can insert (for email sending)
CREATE POLICY "Service role can insert insider email sent records"
  ON insider_email_sent
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE insider_email_sent IS 'Tracks which insider emails have been sent to which subscribers';
COMMENT ON COLUMN insider_email_sent.email_type IS 'Type of insider email: welcome, community, behind-scenes, or launch-week';
COMMENT ON COLUMN insider_email_sent.sent_at IS 'When the email was actually sent';




