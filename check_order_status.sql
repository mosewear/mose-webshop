SELECT 
  id,
  email,
  payment_status,
  paid_at,
  stripe_payment_intent_id,
  checkout_started_at,
  status,
  created_at
FROM orders 
WHERE stripe_payment_intent_id = 'pi_3SIYiK18Iv5roGYjibmnS3wH'
OR id = '60ab6109-b83f-4f5b-ab41-4a8cc40e460a';
