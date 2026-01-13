-- LOOKBOOK SETTINGS TABLE
CREATE TABLE IF NOT EXISTS lookbook_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- HEADER
  header_title TEXT DEFAULT 'LOOKBOOK',
  header_subtitle TEXT DEFAULT 'Winter ''25 / Stoer. Modern. Tijdloos.',
  
  -- HERO SECTION
  hero_image_url TEXT DEFAULT '/hoodieblack.png',
  hero_title TEXT DEFAULT 'WINTER ''25',
  hero_subtitle TEXT DEFAULT 'Premium basics voor echte mannen',
  
  -- SECTION 1: Urban Essentials
  section1_image_url TEXT DEFAULT '/hero_mose.png',
  section1_title TEXT DEFAULT 'URBAN ESSENTIALS',
  section1_text TEXT DEFAULT 'Basics die je elke dag wilt dragen. Onze hoodies en tees zijn gemaakt van premium katoen en lokaal geproduceerd in Groningen. Geen gedoe, gewoon perfecte basics.',
  section1_cta_text TEXT DEFAULT 'Shop Basics',
  section1_cta_link TEXT DEFAULT '/shop',
  
  -- SECTION 2: Clean & Simple
  section2_image_url TEXT DEFAULT '/blacktee.png',
  section2_title TEXT DEFAULT 'CLEAN & SIMPLE',
  section2_text TEXT DEFAULT 'Minimalisme op zijn best. Onze t-shirts zijn tijdloos en veelzijdig. Draag ze solo of layer ze onder een hoodie. Perfect voor elke gelegenheid.',
  section2_cta_text TEXT DEFAULT 'Shop Tees',
  section2_cta_link TEXT DEFAULT '/shop',
  
  -- SECTION 3: Quote Block
  quote_text TEXT DEFAULT 'KLEDING HOEFT NIET INGEWIKKELD TE ZIJN.',
  quote_subtext TEXT DEFAULT 'Goede basics. Perfect gemaakt. Lang houdbaar. Dat is waar we in geloven.',
  
  -- SECTION 4: Triple Split
  triple1_image_url TEXT DEFAULT '/hoodieblack.png',
  triple1_title TEXT DEFAULT 'Oversized Hoodie',
  triple2_image_url TEXT DEFAULT '/hoodie_cap.png',
  triple2_title TEXT DEFAULT 'MOSE Cap',
  triple3_image_url TEXT DEFAULT '/blacktee.png',
  triple3_title TEXT DEFAULT 'Classic Tee',
  
  -- SECTION 5: Wide Lifestyle Photo
  wide_image_url TEXT DEFAULT '/hero_mose.png',
  wide_title TEXT DEFAULT 'SHOP DE VOLLEDIGE COLLECTIE',
  wide_cta_text TEXT DEFAULT 'Naar Shop',
  wide_cta_link TEXT DEFAULT '/shop',
  
  -- SECTION 6: Final Green CTA
  final_cta_title TEXT DEFAULT 'ONTDEK MOSE',
  final_cta_text TEXT DEFAULT 'Lokaal gemaakt in Groningen. Premium kwaliteit. Tijdloos design. Ontdek waarom onze klanten MOSE blijven dragen.',
  final_cta_button_text TEXT DEFAULT 'Shop Nu',
  final_cta_button_link TEXT DEFAULT '/shop',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default data
INSERT INTO lookbook_settings (id)
SELECT uuid_generate_v4()
WHERE NOT EXISTS (SELECT 1 FROM lookbook_settings LIMIT 1);

-- RLS policies
ALTER TABLE lookbook_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read lookbook settings"
ON lookbook_settings FOR SELECT USING (true);

CREATE POLICY "Admin can update lookbook settings"
ON lookbook_settings FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE INDEX IF NOT EXISTS idx_lookbook_settings_updated ON lookbook_settings(updated_at DESC);
