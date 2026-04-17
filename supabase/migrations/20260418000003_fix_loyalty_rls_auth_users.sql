-- Fix "permission denied for table users" on admin loyalty page
-- The original policies queried auth.users directly, which the authenticated
-- role has no SELECT permission on. Use auth.jwt() ->> 'email' instead.

DROP POLICY IF EXISTS "Users can read own loyalty" ON loyalty_points;
DROP POLICY IF EXISTS "Admins can manage loyalty" ON loyalty_points;
DROP POLICY IF EXISTS "Users can read own transactions" ON loyalty_transactions;
DROP POLICY IF EXISTS "Admins can manage transactions" ON loyalty_transactions;

CREATE POLICY "Users can read own loyalty" ON loyalty_points
  FOR SELECT USING (
    email = (auth.jwt() ->> 'email')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can manage loyalty" ON loyalty_points
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can read own transactions" ON loyalty_transactions
  FOR SELECT USING (
    email = (auth.jwt() ->> 'email')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can manage transactions" ON loyalty_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
