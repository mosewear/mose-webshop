-- Fix infinite recursion in admin_users RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all admin users." ON admin_users;
DROP POLICY IF EXISTS "Admins can insert admin users." ON admin_users;
DROP POLICY IF EXISTS "Admins can update admin users." ON admin_users;
DROP POLICY IF EXISTS "Admins can delete admin users." ON admin_users;

-- Create a helper function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New policies that don't cause recursion
-- Allow authenticated users to read their own admin record
CREATE POLICY "Users can read their own admin status"
  ON admin_users FOR SELECT
  USING (auth.uid() = id);

-- Only existing admins can insert new admins (using helper function)
CREATE POLICY "Admins can insert admin users"
  ON admin_users FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Only existing admins can update admin users (using helper function)
CREATE POLICY "Admins can update admin users"
  ON admin_users FOR UPDATE
  USING (is_admin(auth.uid()));

-- Only existing admins can delete admin users (using helper function)
CREATE POLICY "Admins can delete admin users"
  ON admin_users FOR DELETE
  USING (is_admin(auth.uid()));


