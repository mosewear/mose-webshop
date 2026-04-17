-- ============================================================================
-- Loyalty tier discount column + idempotent backfill of historical loyalty
-- ============================================================================
-- 1. Add `loyalty_tier_discount` column to orders so we can store the euro
--    amount of the tier-based discount per order (for audit/reporting).
-- 2. Backfill `loyalty_transactions` + `loyalty_points` for every paid order
--    placed before the loyalty system went live. Idempotent: skips orders
--    that already have a loyalty transaction row.
-- ============================================================================

-- 1. Column on orders -------------------------------------------------------

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS loyalty_tier_discount DECIMAL(10, 2) DEFAULT 0;

COMMENT ON COLUMN orders.loyalty_tier_discount IS
  'Euro amount of the loyalty-tier (Silver/Gold) discount applied to this order.';


-- 2. Backfill loyalty_transactions (1 row per historical paid order) --------
--
-- Rules (mirror the live webhook + src/lib/loyalty.ts):
--   - Only orders with status IN ('paid','processing','shipped','delivered')
--   - Only orders with total > 0
--   - 1 point per whole euro spent (FLOOR(total))
--   - Skip orders that already have a loyalty_transactions row
--
-- This INSERT is safe to re-run; the NOT EXISTS clause makes it idempotent.

INSERT INTO loyalty_transactions (email, user_id, type, points, description, order_id, created_at)
SELECT
  o.email,
  o.user_id,
  'earned'                                   AS type,
  FLOOR(o.total)::INT                        AS points,
  'Backfill: historische bestelling'         AS description,
  o.id                                       AS order_id,
  o.created_at                               AS created_at
FROM orders o
WHERE o.status IN ('paid', 'processing', 'shipped', 'delivered')
  AND o.total > 0
  AND FLOOR(o.total)::INT > 0
  AND NOT EXISTS (
    SELECT 1 FROM loyalty_transactions lt WHERE lt.order_id = o.id
  );


-- 3. Rebuild loyalty_points aggregates from transactions --------------------
--
-- We aggregate ALL 'earned' and 'redeemed' transactions so that running the
-- migration a second time (after new orders) yields the same correct state
-- as the live webhook would produce.

WITH agg AS (
  SELECT
    email,
    -- earned points (positive) minus redeemed points (already stored negative)
    SUM(CASE WHEN type IN ('earned', 'adjusted') AND points > 0 THEN points ELSE 0 END) AS earned_positive,
    SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END)                              AS redeemed_total,
    SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END)                                AS lifetime_earned,
    -- Postgres has no max(uuid); take the first non-null user_id we see.
    (ARRAY_AGG(user_id) FILTER (WHERE user_id IS NOT NULL))[1]                           AS any_user_id
  FROM loyalty_transactions
  GROUP BY email
)
INSERT INTO loyalty_points (email, user_id, points_balance, lifetime_points, tier, created_at, updated_at)
SELECT
  a.email,
  a.any_user_id,
  GREATEST(a.earned_positive + a.redeemed_total, 0) AS points_balance,
  GREATEST(a.lifetime_earned, 0)                    AS lifetime_points,
  CASE
    WHEN GREATEST(a.lifetime_earned, 0) >= 1000 THEN 'gold'
    WHEN GREATEST(a.lifetime_earned, 0) >= 500  THEN 'silver'
    ELSE 'bronze'
  END                                               AS tier,
  now() AS created_at,
  now() AS updated_at
FROM agg a
ON CONFLICT (email) DO UPDATE SET
  points_balance  = EXCLUDED.points_balance,
  lifetime_points = EXCLUDED.lifetime_points,
  tier            = EXCLUDED.tier,
  user_id         = COALESCE(loyalty_points.user_id, EXCLUDED.user_id),
  updated_at      = now();
