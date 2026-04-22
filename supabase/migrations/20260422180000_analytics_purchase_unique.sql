-- Defense-in-depth for the Live Event Feed: even if the server-side dedupe
-- in /api/analytics/track loses a race, the database itself must refuse a
-- second purchase event for the same order_id. The API route catches the
-- resulting 23505 (unique_violation) and returns a benign "deduped" success
-- so the client never sees an error.
--
-- Partial + expression index: only constrains purchase events that actually
-- carry an order_id, leaving every other event_name unaffected.

CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_purchase_order_unique
  ON analytics_events ((event_properties->>'order_id'))
  WHERE event_name = 'purchase'
    AND (event_properties->>'order_id') IS NOT NULL;

COMMENT ON INDEX analytics_events_purchase_order_unique IS
  'Ensures a single purchase event per order_id so refresh/Strict-Mode/back-nav cannot produce phantom purchases in the Live Event Feed.';
