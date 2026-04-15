-- Staffelkorting (quantity discount) systeem
-- Koop 2+ = X% korting, koop 3+ = Y% korting per product

CREATE TABLE IF NOT EXISTS product_quantity_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_quantity INT NOT NULL CHECK (min_quantity >= 2),
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(product_id, min_quantity)
);

CREATE INDEX IF NOT EXISTS idx_quantity_discounts_product ON product_quantity_discounts(product_id);
CREATE INDEX IF NOT EXISTS idx_quantity_discounts_active ON product_quantity_discounts(product_id, is_active);

-- Kolommen op order_items voor staffelkorting tracking
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS quantity_discount_amount DECIMAL(10,2) DEFAULT 0;

-- RLS policies
ALTER TABLE product_quantity_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active quantity discounts"
  ON product_quantity_discounts FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage quantity discounts"
  ON product_quantity_discounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Service role bypass
CREATE POLICY "Service role full access to quantity discounts"
  ON product_quantity_discounts FOR ALL
  USING (auth.role() = 'service_role');
