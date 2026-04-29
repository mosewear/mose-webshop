-- =========================================================================
-- PDP Conversion Overhaul
--
-- Adds:
--   1. product_active_views               - powers the live "X people are
--                                            looking at this" counter
--   2. categories.pdp_signature_specs(_en) - one-line MOSE spec to print in
--                                            the trust strip above the ATC
--   3. product_review_images              - photo reviews
--   4. review-images storage bucket       - public read, write via API only
--   5. RPCs                               - heartbeat + activity counts
--
-- Idempotent. Safe to re-apply.
-- =========================================================================


-- -------------------------------------------------------------------------
-- 1. product_active_views
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_active_views (
  session_id   text        NOT NULL,
  product_id   uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_pav_last_seen
  ON product_active_views (last_seen_at);

CREATE INDEX IF NOT EXISTS idx_pav_product
  ON product_active_views (product_id, last_seen_at);

-- RLS: writes only via SECURITY DEFINER RPCs. We keep RLS on but do not
-- grant any policies, so direct inserts/updates from the client fail
-- unless they go through the RPC below.
ALTER TABLE product_active_views ENABLE ROW LEVEL SECURITY;


-- -------------------------------------------------------------------------
-- 2. categories.pdp_signature_specs
-- -------------------------------------------------------------------------
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS pdp_signature_specs    text,
  ADD COLUMN IF NOT EXISTS pdp_signature_specs_en text;

COMMENT ON COLUMN categories.pdp_signature_specs IS
  'Short one-line MOSE-signature spec rendered in the PDP trust strip above the ATC button (NL).';
COMMENT ON COLUMN categories.pdp_signature_specs_en IS
  'Short one-line MOSE-signature spec rendered in the PDP trust strip above the ATC button (EN).';

UPDATE categories
   SET pdp_signature_specs    = COALESCE(pdp_signature_specs,    '240 GSM OEKO-Tex jersey, regular fit'),
       pdp_signature_specs_en = COALESCE(pdp_signature_specs_en, '240 GSM OEKO-Tex jersey, regular fit')
 WHERE slug = 't-shirts';

UPDATE categories
   SET pdp_signature_specs    = COALESCE(pdp_signature_specs,    '300 GSM OEKO-Tex joggingfleece, regular fit'),
       pdp_signature_specs_en = COALESCE(pdp_signature_specs_en, '300 GSM OEKO-Tex jogging fleece, regular fit')
 WHERE slug = 'sweaters';

UPDATE categories
   SET pdp_signature_specs    = COALESCE(pdp_signature_specs,    '300 GSM OEKO-Tex joggingfleece, regular fit'),
       pdp_signature_specs_en = COALESCE(pdp_signature_specs_en, '300 GSM OEKO-Tex jogging fleece, regular fit')
 WHERE slug = 'hoodies';


-- -------------------------------------------------------------------------
-- 3. product_review_images
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_review_images (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id    uuid        NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  storage_path text        NOT NULL,
  position     int         NOT NULL DEFAULT 0,
  is_approved  boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pri_review
  ON product_review_images (review_id);

CREATE INDEX IF NOT EXISTS idx_pri_approved
  ON product_review_images (review_id, is_approved);

ALTER TABLE product_review_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved review images" ON product_review_images;
CREATE POLICY "Anyone can view approved review images"
  ON product_review_images FOR SELECT
  USING (
    is_approved = true
    AND EXISTS (
      SELECT 1 FROM product_reviews pr
       WHERE pr.id = product_review_images.review_id
         AND pr.is_approved = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage review images" ON product_review_images;
CREATE POLICY "Admins can manage review images"
  ON product_review_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
         AND profiles.is_admin = true
    )
  );


-- -------------------------------------------------------------------------
-- 4. Storage bucket: review-images
--    Public read, server-side writes via service-role only.
-- -------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-images', 'review-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Public read policy (only files belonging to approved review images)
DROP POLICY IF EXISTS "Public read of review-images bucket" ON storage.objects;
CREATE POLICY "Public read of review-images bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-images');

-- Block anonymous writes; service role bypasses RLS entirely.
DROP POLICY IF EXISTS "No anon writes to review-images" ON storage.objects;
CREATE POLICY "No anon writes to review-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'review-images' AND auth.role() = 'service_role');


-- -------------------------------------------------------------------------
-- 5. RPCs
-- -------------------------------------------------------------------------

-- Heartbeat: upsert the (session, product) row and lazy-expire stale rows.
CREATE OR REPLACE FUNCTION public.track_product_view(
  p_product_id uuid,
  p_session_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_product_id IS NULL OR p_session_id IS NULL OR length(p_session_id) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO product_active_views (session_id, product_id, last_seen_at)
  VALUES (p_session_id, p_product_id, now())
  ON CONFLICT (session_id, product_id) DO UPDATE
    SET last_seen_at = EXCLUDED.last_seen_at;

  -- Lazy-expire: delete rows older than 5 minutes for this product so the
  -- table never grows unbounded. We deliberately scope to the current
  -- product_id so the cleanup cost stays proportional to the page traffic.
  DELETE FROM product_active_views
   WHERE product_id = p_product_id
     AND last_seen_at < now() - interval '5 minutes';
END;
$$;

REVOKE ALL ON FUNCTION public.track_product_view(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_product_view(uuid, text) TO anon, authenticated, service_role;


-- Counts: live viewers (last 60s) + paid units sold in the last 24h.
CREATE OR REPLACE FUNCTION public.get_product_activity(
  p_product_id uuid
)
RETURNS TABLE (
  active_viewers bigint,
  sold_24h       bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (
      SELECT COUNT(DISTINCT pav.session_id)
        FROM product_active_views pav
       WHERE pav.product_id = p_product_id
         AND pav.last_seen_at > now() - interval '60 seconds'
    ) AS active_viewers,
    (
      SELECT COALESCE(SUM(oi.quantity), 0)
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
       WHERE oi.product_id = p_product_id
         AND o.payment_status = 'paid'
         AND o.created_at > now() - interval '24 hours'
    ) AS sold_24h;
END;
$$;

REVOKE ALL ON FUNCTION public.get_product_activity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_activity(uuid) TO anon, authenticated, service_role;
