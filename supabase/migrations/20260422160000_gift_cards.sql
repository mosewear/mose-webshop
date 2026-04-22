-- =====================================================
-- GIFT CARDS (CADEAUBONNEN)
-- =====================================================
-- Gift cards are balance-based bearer instruments. A purchased or
-- admin-issued card has an initial amount, current balance, optional
-- expiry date and can be partially redeemed across multiple orders.
--
-- Products with `is_gift_card = true` represent the item customers can
-- buy in the shop. Denomination variants are stored as regular
-- `product_variants` rows (size = "€50" label, base_price + price_adjustment
-- = amount). Optionally the product can allow a free-form amount.
-- =====================================================

-- ---------- products: flags ----------
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_gift_card BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS allows_custom_amount BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gift_card_min_amount NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS gift_card_max_amount NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS gift_card_default_validity_months INT;

CREATE INDEX IF NOT EXISTS idx_products_is_gift_card
  ON products(is_gift_card)
  WHERE is_gift_card = TRUE;

-- ---------- gift_cards ----------
CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL UNIQUE,
  code_last4 TEXT NOT NULL,
  initial_amount NUMERIC(10,2) NOT NULL CHECK (initial_amount > 0),
  balance NUMERIC(10,2) NOT NULL CHECK (balance >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'depleted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'purchase'
    CHECK (source IN ('purchase', 'admin', 'refund')),
  purchased_by_email TEXT,
  purchased_by_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  recipient_email TEXT,
  recipient_name TEXT,
  sender_name TEXT,
  personal_message TEXT,
  scheduled_send_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  delivery_attempts INT NOT NULL DEFAULT 0,
  last_delivery_error TEXT,
  -- Plaintext code kept ONLY while a scheduled delivery is still pending,
  -- so the cron can send the email once `scheduled_send_at` elapses. It is
  -- cleared the moment delivery succeeds (or when the bon is cancelled).
  pending_delivery_code TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_expires_at ON gift_cards(expires_at);
CREATE INDEX IF NOT EXISTS idx_gift_cards_recipient_email ON gift_cards(recipient_email);
CREATE INDEX IF NOT EXISTS idx_gift_cards_purchased_by_email ON gift_cards(purchased_by_email);
CREATE INDEX IF NOT EXISTS idx_gift_cards_order ON gift_cards(purchased_by_order_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_scheduled_send
  ON gift_cards(scheduled_send_at)
  WHERE delivered_at IS NULL AND scheduled_send_at IS NOT NULL;

-- ---------- gift_card_redemptions ----------
CREATE TABLE IF NOT EXISTS gift_card_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES gift_cards(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'committed', 'reversed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  committed_at TIMESTAMPTZ,
  reversed_at TIMESTAMPTZ,
  UNIQUE(gift_card_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_gift_card_redemptions_card
  ON gift_card_redemptions(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_redemptions_order
  ON gift_card_redemptions(order_id);

-- ---------- orders: gift card tracking ----------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS gift_card_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gift_card_codes TEXT[],
  ADD COLUMN IF NOT EXISTS is_digital_only BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gift_cards_issued_at TIMESTAMPTZ;

-- ---------- order_items: gift card metadata ----------
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS is_gift_card BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gift_card_metadata JSONB;

COMMENT ON COLUMN order_items.gift_card_metadata IS
  'Recipient/sender info for gift-card lines (name, email, message, scheduled_send_at, amount).';

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_gift_card_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS gift_cards_updated_at_trigger ON gift_cards;
CREATE TRIGGER gift_cards_updated_at_trigger
  BEFORE UPDATE ON gift_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_gift_card_timestamp();

-- =====================================================
-- ATOMIC BALANCE OPERATIONS
-- =====================================================

-- Reserve an amount on a gift card for an order. Creates a
-- gift_card_redemptions row with status='reserved' and decrements the
-- card's balance atomically. Returns the redemption id.
--
-- Idempotent: re-calling with the same (card_id, order_id) overwrites
-- the existing reserved row if the requested amount changed.
CREATE OR REPLACE FUNCTION reserve_gift_card_balance(
  p_card_id UUID,
  p_order_id UUID,
  p_amount NUMERIC
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card RECORD;
  v_existing RECORD;
  v_delta NUMERIC;
  v_redemption_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  SELECT id, balance, status, expires_at
    INTO v_card
    FROM gift_cards
    WHERE id = p_card_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'gift card not found';
  END IF;

  IF v_card.status <> 'active' THEN
    RAISE EXCEPTION 'gift card not active (status=%)', v_card.status;
  END IF;

  IF v_card.expires_at IS NOT NULL AND v_card.expires_at < NOW() THEN
    UPDATE gift_cards SET status = 'expired' WHERE id = p_card_id;
    RAISE EXCEPTION 'gift card expired';
  END IF;

  SELECT id, amount, status
    INTO v_existing
    FROM gift_card_redemptions
    WHERE gift_card_id = p_card_id AND order_id = p_order_id
    FOR UPDATE;

  IF FOUND AND v_existing.status = 'reversed' THEN
    -- Reopen a reversed reservation
    v_delta := p_amount;
    IF v_card.balance < v_delta THEN
      RAISE EXCEPTION 'insufficient balance (have %, need %)', v_card.balance, v_delta;
    END IF;

    UPDATE gift_card_redemptions
      SET amount = p_amount,
          status = 'reserved',
          reversed_at = NULL
      WHERE id = v_existing.id;

    UPDATE gift_cards
      SET balance = balance - v_delta
      WHERE id = p_card_id;

    RETURN v_existing.id;
  END IF;

  IF FOUND AND v_existing.status = 'reserved' THEN
    v_delta := p_amount - v_existing.amount;
    IF v_delta > 0 AND v_card.balance < v_delta THEN
      RAISE EXCEPTION 'insufficient balance (have %, need %)', v_card.balance, v_delta;
    END IF;

    UPDATE gift_card_redemptions
      SET amount = p_amount
      WHERE id = v_existing.id;

    UPDATE gift_cards
      SET balance = balance - v_delta
      WHERE id = p_card_id;

    RETURN v_existing.id;
  END IF;

  IF FOUND AND v_existing.status = 'committed' THEN
    RAISE EXCEPTION 'redemption already committed for this order';
  END IF;

  -- New reservation
  IF v_card.balance < p_amount THEN
    RAISE EXCEPTION 'insufficient balance (have %, need %)', v_card.balance, p_amount;
  END IF;

  INSERT INTO gift_card_redemptions(gift_card_id, order_id, amount, status)
    VALUES (p_card_id, p_order_id, p_amount, 'reserved')
    RETURNING id INTO v_redemption_id;

  UPDATE gift_cards
    SET balance = balance - p_amount
    WHERE id = p_card_id;

  RETURN v_redemption_id;
END;
$$;

-- Commit all reserved redemptions for an order (after successful payment).
-- Marks them as committed, re-evaluates card status (active/depleted).
CREATE OR REPLACE FUNCTION commit_gift_card_redemptions_for_order(
  p_order_id UUID
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, gift_card_id
    FROM gift_card_redemptions
    WHERE order_id = p_order_id AND status = 'reserved'
    FOR UPDATE
  LOOP
    UPDATE gift_card_redemptions
      SET status = 'committed',
          committed_at = NOW()
      WHERE id = r.id;

    UPDATE gift_cards
      SET status = CASE WHEN balance <= 0 THEN 'depleted' ELSE status END
      WHERE id = r.gift_card_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Reverse all reserved OR committed redemptions for an order (when a
-- pending order is cancelled or a paid order is fully refunded).
-- Restores balance and sets status='reversed'.
CREATE OR REPLACE FUNCTION reverse_gift_card_redemptions_for_order(
  p_order_id UUID
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, gift_card_id, amount, status
    FROM gift_card_redemptions
    WHERE order_id = p_order_id AND status IN ('reserved', 'committed')
    FOR UPDATE
  LOOP
    UPDATE gift_card_redemptions
      SET status = 'reversed',
          reversed_at = NOW()
      WHERE id = r.id;

    UPDATE gift_cards
      SET balance = balance + r.amount,
          status = CASE
            WHEN status IN ('depleted', 'cancelled') AND (balance + r.amount) > 0 THEN 'active'
            ELSE status
          END
      WHERE id = r.gift_card_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_card_redemptions ENABLE ROW LEVEL SECURITY;

-- Admins can view all gift cards
CREATE POLICY "Admins can view all gift cards"
  ON gift_cards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage gift cards"
  ON gift_cards FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Service role bypass
CREATE POLICY "Service role full access gift cards"
  ON gift_cards FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Redemptions: admin + service role only
CREATE POLICY "Admins view gift card redemptions"
  ON gift_card_redemptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Service role full access redemptions"
  ON gift_card_redemptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE gift_cards IS 'Cadeaubonnen — balance-based bearer instruments';
COMMENT ON COLUMN gift_cards.code_hash IS 'SHA-256 hex hash of the plaintext code (never stored plainly)';
COMMENT ON COLUMN gift_cards.code_last4 IS 'Last 4 characters of the plaintext code for admin display';
COMMENT ON COLUMN gift_cards.balance IS 'Remaining spendable amount in currency';
COMMENT ON COLUMN gift_cards.status IS 'active | depleted | expired | cancelled';
COMMENT ON COLUMN orders.gift_card_discount IS 'Total euros covered by redeemed gift cards on this order';
COMMENT ON COLUMN orders.gift_card_codes IS 'Masked codes applied to this order (for admin visibility)';
COMMENT ON COLUMN orders.is_digital_only IS 'TRUE when every order_item is a digital product (e.g. gift card)';
COMMENT ON COLUMN orders.gift_cards_issued_at IS 'When gift cards in this order were generated and delivered (idempotency marker)';
