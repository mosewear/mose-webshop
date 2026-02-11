-- =====================================================
-- ADD SUBSCRIBER_ID TO PROMO_CODES
-- Link promo codes to newsletter subscribers
-- =====================================================

-- Add subscriber_id column
ALTER TABLE promo_codes
ADD COLUMN subscriber_id UUID REFERENCES newsletter_subscribers(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_promo_codes_subscriber_id ON promo_codes(subscriber_id);

-- Comment
COMMENT ON COLUMN promo_codes.subscriber_id IS 
'Link naar nieuwsbrief subscriber (voor persoonlijke welkomstcodes). NULL voor algemene codes.';

-- Show summary
DO $$ 
BEGIN
  RAISE NOTICE '✅ Added subscriber_id column to promo_codes';
  RAISE NOTICE '✅ Created index idx_promo_codes_subscriber_id';
  RAISE NOTICE '✅ Ready for automated newsletter promo code generation!';
END $$;



