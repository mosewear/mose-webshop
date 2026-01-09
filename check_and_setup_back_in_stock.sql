-- ============================================
-- Back-in-Stock Functionaliteit Setup Script
-- ============================================
-- Dit script checkt of alles bestaat en maakt het aan indien nodig
-- Veilig om meerdere keren uit te voeren (idempotent)

-- ============================================
-- 1. Enable pg_net extension (voor triggers)
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- 2. Create back_in_stock_notifications table
-- ============================================
CREATE TABLE IF NOT EXISTS back_in_stock_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  email TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  notified_at TIMESTAMP WITH TIME ZONE,
  is_notified BOOLEAN DEFAULT FALSE,
  UNIQUE(email, product_id, variant_id)
);

-- ============================================
-- 3. Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_back_in_stock_product 
  ON back_in_stock_notifications(product_id);

CREATE INDEX IF NOT EXISTS idx_back_in_stock_variant 
  ON back_in_stock_notifications(variant_id);

CREATE INDEX IF NOT EXISTS idx_back_in_stock_notified 
  ON back_in_stock_notifications(is_notified) 
  WHERE is_notified = FALSE;

-- ============================================
-- 4. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE back_in_stock_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. Create RLS Policies
-- ============================================

-- Policy: Anyone can create notifications
DROP POLICY IF EXISTS "Anyone can create notifications" ON back_in_stock_notifications;
CREATE POLICY "Anyone can create notifications" 
  ON back_in_stock_notifications
  FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can view all notifications
DROP POLICY IF EXISTS "Admins can view all notifications" ON back_in_stock_notifications;
CREATE POLICY "Admins can view all notifications" 
  ON back_in_stock_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Policy: System can update notifications (for cron job/triggers)
DROP POLICY IF EXISTS "System can update notifications" ON back_in_stock_notifications;
CREATE POLICY "System can update notifications" 
  ON back_in_stock_notifications
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 6. Create trigger function
-- ============================================
CREATE OR REPLACE FUNCTION check_back_in_stock_notifications()
RETURNS TRIGGER AS $$
DECLARE
  site_url TEXT;
  api_url TEXT;
  notification_record RECORD;
  product_record RECORD;
  variant_record RECORD;
  variant_in_stock BOOLEAN;
  any_variant_in_stock BOOLEAN;
BEGIN
  -- Only process if stock_quantity > 0 and is_available = true
  IF NEW.stock_quantity > 0 AND NEW.is_available = TRUE THEN
    
    -- Get site URL from environment (default fallback)
    site_url := COALESCE(
      current_setting('app.site_url', true),
      'https://mosewear.com'
    );
    api_url := site_url || '/api/back-in-stock/process-trigger';
    
    -- Check for notifications for this specific variant
    FOR notification_record IN
      SELECT * FROM back_in_stock_notifications
      WHERE variant_id = NEW.id
        AND is_notified = FALSE
    LOOP
      -- Get product info
      SELECT * INTO product_record
      FROM products
      WHERE id = notification_record.product_id;
      
      -- Skip if product not found
      IF product_record IS NULL THEN
        CONTINUE;
      END IF;
      
      -- Queue notification for processing (HTTP call)
      PERFORM net.http_post(
        url := api_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-Trigger-Source', 'database'
        ),
        body := jsonb_build_object(
          'notification_id', notification_record.id,
          'product_id', notification_record.product_id,
          'variant_id', notification_record.variant_id,
          'email', notification_record.email
        )
      );
    END LOOP;
    
    -- Also check for notifications for the product (without specific variant)
    FOR notification_record IN
      SELECT * FROM back_in_stock_notifications
      WHERE product_id = NEW.product_id
        AND variant_id IS NULL
        AND is_notified = FALSE
    LOOP
      -- Check if any variant is in stock
      SELECT EXISTS(
        SELECT 1 FROM product_variants
        WHERE product_id = NEW.product_id
          AND stock_quantity > 0
          AND is_available = TRUE
      ) INTO any_variant_in_stock;
      
      IF any_variant_in_stock THEN
        -- Queue notification for processing
        PERFORM net.http_post(
          url := api_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'X-Trigger-Source', 'database'
          ),
          body := jsonb_build_object(
            'notification_id', notification_record.id,
            'product_id', notification_record.product_id,
            'variant_id', NULL,
            'email', notification_record.email
          )
        );
      END IF;
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. Create trigger
-- ============================================
DROP TRIGGER IF EXISTS trigger_check_back_in_stock ON product_variants;
CREATE TRIGGER trigger_check_back_in_stock
  AFTER UPDATE OF stock_quantity, is_available ON product_variants
  FOR EACH ROW
  WHEN (NEW.stock_quantity > 0 AND NEW.is_available = TRUE AND 
        (OLD.stock_quantity = 0 OR OLD.is_available = FALSE))
  EXECUTE FUNCTION check_back_in_stock_notifications();

-- ============================================
-- 8. Add comments
-- ============================================
COMMENT ON TABLE back_in_stock_notifications IS 'Stores user requests for back-in-stock notifications.';
COMMENT ON COLUMN back_in_stock_notifications.notified_at IS 'Timestamp when the notification email was sent.';
COMMENT ON FUNCTION check_back_in_stock_notifications() IS 'Checks for back-in-stock notifications when stock is updated and queues them for email processing';
COMMENT ON TRIGGER trigger_check_back_in_stock ON product_variants IS 'Triggers back-in-stock notification check when stock becomes available';

-- ============================================
-- 9. Verification Query (OPTIONEEL - Run deze om te checken)
-- ============================================
-- Run deze queries om te verifiëren dat alles is aangemaakt:

-- Check tabel bestaat
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'back_in_stock_notifications') THEN
    RAISE NOTICE '✅ Tabel back_in_stock_notifications bestaat';
  ELSE
    RAISE EXCEPTION '❌ Tabel back_in_stock_notifications bestaat NIET';
  END IF;
END $$;

-- Check trigger bestaat
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_trigger 
             WHERE tgname = 'trigger_check_back_in_stock') THEN
    RAISE NOTICE '✅ Trigger trigger_check_back_in_stock bestaat';
  ELSE
    RAISE WARNING '⚠️ Trigger trigger_check_back_in_stock bestaat NIET';
  END IF;
END $$;

-- Check functie bestaat
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_proc 
             WHERE proname = 'check_back_in_stock_notifications') THEN
    RAISE NOTICE '✅ Functie check_back_in_stock_notifications bestaat';
  ELSE
    RAISE WARNING '⚠️ Functie check_back_in_stock_notifications bestaat NIET';
  END IF;
END $$;

-- Check pg_net extension
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE '✅ pg_net extension is enabled';
  ELSE
    RAISE WARNING '⚠️ pg_net extension is NIET enabled';
  END IF;
END $$;

-- Check indexes
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_indexes 
             WHERE indexname = 'idx_back_in_stock_product') THEN
    RAISE NOTICE '✅ Index idx_back_in_stock_product bestaat';
  ELSE
    RAISE WARNING '⚠️ Index idx_back_in_stock_product bestaat NIET';
  END IF;
END $$;

-- Check RLS is enabled
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables 
             WHERE schemaname = 'public' 
             AND tablename = 'back_in_stock_notifications'
             AND rowsecurity = true) THEN
    RAISE NOTICE '✅ RLS is enabled op back_in_stock_notifications';
  ELSE
    RAISE WARNING '⚠️ RLS is NIET enabled op back_in_stock_notifications';
  END IF;
END $$;

-- Summary
SELECT 
  'Setup compleet!' as status,
  (SELECT COUNT(*) FROM back_in_stock_notifications) as aantal_notificaties,
  (SELECT COUNT(*) FROM back_in_stock_notifications WHERE is_notified = false) as pending_notificaties;


