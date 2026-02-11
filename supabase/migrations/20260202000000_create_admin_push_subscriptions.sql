-- =====================================================
-- ADMIN PUSH NOTIFICATIONS TABLE
-- =====================================================
--
-- Stores push notification subscriptions for admin users
-- Enables KaChing notifications for new orders
--

CREATE TABLE IF NOT EXISTS admin_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_push_subscriptions_user_id 
  ON admin_push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_admin_push_subscriptions_endpoint 
  ON admin_push_subscriptions(endpoint);

-- RLS Policies
ALTER TABLE admin_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Admins can manage their own subscriptions
CREATE POLICY "Admins can manage their own push subscriptions"
  ON admin_push_subscriptions
  FOR ALL
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Service role can manage all subscriptions (for sending notifications)
CREATE POLICY "Service role can manage all push subscriptions"
  ON admin_push_subscriptions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE admin_push_subscriptions IS 
  'Stores Web Push API subscriptions for admin users to receive KaChing notifications for new orders';

COMMENT ON COLUMN admin_push_subscriptions.subscription IS 
  'Full Web Push subscription object including keys and endpoint';

COMMENT ON COLUMN admin_push_subscriptions.endpoint IS 
  'Push service endpoint URL for quick lookups and duplicate detection';



