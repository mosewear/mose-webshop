-- =====================================================
-- ANNOUNCEMENT BANNER SYSTEM
-- =====================================================
-- Marketing banner met auto-rotating messages

-- Main banner configuration
CREATE TABLE IF NOT EXISTS announcement_banner (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  rotation_interval INT DEFAULT 5, -- seconds
  dismissable BOOLEAN DEFAULT true,
  dismiss_cookie_days INT DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual announcement messages
CREATE TABLE IF NOT EXISTS announcement_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id UUID REFERENCES announcement_banner(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  link_url TEXT,
  cta_text TEXT,
  icon TEXT, -- emoji or lucide icon name
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcement_messages_banner_id 
  ON announcement_messages(banner_id);

CREATE INDEX IF NOT EXISTS idx_announcement_messages_active 
  ON announcement_messages(is_active, sort_order);

-- RLS Policies
ALTER TABLE announcement_banner ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_messages ENABLE ROW LEVEL SECURITY;

-- Public can view active banners
CREATE POLICY "Anyone can view active banners"
  ON announcement_banner
  FOR SELECT
  USING (enabled = true);

CREATE POLICY "Anyone can view active messages"
  ON announcement_messages
  FOR SELECT
  USING (is_active = true);

-- Admins can manage everything
CREATE POLICY "Admins can manage banners"
  ON announcement_banner
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage messages"
  ON announcement_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Insert default banner configuration
INSERT INTO announcement_banner (id, enabled, rotation_interval, dismissable, dismiss_cookie_days)
VALUES ('00000000-0000-0000-0000-000000000001', false, 5, true, 7)
ON CONFLICT (id) DO NOTHING;

-- Insert example messages
INSERT INTO announcement_messages (banner_id, text, link_url, cta_text, icon, is_active, sort_order)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'GRATIS VERZENDING BOVEN €150', '/verzending-info', 'SHOP NU', '🎉', false, 1),
  ('00000000-0000-0000-0000-000000000001', 'NIEUWE COLLECTIE LIVE', '/shop', 'BEKIJK ALLES', '⚡', false, 2),
  ('00000000-0000-0000-0000-000000000001', '30 DAGEN RETOURRECHT', '/returns', 'MEER INFO', '📦', false, 3)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE announcement_banner IS 
  'Marketing banner configuration voor auto-rotating announcement bar';

COMMENT ON TABLE announcement_messages IS 
  'Individual messages die in de announcement bar roteren';

COMMENT ON COLUMN announcement_messages.icon IS 
  'Emoji (bijv. 🎉) of Lucide icon naam (bijv. gift)';

