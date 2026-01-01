-- COMPLETE FIX VOOR ORDERS RLS
-- Voer dit uit in Supabase SQL Editor

-- Stap 1: Verwijder ALLE bestaande orders policies
DO $$ 
DECLARE 
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'orders'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON orders', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Stap 2: Maak nieuwe simpele policies
CREATE POLICY "admins_full_access" ON orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "users_view_own" ON orders
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "guests_can_insert" ON orders
  FOR INSERT
  WITH CHECK (true);

-- Stap 3: Verifieer
SELECT 'Policies aangemaakt:' as status;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'orders';

-- Stap 4: Test als admin (met jouw user ID)
SET LOCAL jwt.claims.sub = '8d281470-b405-4685-9c29-5d12966185a0';
SELECT COUNT(*) as orders_visible_as_admin FROM orders;

