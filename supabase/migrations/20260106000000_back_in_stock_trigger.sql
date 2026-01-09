-- Enable pg_net extension for HTTP requests from PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to check and process back-in-stock notifications
-- This function is called by the trigger after stock updates
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

-- Create trigger on product_variants table
DROP TRIGGER IF EXISTS trigger_check_back_in_stock ON product_variants;
CREATE TRIGGER trigger_check_back_in_stock
  AFTER UPDATE OF stock_quantity, is_available ON product_variants
  FOR EACH ROW
  WHEN (NEW.stock_quantity > 0 AND NEW.is_available = TRUE AND 
        (OLD.stock_quantity = 0 OR OLD.is_available = FALSE))
  EXECUTE FUNCTION check_back_in_stock_notifications();

-- Comment
COMMENT ON FUNCTION check_back_in_stock_notifications() IS 'Checks for back-in-stock notifications when stock is updated and queues them for email processing';
COMMENT ON TRIGGER trigger_check_back_in_stock ON product_variants IS 'Triggers back-in-stock notification check when stock becomes available';


