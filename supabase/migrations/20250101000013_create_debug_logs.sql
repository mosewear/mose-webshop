-- Debug logs table
CREATE TABLE IF NOT EXISTS debug_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level VARCHAR(20) NOT NULL, -- 'info', 'error', 'warn'
  message TEXT NOT NULL,
  details JSONB,
  user_agent TEXT,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for faster querying
CREATE INDEX idx_debug_logs_created_at ON debug_logs(created_at DESC);
CREATE INDEX idx_debug_logs_level ON debug_logs(level);

-- RLS Policies
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert logs (so mobile can send)
CREATE POLICY "Anyone can insert logs"
  ON debug_logs FOR INSERT
  WITH CHECK (true);

-- Only admins can read logs
CREATE POLICY "Admins can view logs"
  ON debug_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

