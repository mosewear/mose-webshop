-- Create homepage_settings table
CREATE TABLE IF NOT EXISTS homepage_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Hero Section
  hero_badge_text TEXT DEFAULT 'Gemaakt in Groningen',
  hero_title_line1 TEXT DEFAULT 'GEEN POESPAS.',
  hero_title_line2 TEXT DEFAULT 'WEL KARAKTER.',
  hero_subtitle TEXT DEFAULT 'Lokaal gemaakt. Kwaliteit die blijft.',
  hero_cta1_text TEXT DEFAULT 'Shop MOSE',
  hero_cta1_link TEXT DEFAULT '/shop',
  hero_cta2_text TEXT DEFAULT 'Bekijk Lookbook',
  hero_cta2_link TEXT DEFAULT '/lookbook',
  hero_image_url TEXT DEFAULT '/hero_mose.png',
  
  -- Stats Bar
  stats_1_number TEXT DEFAULT '100%',
  stats_1_text TEXT DEFAULT 'Lokaal geproduceerd',
  stats_2_text TEXT DEFAULT 'Dagen retourrecht',
  stats_3_number TEXT DEFAULT '⭐',
  stats_3_text TEXT DEFAULT 'Premium kwaliteit',
  
  -- Trust Badges
  trust_badge_1 TEXT DEFAULT 'Lokaal gemaakt',
  trust_badge_2_prefix TEXT DEFAULT 'Gratis verzending vanaf',
  trust_badge_3_suffix TEXT DEFAULT 'dagen retour',
  trust_badge_4 TEXT DEFAULT 'Veilig betalen',
  
  -- Featured Products
  featured_label TEXT DEFAULT 'Bestsellers',
  featured_title TEXT DEFAULT 'ESSENTIALS DIE BLIJVEN',
  featured_description TEXT DEFAULT 'No-nonsense basics die jarenlang meegaan',
  featured_product_1_id UUID REFERENCES products(id),
  featured_product_2_id UUID REFERENCES products(id),
  featured_product_3_id UUID REFERENCES products(id),
  
  -- Categories
  categories_title TEXT DEFAULT 'SHOP OP CATEGORIE',
  categories_description TEXT DEFAULT 'Ontdek onze collectie',
  category_1_id UUID REFERENCES categories(id),
  category_2_id UUID REFERENCES categories(id),
  category_3_id UUID REFERENCES categories(id),
  category_4_id UUID REFERENCES categories(id),
  
  -- Story Section
  story_badge TEXT DEFAULT 'Ons Verhaal',
  story_title_line1 TEXT DEFAULT 'GEMAAKT IN',
  story_title_line2 TEXT DEFAULT 'GRONINGEN',
  story_paragraph1 TEXT DEFAULT 'Geen poespas. Alleen karakter. We maken kleding die lang meegaat, lokaal geproduceerd zonder compromissen op kwaliteit.',
  story_paragraph2 TEXT DEFAULT 'Premium basics met een ziel. Gebouwd voor het echte leven.',
  story_stat1_label TEXT DEFAULT '100% Lokaal',
  story_stat1_sublabel TEXT DEFAULT 'Made in NL',
  story_stat2_label TEXT DEFAULT '14 Dagen',
  story_stat2_sublabel TEXT DEFAULT 'Retourrecht',
  story_stat3_label TEXT DEFAULT 'Premium',
  story_stat3_sublabel TEXT DEFAULT 'Materialen',
  story_cta_text TEXT DEFAULT 'Lees ons verhaal',
  story_cta_link TEXT DEFAULT '/over-mose',
  story_image_url TEXT DEFAULT '/hoodieblack.png',
  story_founded_year TEXT DEFAULT '2020',
  
  -- Newsletter
  newsletter_title TEXT DEFAULT 'JOIN THE PACK',
  newsletter_description1 TEXT DEFAULT 'Nieuws over drops, restocks en het atelier.',
  newsletter_description2 TEXT DEFAULT 'Geen spam — alleen MOSE.',
  newsletter_input_placeholder TEXT DEFAULT 'Jouw e-mailadres',
  newsletter_button_text TEXT DEFAULT 'Join nu',
  newsletter_trust_text TEXT DEFAULT 'We respecteren je privacy. Geen spam, afmelden kan altijd.',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE homepage_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to homepage_settings"
  ON homepage_settings
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to update (admins only via app logic)
CREATE POLICY "Allow authenticated users to update homepage_settings"
  ON homepage_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default row if not exists
INSERT INTO homepage_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM homepage_settings);

