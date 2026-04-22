-- Add review_invitation_sent_at column to orders for idempotent Trustpilot
-- BCC dispatch. The partial index keeps it cheap to scan for "not yet sent"
-- rows during backfills / status checks without bloating normal queries.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS review_invitation_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS orders_review_invitation_sent_at_null_idx
  ON orders (delivered_at)
  WHERE review_invitation_sent_at IS NULL;

COMMENT ON COLUMN orders.review_invitation_sent_at IS
  'Timestamp of the moment we successfully BCC''d Trustpilot AFS on the order delivered email. Used for idempotency and admin visibility.';
