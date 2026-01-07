-- Returns Table - Volledige retourfunctionaliteit
-- Kosten: €6,50 excl BTW = €7,87 incl BTW voor retourlabel

CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Order relatie
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Retour status
  status TEXT NOT NULL DEFAULT 'return_requested',
  -- Mogelijke statussen:
  -- return_requested, return_approved, return_rejected,
  -- return_label_payment_pending, return_label_payment_completed,
  -- return_label_generated, return_in_transit, return_received,
  -- return_inspected, refund_processing, refunded, cancelled
  
  -- Retour informatie
  return_reason TEXT NOT NULL,
  customer_notes TEXT,
  admin_notes TEXT,
  
  -- Return items (JSONB voor flexibiliteit)
  return_items JSONB NOT NULL,
  -- Format: [{"order_item_id": "uuid", "quantity": 2, "reason": "te klein"}]
  
  -- Financieel
  refund_amount DECIMAL(10,2), -- Totaal terug te betalen bedrag (items)
  return_label_cost_excl_btw DECIMAL(10,2) DEFAULT 6.50, -- Kosten retourlabel excl BTW
  return_label_cost_incl_btw DECIMAL(10,2) DEFAULT 7.87, -- Kosten retourlabel incl BTW (6,50 * 1.21)
  total_refund DECIMAL(10,2), -- refund_amount (return label kosten zijn al betaald)
  
  -- Return label betaling
  return_label_payment_intent_id TEXT, -- Stripe Payment Intent ID voor label kosten
  return_label_payment_status TEXT, -- pending, completed, failed
  return_label_paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Sendcloud integratie
  sendcloud_return_id INTEGER, -- ID van retourlabel in Sendcloud
  return_tracking_code TEXT,
  return_tracking_url TEXT,
  return_label_url TEXT, -- URL naar PDF label
  
  -- Timestamps
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  approved_at TIMESTAMP WITH TIME ZONE,
  label_payment_pending_at TIMESTAMP WITH TIME ZONE,
  label_paid_at TIMESTAMP WITH TIME ZONE,
  label_generated_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  
  -- Stripe refund
  stripe_refund_id TEXT,
  stripe_refund_status TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_returns_order ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_user ON returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_created ON returns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_returns_payment_intent ON returns(return_label_payment_intent_id);

-- Return Status History Table
CREATE TABLE IF NOT EXISTS return_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_return_status_history_return ON return_status_history(return_id);
CREATE INDEX IF NOT EXISTS idx_return_status_history_created ON return_status_history(created_at DESC);

-- RLS Policies
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_status_history ENABLE ROW LEVEL SECURITY;

-- Users can view own returns
CREATE POLICY "Users can view own returns" 
  ON returns FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can create returns
CREATE POLICY "Users can create returns" 
  ON returns FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can view own return status history
CREATE POLICY "Users can view own return history" 
  ON return_status_history FOR SELECT 
  USING (
    return_id IN (
      SELECT id FROM returns WHERE user_id = auth.uid()
    )
  );

-- Admins kunnen alles
CREATE POLICY "Admins can manage all returns" 
  ON returns FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can view all return history" 
  ON return_status_history FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_returns_updated_at 
  BEFORE UPDATE ON returns
  FOR EACH ROW 
  EXECUTE FUNCTION update_returns_updated_at();

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_return_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO return_status_history (
      return_id,
      old_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for status logging
CREATE TRIGGER log_return_status_change
  AFTER UPDATE ON returns
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_return_status_change();

-- Uitbreiding orders tabel
ALTER TABLE orders ADD COLUMN IF NOT EXISTS has_returns BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_deadline TIMESTAMP WITH TIME ZONE;

-- Functie om return deadline te berekenen
CREATE OR REPLACE FUNCTION calculate_return_deadline(order_date TIMESTAMP WITH TIME ZONE, return_days INT)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  RETURN order_date + (return_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Uitbreiding order_emails tabel voor returns
ALTER TABLE order_emails ADD COLUMN IF NOT EXISTS return_id UUID REFERENCES returns(id) ON DELETE SET NULL;

-- Function to increment stock when return is received
CREATE OR REPLACE FUNCTION increment_variant_stock(variant_id UUID, quantity INT)
RETURNS VOID AS $$
BEGIN
  UPDATE product_variants
  SET stock_quantity = stock_quantity + quantity
  WHERE id = variant_id;
END;
$$ LANGUAGE plpgsql;

