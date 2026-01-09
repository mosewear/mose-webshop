-- Wishlist table
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Indexes
CREATE INDEX idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX idx_wishlists_product_id ON wishlists(product_id);

-- RLS Policies
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- Users can only view their own wishlist items
CREATE POLICY "Users can view own wishlist items"
  ON wishlists FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add items to their own wishlist
CREATE POLICY "Users can add to own wishlist"
  ON wishlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove items from their own wishlist
CREATE POLICY "Users can remove from own wishlist"
  ON wishlists FOR DELETE
  USING (auth.uid() = user_id);



