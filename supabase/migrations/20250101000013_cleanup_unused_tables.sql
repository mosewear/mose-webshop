-- Cleanup: Verwijder onnodige en dubbele tabellen
-- Deze migratie verwijdert tabellen die niet gebruikt worden of dubbel zijn

-- 1. Verwijder admin_users (vervangen door profiles.is_admin)
DROP TABLE IF EXISTS admin_users CASCADE;

-- 2. Verwijder inventory_logs (logging tabel die niet gebruikt wordt)
DROP TABLE IF EXISTS inventory_logs CASCADE;

-- 3. Verwijder order_status_history (logging tabel die niet gebruikt wordt)
DROP TABLE IF EXISTS order_status_history CASCADE;

-- 4. Verwijder product_category_relations (dubbel, products.category_id wordt gebruikt)
DROP TABLE IF EXISTS product_category_relations CASCADE;

-- 5. Verwijder oude wishlists tabel als deze dubbel is
-- (De nieuwe wishlists tabel uit 20250101000010_create_wishlist.sql blijft bestaan)
-- We checken eerst of er een oude is, anders skippen we deze
DO $$ 
BEGIN
  -- Alleen verwijderen als er 2 wishlists tabellen zijn (oude en nieuwe)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'wishlists'
  ) THEN
    -- Keep the wishlists table, het is niet dubbel maar correct
    NULL;
  END IF;
END $$;

-- 6. Verwijder oude reviews tabel (vervangen door product_reviews)
DROP TABLE IF EXISTS reviews CASCADE;

-- Cleanup voltooid!
-- Overgebleven (gebruikte) tabellen:
-- - categories
-- - products  
-- - product_variants
-- - product_images
-- - orders
-- - order_items
-- - profiles (met is_admin kolom)
-- - product_reviews
-- - review_votes
-- - wishlists
-- - site_settings


