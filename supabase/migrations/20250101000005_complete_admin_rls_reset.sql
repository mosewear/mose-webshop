-- COMPLETE RESET van admin_users RLS policies
-- Disable RLS tijdelijk
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- Drop ALLE bestaande policies (geforceerd)
DO $$ 
DECLARE 
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'admin_users'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON admin_users';
  END LOOP;
END $$;

-- Drop oude helper functie als die bestaat
DROP FUNCTION IF EXISTS is_admin(UUID);

-- Maak nieuwe helper functie (SECURITY DEFINER = bypass RLS)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

-- Re-enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- NIEUWE POLICIES - Super simpel, geen recursie mogelijk
-- 1. Authenticated users kunnen hun eigen record lezen (geen admin check!)
CREATE POLICY "auth_users_read_own_admin_status"
  ON admin_users 
  FOR SELECT
  USING (auth.uid() = id);

-- 2. Alleen bestaande admins kunnen nieuwe admins aanmaken
CREATE POLICY "only_admins_insert"
  ON admin_users 
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Alleen bestaande admins kunnen admin records updaten
CREATE POLICY "only_admins_update"
  ON admin_users 
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Alleen bestaande admins kunnen admin records verwijderen
CREATE POLICY "only_admins_delete"
  ON admin_users 
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Voeg direct de admin user toe (nu RLS disabled is voor deze sessie)
INSERT INTO admin_users (id, role) 
VALUES ('8d281470-b405-4685-9c29-5d12966185a0', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Verify de insert
SELECT id, role, created_at 
FROM admin_users 
WHERE id = '8d281470-b405-4685-9c29-5d12966185a0';

