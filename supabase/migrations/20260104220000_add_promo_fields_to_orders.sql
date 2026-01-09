-- Add promo_code and discount_amount columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS promo_code TEXT,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

-- Add comment
COMMENT ON COLUMN orders.promo_code IS 'Promo code used for this order';
COMMENT ON COLUMN orders.discount_amount IS 'Discount amount applied from promo code';


