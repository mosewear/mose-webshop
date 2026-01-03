-- Check de actuele status in de database
SELECT 
  id,
  email,
  payment_status,
  status,
  paid_at,
  checkout_started_at,
  stripe_payment_intent_id,
  payment_method,
  total,
  created_at,
  updated_at
FROM orders 
WHERE id = '60ab6109-b83f-4f5b-ab41-4a8cc40e460a';

-- Check of er oude kolommen zijn
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('stripe_payment_status', 'payment_intent_id', 'payment_status');
