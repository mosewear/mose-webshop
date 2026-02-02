-- 🎯 FACEBOOK PIXEL EVENT CHECKER
-- Check welke events getrackt worden in de analytics table

-- 1️⃣ Overzicht van alle getrackte events (laatste 30 dagen)
SELECT 
  event_name,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY event_name
ORDER BY event_count DESC;

-- 2️⃣ Conversion Funnel: Hoeveel mensen gaan van AddToCart → InitiateCheckout → Purchase?
WITH funnel AS (
  SELECT
    COUNT(DISTINCT CASE WHEN event_name = 'add_to_cart' THEN session_id END) as add_to_cart_sessions,
    COUNT(DISTINCT CASE WHEN event_name = 'checkout_started' THEN session_id END) as checkout_started_sessions,
    COUNT(DISTINCT CASE WHEN event_name = 'purchase' THEN session_id END) as purchase_sessions
  FROM analytics_events
  WHERE created_at > NOW() - INTERVAL '30 days'
)
SELECT 
  add_to_cart_sessions,
  checkout_started_sessions,
  purchase_sessions,
  ROUND((checkout_started_sessions::NUMERIC / NULLIF(add_to_cart_sessions, 0)) * 100, 2) as cart_to_checkout_rate,
  ROUND((purchase_sessions::NUMERIC / NULLIF(checkout_started_sessions, 0)) * 100, 2) as checkout_to_purchase_rate,
  ROUND((purchase_sessions::NUMERIC / NULLIF(add_to_cart_sessions, 0)) * 100, 2) as overall_conversion_rate
FROM funnel;

-- 3️⃣ Recent AddToCart events (laatste 50)
SELECT 
  created_at,
  user_id,
  session_id,
  properties->>'product_name' as product,
  properties->>'value' as value,
  properties->>'quantity' as quantity
FROM analytics_events
WHERE event_name = 'add_to_cart'
ORDER BY created_at DESC
LIMIT 50;

-- 4️⃣ Recent checkout_started events
SELECT 
  created_at,
  user_id,
  session_id,
  properties->>'items_count' as items,
  properties->>'value' as total_value
FROM analytics_events
WHERE event_name = 'checkout_started'
ORDER BY created_at DESC
LIMIT 20;

-- 5️⃣ Sessions met AddToCart maar geen checkout_started (= mensen die product toevoegen maar niet naar checkout gaan)
SELECT DISTINCT
  atc.session_id,
  atc.created_at as added_to_cart_at,
  atc.properties->>'product_name' as product,
  atc.properties->>'value' as cart_value
FROM analytics_events atc
WHERE 
  atc.event_name = 'add_to_cart'
  AND atc.created_at > NOW() - INTERVAL '7 days'
  AND NOT EXISTS (
    SELECT 1 FROM analytics_events cs
    WHERE cs.session_id = atc.session_id
    AND cs.event_name = 'checkout_started'
  )
ORDER BY atc.created_at DESC
LIMIT 30;





