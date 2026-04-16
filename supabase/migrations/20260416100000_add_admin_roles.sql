-- Add admin_role column to profiles table for RBAC
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_role TEXT DEFAULT 'viewer';

-- Set existing admins (is_admin = true) to 'admin' role
UPDATE profiles SET admin_role = 'admin' WHERE is_admin = true AND (admin_role IS NULL OR admin_role = 'viewer');
