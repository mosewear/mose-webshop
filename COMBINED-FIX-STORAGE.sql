-- Check and fix RLS policies for product_images table
-- This ensures images don't disappear after upload

-- First, let's see current policies (for reference)
-- Run this in Supabase SQL Editor to see what's there:
-- SELECT * FROM pg_policies WHERE tablename = 'product_images';

-- Drop any restrictive policies that might cause issues
DROP POLICY IF EXISTS "Users can view product images" ON product_images;
DROP POLICY IF EXISTS "Admin can manage product images" ON product_images;
DROP POLICY IF EXISTS "Service role full access" ON product_images;

-- Create comprehensive policies

-- 1. PUBLIC can SELECT (read) all product images
CREATE POLICY "Public can view all product images"
  ON product_images
  FOR SELECT
  TO public
  USING (true);

-- 2. AUTHENTICATED users (admins) can INSERT
CREATE POLICY "Authenticated users can insert product images"
  ON product_images
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. AUTHENTICATED users (admins) can UPDATE
CREATE POLICY "Authenticated users can update product images"
  ON product_images
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. AUTHENTICATED users (admins) can DELETE
CREATE POLICY "Authenticated users can delete product images"
  ON product_images
  FOR DELETE
  TO authenticated
  USING (true);

-- 5. SERVICE ROLE has full access (for migrations, admin API, etc.)
CREATE POLICY "Service role full access to product images"
  ON product_images
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Add helpful comment
COMMENT ON TABLE product_images IS 'Stores product image URLs with RLS policies allowing public read and authenticated write';

-- Success message
SELECT 'Product images RLS policies updated successfully!' as status;
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
