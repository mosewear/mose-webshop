-- Create Storage Bucket for Product Images

-- Create product-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product-images bucket

-- Allow public access to read images
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Allow admins to upload images
CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('admin', 'manager'))
);

-- Allow admins to update images
CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('admin', 'manager'))
);

-- Allow admins to delete images  
CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images'
  AND auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('admin', 'manager'))
);




