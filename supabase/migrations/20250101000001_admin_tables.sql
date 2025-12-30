-- Admin Tables & Extensions
-- Uitbreiding op basis schema voor volledige admin functionaliteit

-- Admin Users & Roles
CREATE TYPE admin_role AS ENUM ('admin', 'manager', 'viewer');

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Logs (voor stock mutaties tracking)
CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  change_amount INT NOT NULL, -- +10, -5, etc
  previous_stock INT NOT NULL,
  new_stock INT NOT NULL,
  reason TEXT NOT NULL, -- 'purchase', 'sale', 'return', 'damaged', 'correction'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Status History (track alle status changes)
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site Settings (voor admin configuratie)
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Product Categories (many-to-many relationship)
CREATE TABLE IF NOT EXISTS product_category_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (product_id, category_id)
);

-- Update products table: add more admin fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft'; -- 'draft', 'active', 'archived'
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Update categories table: add more fields
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'; -- 'active', 'inactive'
ALTER TABLE categories ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update orders table: add more tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_logs_variant ON inventory_logs(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created ON inventory_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_product_category_relations_product ON product_category_relations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_category_relations_category ON product_category_relations(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- RLS Policies for Admin Tables

-- Admin Users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin users can view all admin users" ON admin_users FOR SELECT USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('admin', 'manager'))
);
CREATE POLICY "Only admins can manage admin users" ON admin_users FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE role = 'admin')
);

-- Inventory Logs
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all inventory logs" ON inventory_logs FOR SELECT USING (
  auth.uid() IN (SELECT id FROM admin_users)
);
CREATE POLICY "Admins can create inventory logs" ON inventory_logs FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('admin', 'manager'))
);

-- Order Status History
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view order history" ON order_status_history FOR SELECT USING (
  auth.uid() IN (SELECT id FROM admin_users)
);
CREATE POLICY "Admins can create order history" ON order_status_history FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('admin', 'manager'))
);

-- Site Settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view settings" ON site_settings FOR SELECT USING (
  auth.uid() IN (SELECT id FROM admin_users)
);
CREATE POLICY "Admins can manage settings" ON site_settings FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('admin', 'manager'))
);

-- Product Category Relations
ALTER TABLE product_category_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view product category relations" ON product_category_relations FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage product category relations" ON product_category_relations FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('admin', 'manager'))
);

-- Update RLS policies for existing tables to allow admin access

-- Products: Admins can manage all
CREATE POLICY "Admins can manage all products" ON products FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('admin', 'manager'))
);

-- Categories: Admins can manage all
CREATE POLICY "Admins can manage all categories" ON categories FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('admin', 'manager'))
);

-- Product Variants: Admins can manage all
CREATE POLICY "Admins can manage all variants" ON product_variants FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('admin', 'manager'))
);

-- Product Images: Admins can manage all
CREATE POLICY "Admins can manage all images" ON product_images FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('admin', 'manager'))
);

-- Orders: Admins can view and manage all
CREATE POLICY "Admins can view all orders" ON orders FOR SELECT USING (
  auth.uid() IN (SELECT id FROM admin_users)
);
CREATE POLICY "Admins can update orders" ON orders FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('admin', 'manager'))
);

-- Insert default site settings
INSERT INTO site_settings (key, value, description) VALUES
  ('shipping_free_threshold', '"50"'::jsonb, 'Free shipping threshold in euros'),
  ('shipping_cost', '"4.95"'::jsonb, 'Standard shipping cost in euros'),
  ('tax_rate', '"21"'::jsonb, 'VAT percentage'),
  ('processing_time', '"1-2 werkdagen"'::jsonb, 'Order processing time'),
  ('currency', '"EUR"'::jsonb, 'Site currency'),
  ('site_name', '"MOSE Wear"'::jsonb, 'Site name'),
  ('contact_email', '"info@mosewear.nl"'::jsonb, 'Contact email')
ON CONFLICT (key) DO NOTHING;

-- Functions for common admin operations

-- Function: Update product stock with logging
CREATE OR REPLACE FUNCTION update_product_stock(
  p_variant_id UUID,
  p_change_amount INT,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL,
  p_admin_user_id UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_current_stock INT;
  v_new_stock INT;
BEGIN
  -- Get current stock
  SELECT stock_quantity INTO v_current_stock
  FROM product_variants
  WHERE id = p_variant_id;

  -- Calculate new stock
  v_new_stock := v_current_stock + p_change_amount;
  
  -- Ensure stock doesn't go negative
  IF v_new_stock < 0 THEN
    v_new_stock := 0;
  END IF;

  -- Update stock
  UPDATE product_variants
  SET stock_quantity = v_new_stock,
      updated_at = NOW()
  WHERE id = p_variant_id;

  -- Log the change
  INSERT INTO inventory_logs (
    variant_id,
    admin_user_id,
    change_amount,
    previous_stock,
    new_stock,
    reason,
    notes
  ) VALUES (
    p_variant_id,
    p_admin_user_id,
    p_change_amount,
    v_current_stock,
    v_new_stock,
    p_reason,
    p_notes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update order status with logging
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_notes TEXT DEFAULT NULL,
  p_admin_user_id UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  -- Get current status
  SELECT status INTO v_current_status
  FROM orders
  WHERE id = p_order_id;

  -- Update order status
  UPDATE orders
  SET status = p_new_status,
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Log the change
  INSERT INTO order_status_history (
    order_id,
    admin_user_id,
    from_status,
    to_status,
    notes
  ) VALUES (
    p_order_id,
    p_admin_user_id,
    v_current_status,
    p_new_status,
    p_notes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

