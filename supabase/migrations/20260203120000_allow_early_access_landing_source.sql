-- Update newsletter_subscribers source check constraint to allow 'early_access_landing'
-- This fixes the 500 error when subscribing via the Early Access page

-- Drop the existing constraint
ALTER TABLE newsletter_subscribers 
DROP CONSTRAINT IF EXISTS newsletter_subscribers_source_check;

-- Add new constraint with all valid source values including 'early_access_landing'
ALTER TABLE newsletter_subscribers
ADD CONSTRAINT newsletter_subscribers_source_check 
CHECK (source IN (
  'homepage',
  'product_page', 
  'checkout',
  'footer',
  'popup',
  'early_access',
  'early_access_landing'
));

-- Verify the constraint was updated
DO $$
BEGIN
  RAISE NOTICE 'Constraint updated successfully. Testing with early_access_landing...';
END $$;



