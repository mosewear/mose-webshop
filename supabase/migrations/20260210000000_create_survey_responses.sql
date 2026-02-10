-- Create survey responses table
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  page_url TEXT,
  device_type TEXT,
  user_agent TEXT,
  locale TEXT DEFAULT 'nl',
  purchase_likelihood TEXT NOT NULL,
  what_needed JSONB NOT NULL DEFAULT '[]',
  first_impression TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_survey_responses_session_id ON survey_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_created_at ON survey_responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_survey_responses_purchase_likelihood ON survey_responses(purchase_likelihood);
CREATE INDEX IF NOT EXISTS idx_survey_responses_page_url ON survey_responses(page_url);

-- Enable RLS
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT survey responses (for anonymous users)
CREATE POLICY "Anyone can create survey responses"
  ON survey_responses
  FOR INSERT
  WITH CHECK (true);

-- Admins can read all survey responses
CREATE POLICY "Admins can view all survey responses"
  ON survey_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

