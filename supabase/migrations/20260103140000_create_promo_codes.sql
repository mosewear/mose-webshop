-- =====================================================
-- PROMO CODES MANAGEMENT SYSTEM
-- =====================================================

-- Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
  min_order_value DECIMAL(10, 2) DEFAULT 0,
  usage_limit INTEGER DEFAULT NULL, -- NULL = unlimited
  usage_count INTEGER DEFAULT 0 NOT NULL,
  expires_at TIMESTAMP DEFAULT NULL, -- NULL = no expiry
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_codes_expires_at ON promo_codes(expires_at);

-- Create promo_code_usage tracking table (optional - for detailed analytics)
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  discount_amount DECIMAL(10, 2) NOT NULL,
  order_total DECIMAL(10, 2) NOT NULL,
  used_at TIMESTAMP DEFAULT NOW() NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create index for usage tracking
CREATE INDEX IF NOT EXISTS idx_promo_usage_code ON promo_code_usage(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_order ON promo_code_usage(order_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_date ON promo_code_usage(used_at DESC);

-- RLS Policies for promo_codes
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can read active promo codes (for validation)
CREATE POLICY "Anyone can read active promo codes"
  ON promo_codes
  FOR SELECT
  USING (is_active = true);

-- Admins can view all promo codes
CREATE POLICY "Admins can view all promo codes"
  ON promo_codes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can insert promo codes
CREATE POLICY "Admins can insert promo codes"
  ON promo_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can update promo codes
CREATE POLICY "Admins can update promo codes"
  ON promo_codes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can delete promo codes
CREATE POLICY "Admins can delete promo codes"
  ON promo_codes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- RLS Policies for promo_code_usage
ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Admins can view all usage
CREATE POLICY "Admins can view all promo code usage"
  ON promo_code_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- System can insert usage records
CREATE POLICY "System can insert promo code usage"
  ON promo_code_usage
  FOR INSERT
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_promo_code_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating updated_at
DROP TRIGGER IF EXISTS promo_codes_updated_at_trigger ON promo_codes;
CREATE TRIGGER promo_codes_updated_at_trigger
  BEFORE UPDATE ON promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_promo_code_timestamp();

-- Insert default promo codes (migratie van hardcoded codes)
INSERT INTO promo_codes (code, description, discount_type, discount_value, is_active, created_at)
VALUES 
  ('MOSE10', '10% korting op je bestelling', 'percentage', 10.00, true, NOW()),
  ('WELCOME15', '15% welkomstkorting', 'percentage', 15.00, true, NOW()),
  ('SORRY10', '10% excuses korting (na annulering)', 'percentage', 10.00, true, NOW())
ON CONFLICT (code) DO NOTHING;

-- Comments
COMMENT ON TABLE promo_codes IS 'Promo/discount codes voor de webshop';
COMMENT ON TABLE promo_code_usage IS 'Tracking van promo code gebruik per order';
COMMENT ON COLUMN promo_codes.discount_type IS 'Type korting: percentage of fixed (euro bedrag)';
COMMENT ON COLUMN promo_codes.usage_limit IS 'Max aantal keer dat code gebruikt kan worden (NULL = unlimited)';
COMMENT ON COLUMN promo_codes.usage_count IS 'Aantal keer dat code al gebruikt is';


