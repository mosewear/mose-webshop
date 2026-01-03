-- Add label_url column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS label_url TEXT;

COMMENT ON COLUMN orders.label_url IS 'Sendcloud label PDF URL for printing';
