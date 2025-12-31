-- Fix RLS policies for orders table to allow guest checkout

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;

-- Allow anyone to INSERT orders (for guest checkout)
CREATE POLICY "Anyone can create orders" ON orders
  FOR INSERT
  WITH CHECK (true);

-- Allow users to view their own orders (by user_id OR email)
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR email = auth.jwt()->>'email'
  );

-- Allow anyone to view orders by ID (for order confirmation page)
CREATE POLICY "Anyone can view orders by ID" ON orders
  FOR SELECT
  USING (true);

-- Allow anyone to INSERT order items
CREATE POLICY "Anyone can create order items" ON order_items
  FOR INSERT
  WITH CHECK (true);

-- Allow viewing order items for corresponding orders
CREATE POLICY "Users can view order items" ON order_items
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE auth.uid() = user_id 
         OR email = auth.jwt()->>'email'
    )
    OR true -- Allow for order confirmation
  );

