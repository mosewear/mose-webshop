-- Add locale column to orders table for multilingual email support
-- This allows us to send emails in the customer's preferred language

-- Add locale column (defaults to 'nl' for existing orders)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'nl';

-- Add comment to explain the column
COMMENT ON COLUMN orders.locale IS 'Customer language preference (nl/en) for emails and order confirmations';

-- Add check constraint to ensure only valid locales
ALTER TABLE orders
ADD CONSTRAINT orders_locale_check CHECK (locale IN ('nl', 'en'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS orders_locale_idx ON orders(locale);

-- Success message
SELECT 'Locale column added to orders table successfully!' as status;







