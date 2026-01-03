-- MANUAL FIX: Update de huidige order naar PAID status
-- Dit simuleert wat de webhook had moeten doen

UPDATE orders 
SET 
  payment_status = 'paid',
  paid_at = NOW(),
  payment_method = 'ideal',
  status = 'processing',
  payment_metadata = jsonb_build_object(
    'manual_fix', true,
    'payment_intent_id', stripe_payment_intent_id,
    'fixed_at', NOW()
  )
WHERE id = '60ab6109-b83f-4f5b-ab41-4a8cc40e460a'
AND payment_status = 'pending'
RETURNING id, email, payment_status, paid_at, status;
