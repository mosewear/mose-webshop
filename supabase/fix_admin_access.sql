-- Fix: Set is_admin to true for the admin user
-- The profiles table uses 'id' (user_id) not 'email'
-- We need to get the user_id from auth.users where email matches

UPDATE profiles 
SET is_admin = true 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'h.schlimback@gmail.com'
);


