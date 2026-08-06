-- Mollie payment provider columns (replaces Stripe for new checkouts).
-- Historical stripe_* columns are retained for legacy orders/returns.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS mollie_payment_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_orders_mollie_payment_id
  ON orders (mollie_payment_id);

COMMENT ON COLUMN orders.mollie_payment_id IS
  'Mollie Payment ID (tr_…) for this order — primary payment reference for new checkouts';

ALTER TABLE returns
  ADD COLUMN IF NOT EXISTS mollie_refund_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mollie_refund_status VARCHAR(50);

COMMENT ON COLUMN returns.mollie_refund_id IS
  'Mollie Refund ID (re_…) for return refunds';
COMMENT ON COLUMN returns.mollie_refund_status IS
  'Mollie refund status (queued, pending, processing, refunded, failed)';

-- Reuse return_label_payment_intent_id for Mollie payment IDs (string reference).
COMMENT ON COLUMN returns.return_label_payment_intent_id IS
  'Payment provider ID for return-label fee (Stripe pi_… legacy, Mollie tr_… for new)';
