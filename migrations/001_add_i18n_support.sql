-- =====================================================
-- MOSE I18N Database Migration
-- Adds multi-language support for editable content
-- =====================================================

-- 1. Add language columns to homepage_settings
ALTER TABLE homepage_settings
ADD COLUMN IF NOT EXISTS hero_badge_text_en TEXT,
ADD COLUMN IF NOT EXISTS hero_title_line1_en TEXT,
ADD COLUMN IF NOT EXISTS hero_title_line2_en TEXT,
ADD COLUMN IF NOT EXISTS hero_subtitle_en TEXT,
ADD COLUMN IF NOT EXISTS hero_cta1_text_en TEXT,
ADD COLUMN IF NOT EXISTS hero_cta2_text_en TEXT,

ADD COLUMN IF NOT EXISTS stats_1_text_en TEXT,
ADD COLUMN IF NOT EXISTS stats_2_text_en TEXT,
ADD COLUMN IF NOT EXISTS stats_3_text_en TEXT,

ADD COLUMN IF NOT EXISTS trust_badge_1_en TEXT,
ADD COLUMN IF NOT EXISTS trust_badge_2_prefix_en TEXT,
ADD COLUMN IF NOT EXISTS trust_badge_3_suffix_en TEXT,
ADD COLUMN IF NOT EXISTS trust_badge_4_en TEXT,

ADD COLUMN IF NOT EXISTS featured_label_en TEXT,
ADD COLUMN IF NOT EXISTS featured_title_en TEXT,
ADD COLUMN IF NOT EXISTS featured_description_en TEXT,

ADD COLUMN IF NOT EXISTS categories_title_en TEXT,
ADD COLUMN IF NOT EXISTS categories_description_en TEXT,

ADD COLUMN IF NOT EXISTS story_badge_en TEXT,
ADD COLUMN IF NOT EXISTS story_title_line1_en TEXT,
ADD COLUMN IF NOT EXISTS story_title_line2_en TEXT,
ADD COLUMN IF NOT EXISTS story_paragraph1_en TEXT,
ADD COLUMN IF NOT EXISTS story_paragraph2_en TEXT,
ADD COLUMN IF NOT EXISTS story_stat1_label_en TEXT,
ADD COLUMN IF NOT EXISTS story_stat1_sublabel_en TEXT,
ADD COLUMN IF NOT EXISTS story_stat2_label_en TEXT,
ADD COLUMN IF NOT EXISTS story_stat2_sublabel_en TEXT,
ADD COLUMN IF NOT EXISTS story_stat3_label_en TEXT,
ADD COLUMN IF NOT EXISTS story_stat3_sublabel_en TEXT,
ADD COLUMN IF NOT EXISTS story_cta_text_en TEXT,

ADD COLUMN IF NOT EXISTS newsletter_title_en TEXT,
ADD COLUMN IF NOT EXISTS newsletter_description1_en TEXT,
ADD COLUMN IF NOT EXISTS newsletter_description2_en TEXT,
ADD COLUMN IF NOT EXISTS newsletter_input_placeholder_en TEXT,
ADD COLUMN IF NOT EXISTS newsletter_button_text_en TEXT,
ADD COLUMN IF NOT EXISTS newsletter_trust_text_en TEXT;

-- 2. Rename existing columns to have _nl suffix for consistency
-- (We'll keep backward compatibility by keeping both for now)
-- The Dutch content stays in the original columns

-- 3. Add default English translations (you can update these later in admin)
UPDATE homepage_settings SET
  hero_badge_text_en = 'Made in Groningen',
  hero_title_line1_en = 'NO NONSENSE.',
  hero_title_line2_en = 'PURE CHARACTER.',
  hero_subtitle_en = 'Locally made. Quality that lasts.',
  hero_cta1_text_en = 'Shop MOSE',
  hero_cta2_text_en = 'View Lookbook',
  
  stats_1_text_en = 'Locally produced',
  stats_2_text_en = 'Days return',
  stats_3_text_en = 'Premium quality',
  
  trust_badge_1_en = 'Locally made',
  trust_badge_2_prefix_en = 'Free shipping from',
  trust_badge_3_suffix_en = 'days return',
  trust_badge_4_en = 'Secure payment',
  
  featured_label_en = 'Bestsellers',
  featured_title_en = 'ESSENTIALS THAT LAST',
  featured_description_en = 'No-nonsense basics that last for years',
  
  categories_title_en = 'SHOP BY CATEGORY',
  categories_description_en = 'Discover our collection',
  
  story_badge_en = 'Our Story',
  story_title_line1_en = 'MADE IN',
  story_title_line2_en = 'GRONINGEN',
  story_paragraph1_en = 'No nonsense. Just character. We make clothing that lasts, locally produced without compromising on quality.',
  story_paragraph2_en = 'Premium basics with soul. Built for real life.',
  story_stat1_label_en = '100% Local',
  story_stat1_sublabel_en = 'Made in NL',
  story_stat2_label_en = '14 Days',
  story_stat2_sublabel_en = 'Returns',
  story_stat3_label_en = 'Premium',
  story_stat3_sublabel_en = 'Materials',
  story_cta_text_en = 'Read our story',
  
  newsletter_title_en = 'JOIN THE PACK',
  newsletter_description1_en = 'News about drops, restocks and the workshop.',
  newsletter_description2_en = 'No spam — just MOSE.',
  newsletter_input_placeholder_en = 'Your email address',
  newsletter_button_text_en = 'Join now',
  newsletter_trust_text_en = 'We respect your privacy. No spam, unsubscribe anytime.'
WHERE id = (SELECT id FROM homepage_settings LIMIT 1);

-- 4. Add language columns to site_settings if needed
-- (Add more tables as needed for other editable content)

-- 5. Add language columns to products table for descriptions
ALTER TABLE products
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS short_description_en TEXT;

-- 6. Add language columns to categories table
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS name_en VARCHAR(255),
ADD COLUMN IF NOT EXISTS description_en TEXT;

-- =====================================================
-- NOTES:
-- 1. Original columns (hero_badge_text, etc) remain for Dutch content
-- 2. New _en columns added for English content
-- 3. Application code should check locale and use appropriate column
-- 4. You can add more languages by adding _de, _fr columns etc.
-- 5. Remember to update the admin panel to edit both languages
-- =====================================================


