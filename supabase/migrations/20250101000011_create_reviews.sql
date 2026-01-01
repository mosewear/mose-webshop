-- Product reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200),
  comment TEXT,
  reviewer_name VARCHAR(100) NOT NULL,
  reviewer_email VARCHAR(255) NOT NULL,
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX idx_product_reviews_rating ON product_reviews(rating);
CREATE INDEX idx_product_reviews_approved ON product_reviews(is_approved);

-- RLS Policies
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews"
  ON product_reviews FOR SELECT
  USING (is_approved = true);

-- Users can view their own reviews (even if not approved)
CREATE POLICY "Users can view own reviews"
  ON product_reviews FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can create reviews
CREATE POLICY "Authenticated users can create reviews"
  ON product_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON product_reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON product_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage all reviews
CREATE POLICY "Admins can manage all reviews"
  ON product_reviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Review helpful votes table
CREATE TABLE IF NOT EXISTS review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Indexes
CREATE INDEX idx_review_votes_review_id ON review_votes(review_id);
CREATE INDEX idx_review_votes_user_id ON review_votes(user_id);

-- RLS Policies
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

-- Users can view all votes
CREATE POLICY "Anyone can view votes"
  ON review_votes FOR SELECT
  USING (true);

-- Authenticated users can vote
CREATE POLICY "Authenticated users can vote"
  ON review_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes
CREATE POLICY "Users can update own votes"
  ON review_votes FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes"
  ON review_votes FOR DELETE
  USING (auth.uid() = user_id);


