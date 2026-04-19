-- Link loyalty adjustments to returns for idempotent per-return deductions.
ALTER TABLE loyalty_transactions
  ADD COLUMN IF NOT EXISTS return_id UUID REFERENCES returns(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_transactions_return_id_unique
  ON loyalty_transactions(return_id)
  WHERE return_id IS NOT NULL;

COMMENT ON COLUMN loyalty_transactions.return_id IS
  'When set, this adjustment applies to a specific return (e.g. points clawback). Unique per return.';
