-- =====================================================
-- ENHANCED ORDER MANAGEMENT SYSTEM
-- =====================================================

-- Add new columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS carrier VARCHAR(100),
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE,
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_email_type VARCHAR(50);

-- Update tracking_url column comment
COMMENT ON COLUMN orders.tracking_url IS 'Full tracking URL for the shipment';
COMMENT ON COLUMN orders.carrier IS 'Shipping carrier name (PostNL, DHL, DPD, UPS, etc)';
COMMENT ON COLUMN orders.internal_notes IS 'Admin-only notes, not visible to customer';

-- Create order status history table
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  email_type VARCHAR(50)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_at ON order_status_history(changed_at DESC);

-- Create email log table for tracking all emails sent
CREATE TABLE IF NOT EXISTS order_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  email_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject TEXT,
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent',
  error_message TEXT,
  metadata JSONB
);

-- Add index for email log
CREATE INDEX IF NOT EXISTS idx_order_emails_order_id ON order_emails(order_id);
CREATE INDEX IF NOT EXISTS idx_order_emails_sent_at ON order_emails(sent_at DESC);

-- RLS Policies for order_status_history
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all status history
CREATE POLICY "Admins can view all order status history"
  ON order_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can insert status history
CREATE POLICY "Admins can insert order status history"
  ON order_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- RLS Policies for order_emails
ALTER TABLE order_emails ENABLE ROW LEVEL SECURITY;

-- Admins can view all email logs
CREATE POLICY "Admins can view all order emails"
  ON order_emails
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can insert email logs
CREATE POLICY "Admins can insert order emails"
  ON order_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Function to automatically log status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (
      order_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic status logging
DROP TRIGGER IF EXISTS order_status_change_trigger ON orders;
CREATE TRIGGER order_status_change_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_order_status_change();

-- Create function to get order timeline
CREATE OR REPLACE FUNCTION get_order_timeline(order_uuid UUID)
RETURNS TABLE (
  event_time TIMESTAMP,
  event_type VARCHAR,
  event_description TEXT,
  changed_by_email VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.changed_at as event_time,
    'status_change' as event_type,
    CONCAT('Status changed from ', COALESCE(h.old_status, 'none'), ' to ', h.new_status) as event_description,
    p.email as changed_by_email
  FROM order_status_history h
  LEFT JOIN profiles p ON h.changed_by = p.id
  WHERE h.order_id = order_uuid
  
  UNION ALL
  
  SELECT 
    e.sent_at as event_time,
    'email_sent' as event_type,
    CONCAT('Email sent: ', e.email_type, ' to ', e.recipient_email) as event_description,
    NULL as changed_by_email
  FROM order_emails e
  WHERE e.order_id = order_uuid
  
  ORDER BY event_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_order_timeline(UUID) TO authenticated;

COMMENT ON TABLE order_status_history IS 'Tracks all status changes for orders with timestamps and who made the change';
COMMENT ON TABLE order_emails IS 'Logs all emails sent for orders for audit trail';
COMMENT ON FUNCTION get_order_timeline IS 'Returns complete timeline of order events (status changes and emails)';


