-- =====================================================
-- FIX: EMAIL LOGGING RLS POLICY
-- =====================================================
-- 
-- Problem: The INSERT policy only allows authenticated admins,
-- but email logging happens from:
-- 1. Stripe webhooks (service role)
-- 2. Server-side email functions (service role)
-- 
-- Solution: Update policy to allow service role operations
-- while keeping admin UI access secure.
--

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Admins can insert order emails" ON order_emails;

-- Create new INSERT policy that allows:
-- 1. Service role operations (for system email logging)
-- 2. Authenticated admins (for manual operations via UI)
CREATE POLICY "Service role and admins can insert order emails"
  ON order_emails
  FOR INSERT
  WITH CHECK (
    -- Allow if using service role (bypasses this check anyway, but explicit)
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Allow authenticated admin users
    (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
    )
  );

-- Verify RLS is still enabled
ALTER TABLE order_emails ENABLE ROW LEVEL SECURITY;

-- Add comment for future reference
COMMENT ON POLICY "Service role and admins can insert order emails" ON order_emails IS 
  'Allows email logging from server-side operations (service role) and admin users via UI. Service role is used by webhooks and email functions.';





