-- Create back_in_stock_notifications table
CREATE TABLE IF NOT EXISTS back_in_stock_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  email TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  notified_at TIMESTAMP WITH TIME ZONE,
  is_notified BOOLEAN DEFAULT FALSE,
  UNIQUE(email, product_id, variant_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_back_in_stock_product ON back_in_stock_notifications(product_id);
CREATE INDEX IF NOT EXISTS idx_back_in_stock_variant ON back_in_stock_notifications(variant_id);
CREATE INDEX IF NOT EXISTS idx_back_in_stock_notified ON back_in_stock_notifications(is_notified) WHERE is_notified = FALSE;

-- Enable RLS
ALTER TABLE back_in_stock_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert notifications
CREATE POLICY "Anyone can create notifications" ON back_in_stock_notifications
  FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can view all notifications
CREATE POLICY "Admins can view all notifications" ON back_in_stock_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Policy: System can update notifications (for cron job)
CREATE POLICY "System can update notifications" ON back_in_stock_notifications
  FOR UPDATE
  USING (true)
  WITH CHECK (true);


