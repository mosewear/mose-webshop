-- Loyalty points balance per user
CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  points_balance INT NOT NULL DEFAULT 0,
  lifetime_points INT NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_email ON loyalty_points(email);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user_id ON loyalty_points(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_tier ON loyalty_points(tier);

ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;

-- Users can read their own loyalty data
CREATE POLICY "Users can read own loyalty" ON loyalty_points
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Only service role / admins can modify
CREATE POLICY "Admins can manage loyalty" ON loyalty_points
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Loyalty transactions history
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'adjusted', 'expired')),
  points INT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  order_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_email ON loyalty_transactions(email);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_order_id ON loyalty_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at ON loyalty_transactions(created_at DESC);

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own transactions
CREATE POLICY "Users can read own transactions" ON loyalty_transactions
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Only service role / admins can insert/modify
CREATE POLICY "Admins can manage transactions" ON loyalty_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Function to award loyalty points after purchase
CREATE OR REPLACE FUNCTION award_loyalty_points(
  p_email TEXT,
  p_user_id UUID,
  p_order_id UUID,
  p_order_total NUMERIC
) RETURNS JSON AS $$
DECLARE
  v_points INT;
  v_record loyalty_points%ROWTYPE;
  v_new_tier TEXT;
BEGIN
  -- 1 point per euro spent
  v_points := FLOOR(p_order_total);
  
  IF v_points <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'No points to award');
  END IF;

  -- Upsert loyalty record
  INSERT INTO loyalty_points (email, user_id, points_balance, lifetime_points, tier)
  VALUES (p_email, p_user_id, v_points, v_points, 'bronze')
  ON CONFLICT (email) DO UPDATE SET
    points_balance = loyalty_points.points_balance + v_points,
    lifetime_points = loyalty_points.lifetime_points + v_points,
    user_id = COALESCE(EXCLUDED.user_id, loyalty_points.user_id),
    updated_at = now()
  RETURNING * INTO v_record;

  -- Determine tier based on lifetime points
  IF v_record.lifetime_points >= 1000 THEN
    v_new_tier := 'gold';
  ELSIF v_record.lifetime_points >= 500 THEN
    v_new_tier := 'silver';
  ELSE
    v_new_tier := 'bronze';
  END IF;

  -- Update tier if changed
  IF v_new_tier != v_record.tier THEN
    UPDATE loyalty_points SET tier = v_new_tier, updated_at = now() WHERE id = v_record.id;
  END IF;

  -- Log transaction
  INSERT INTO loyalty_transactions (email, user_id, type, points, description, order_id)
  VALUES (p_email, p_user_id, 'earned', v_points, 'Punten verdiend bij bestelling', p_order_id);

  RETURN json_build_object(
    'success', true,
    'points_awarded', v_points,
    'new_balance', v_record.points_balance,
    'new_tier', v_new_tier
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION award_loyalty_points TO service_role;
