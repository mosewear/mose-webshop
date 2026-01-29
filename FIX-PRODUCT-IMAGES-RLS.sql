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
