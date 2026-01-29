-- Create media table to track all uploaded files
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  size BIGINT NOT NULL,
  mime_type TEXT,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bucket, path)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS media_bucket_idx ON media(bucket);
CREATE INDEX IF NOT EXISTS media_created_at_idx ON media(created_at DESC);
CREATE INDEX IF NOT EXISTS media_name_idx ON media(name);

-- Enable RLS
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY "Service role can do everything"
  ON media
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users (admin) can read
CREATE POLICY "Authenticated users can read media"
  ON media
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users (admin) can insert
CREATE POLICY "Authenticated users can insert media"
  ON media
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users (admin) can delete
CREATE POLICY "Authenticated users can delete media"
  ON media
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE media IS 'Tracks all uploaded media files in Supabase Storage';
