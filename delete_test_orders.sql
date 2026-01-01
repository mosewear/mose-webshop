-- ⚠️ WAARSCHUWING: Dit verwijdert ALLE orders en order items!
-- Gebruik dit ALLEEN in development/test omgeving!

-- Eerst order items verwijderen (vanwege foreign key constraint)
DELETE FROM order_items;

-- Dan orders verwijderen
DELETE FROM orders;

-- Verificatie: toon aantal resterende records
SELECT 
  (SELECT COUNT(*) FROM orders) as orders_count,
  (SELECT COUNT(*) FROM order_items) as order_items_count;
