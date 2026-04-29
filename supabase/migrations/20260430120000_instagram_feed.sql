-- =====================================================
-- INSTAGRAM FEED MODULE
-- Hybrid: Vercel cron synct via Instagram Graph API
-- en upsert in instagram_posts. Admin kan posts pinnen,
-- verbergen of handmatig toevoegen. Storefront leest
-- via SECURITY DEFINER RPC zodat alleen zichtbare
-- display-velden publiek zijn.
-- =====================================================

-- =====================================================
-- 1. instagram_posts (content)
-- =====================================================
CREATE TABLE IF NOT EXISTS instagram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifier (NULL = handmatig toegevoegd door admin)
  instagram_id TEXT UNIQUE,

  -- Content
  permalink     TEXT NOT NULL,
  media_type    TEXT NOT NULL DEFAULT 'IMAGE'
    CHECK (media_type IN ('IMAGE','VIDEO','CAROUSEL_ALBUM')),
  media_url     TEXT NOT NULL,
  thumbnail_url TEXT,
  caption       TEXT,
  caption_en    TEXT,
  like_count    INT,
  taken_at      TIMESTAMPTZ,

  -- Curatie
  is_hidden  BOOLEAN NOT NULL DEFAULT false,
  is_pinned  BOOLEAN NOT NULL DEFAULT false,
  pin_order  INT,

  -- Bron
  source TEXT NOT NULL DEFAULT 'graph'
    CHECK (source IN ('graph','manual')),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT instagram_posts_permalink_format
    CHECK (permalink ~* '^https://(www\.)?instagram\.com/')
);

-- Index voor de display-RPC: filter op is_hidden, sorteer pinned
-- bovenaan, daarna recent.
CREATE INDEX IF NOT EXISTS idx_instagram_posts_display
  ON instagram_posts (
    is_hidden,
    is_pinned DESC,
    pin_order ASC NULLS LAST,
    taken_at  DESC NULLS LAST,
    created_at DESC
  );

CREATE INDEX IF NOT EXISTS idx_instagram_posts_instagram_id
  ON instagram_posts (instagram_id)
  WHERE instagram_id IS NOT NULL;

-- =====================================================
-- 2. instagram_settings (display config, single-row)
-- =====================================================
CREATE TABLE IF NOT EXISTS instagram_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  enabled  BOOLEAN NOT NULL DEFAULT false,
  username TEXT NOT NULL DEFAULT 'mosewearcom',

  section_title_nl    TEXT NOT NULL DEFAULT '@mosewearcom',
  section_title_en    TEXT,
  section_subtitle_nl TEXT NOT NULL DEFAULT 'Zo wordt MOSE in het echt gedragen',
  section_subtitle_en TEXT,

  cta_text_nl TEXT NOT NULL DEFAULT 'Volg ons op Instagram',
  cta_text_en TEXT,
  cta_url     TEXT NOT NULL DEFAULT 'https://www.instagram.com/mosewearcom',

  marquee_speed_seconds INT NOT NULL DEFAULT 60
    CHECK (marquee_speed_seconds BETWEEN 20 AND 240),
  max_posts INT NOT NULL DEFAULT 12
    CHECK (max_posts BETWEEN 4 AND 20),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 3. instagram_credentials (token + sync status)
-- Deze rij bevat geheimen, dus geen public-RLS.
-- =====================================================
CREATE TABLE IF NOT EXISTS instagram_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  long_lived_token    TEXT,
  token_expires_at    TIMESTAMPTZ,
  business_account_id TEXT,

  last_synced_at   TIMESTAMPTZ,
  last_sync_status TEXT
    CHECK (last_sync_status IN ('idle','success','error')),
  last_sync_error  TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 4. RLS
-- =====================================================
ALTER TABLE instagram_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_credentials ENABLE ROW LEVEL SECURITY;

-- Posts: bezoekers krijgen alleen niet-verborgen rijen via de RPC.
-- Direct lezen is uitgeschakeld om gemarkeerde rijen niet te lekken.
CREATE POLICY "Admins can read all instagram_posts"
  ON instagram_posts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert instagram_posts"
  ON instagram_posts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update instagram_posts"
  ON instagram_posts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete instagram_posts"
  ON instagram_posts FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Settings: bezoekers lezen, admins schrijven.
CREATE POLICY "Allow public read access to instagram_settings"
  ON instagram_settings FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins can update instagram_settings"
  ON instagram_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Credentials: alleen admins, geen public.
CREATE POLICY "Admins can read instagram_credentials"
  ON instagram_credentials FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert instagram_credentials"
  ON instagram_credentials FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update instagram_credentials"
  ON instagram_credentials FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- =====================================================
-- 5. Display RPC voor storefront
-- Retourneert settings + max_posts zichtbare posts in
-- de juiste volgorde (gepind eerst, dan recent).
-- =====================================================
CREATE OR REPLACE FUNCTION get_instagram_display_data()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_row instagram_settings%ROWTYPE;
  posts_json   jsonb;
BEGIN
  SELECT * INTO settings_row FROM instagram_settings ORDER BY created_at LIMIT 1;

  IF settings_row.id IS NULL OR settings_row.enabled = false THEN
    RETURN jsonb_build_object(
      'enabled', false,
      'settings', NULL,
      'posts', '[]'::jsonb
    );
  END IF;

  SELECT COALESCE(jsonb_agg(p ORDER BY is_pinned DESC, pin_order ASC NULLS LAST, taken_at DESC NULLS LAST, created_at DESC), '[]'::jsonb)
  INTO posts_json
  FROM (
    SELECT
      id,
      instagram_id,
      permalink,
      media_type,
      media_url,
      thumbnail_url,
      caption,
      caption_en,
      like_count,
      taken_at,
      is_pinned,
      pin_order,
      source
    FROM instagram_posts
    WHERE is_hidden = false
    ORDER BY is_pinned DESC, pin_order ASC NULLS LAST, taken_at DESC NULLS LAST, created_at DESC
    LIMIT settings_row.max_posts
  ) p;

  RETURN jsonb_build_object(
    'enabled',  true,
    'settings', to_jsonb(settings_row) - 'created_at' - 'updated_at',
    'posts',    posts_json
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_instagram_display_data() TO anon, authenticated;

-- =====================================================
-- 6. updated_at triggers
-- =====================================================
CREATE OR REPLACE FUNCTION update_instagram_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS instagram_posts_updated_at_trigger
  ON instagram_posts;
CREATE TRIGGER instagram_posts_updated_at_trigger
  BEFORE UPDATE ON instagram_posts
  FOR EACH ROW EXECUTE FUNCTION update_instagram_timestamp();

DROP TRIGGER IF EXISTS instagram_settings_updated_at_trigger
  ON instagram_settings;
CREATE TRIGGER instagram_settings_updated_at_trigger
  BEFORE UPDATE ON instagram_settings
  FOR EACH ROW EXECUTE FUNCTION update_instagram_timestamp();

DROP TRIGGER IF EXISTS instagram_credentials_updated_at_trigger
  ON instagram_credentials;
CREATE TRIGGER instagram_credentials_updated_at_trigger
  BEFORE UPDATE ON instagram_credentials
  FOR EACH ROW EXECUTE FUNCTION update_instagram_timestamp();

-- =====================================================
-- 7. Seed: één rij in settings + één in credentials.
-- =====================================================
INSERT INTO instagram_settings (
  id,
  section_title_en,
  section_subtitle_en,
  cta_text_en
)
SELECT
  gen_random_uuid(),
  '@mosewearcom',
  'MOSE worn in the wild',
  'Follow us on Instagram'
WHERE NOT EXISTS (SELECT 1 FROM instagram_settings);

INSERT INTO instagram_credentials (id, last_sync_status)
SELECT gen_random_uuid(), 'idle'
WHERE NOT EXISTS (SELECT 1 FROM instagram_credentials);

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE instagram_posts IS
  'Instagram posts (gesynct via Graph API of handmatig). RPC get_instagram_display_data() levert de zichtbare set aan storefront.';
COMMENT ON COLUMN instagram_posts.instagram_id IS
  'Meta media ID. NULL bij handmatig toegevoegde posts (source=manual).';
COMMENT ON COLUMN instagram_posts.is_hidden IS
  'Admin-toggle. Verborgen posts blijven in DB voor pin-historie maar zijn niet zichtbaar op storefront.';
COMMENT ON TABLE instagram_settings IS
  'Display-instellingen voor de Instagram-marquee op de homepage (single-row CMS).';
COMMENT ON TABLE instagram_credentials IS
  'Long-lived token + sync-status voor Instagram Graph API. Alleen admin/service-role.';
COMMENT ON FUNCTION get_instagram_display_data() IS
  'Single round-trip voor de storefront: enabled-flag, display-instellingen en zichtbare posts (max max_posts).';
