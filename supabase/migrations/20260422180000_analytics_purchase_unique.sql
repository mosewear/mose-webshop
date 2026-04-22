-- Defense-in-depth for the Live Event Feed: even if the server-side dedupe
-- in /api/analytics/track loses a race, the database itself must refuse a
-- second purchase event for the same order_id. The API route catches the
-- resulting 23505 (unique_violation) and returns a benign "deduped" success
-- so the client never sees an error.
--
-- Step 1 (cleanup): pre-existing duplicate purchase rows are deleted, keeping
--                   the earliest event per order_id as the canonical one.
--                   This is a no-op on fresh databases.
-- Step 2 (index):   partial + expression index that only constrains purchase
--                   events carrying a non-null order_id, leaving all other
--                   event types unaffected.

-- Step 1: collapse duplicates to the oldest row per order_id.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY event_properties->>'order_id'
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM analytics_events
  WHERE event_name = 'purchase'
    AND (event_properties->>'order_id') IS NOT NULL
)
DELETE FROM analytics_events
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Step 2: enforce one purchase event per order_id going forward.
CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_purchase_order_unique
  ON analytics_events ((event_properties->>'order_id'))
  WHERE event_name = 'purchase'
    AND (event_properties->>'order_id') IS NOT NULL;

COMMENT ON INDEX analytics_events_purchase_order_unique IS
  'Ensures a single purchase event per order_id so refresh/Strict-Mode/back-nav cannot produce phantom purchases in the Live Event Feed.';
