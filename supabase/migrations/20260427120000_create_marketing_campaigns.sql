-- =====================================================
-- MARKETING CAMPAIGNS MODULE
-- Eén tabel die per campagne (Koningsdag, Black Friday, ...)
-- banner-tekst, popup, themakleur en gekoppelde promo code
-- centraal beheert. Auto-activatie via starts_at / ends_at.
-- =====================================================

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifier
  name TEXT NOT NULL,
  slug TEXT NOT NULL,

  -- Lifecycle
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  starts_at TIMESTAMPTZ,
  ends_at   TIMESTAMPTZ,
  priority  INT NOT NULL DEFAULT 0,

  -- Theme
  theme_color           TEXT,
  theme_text_color      TEXT,
  theme_accent_color    TEXT,
  override_banner_color BOOLEAN NOT NULL DEFAULT true,

  -- Banner
  banner_enabled    BOOLEAN NOT NULL DEFAULT true,
  banner_message_nl TEXT,
  banner_message_en TEXT,
  banner_cta_nl     TEXT,
  banner_cta_en     TEXT,
  banner_link_url   TEXT,
  banner_dismissable BOOLEAN NOT NULL DEFAULT false,

  -- Popup
  popup_enabled        BOOLEAN NOT NULL DEFAULT false,
  popup_title_nl       TEXT,
  popup_title_en       TEXT,
  popup_body_nl        TEXT,
  popup_body_en        TEXT,
  popup_cta_nl         TEXT,
  popup_cta_en         TEXT,
  popup_image_url      TEXT,
  popup_image_alt_nl   TEXT,
  popup_image_alt_en   TEXT,
  popup_trigger        TEXT NOT NULL DEFAULT 'timer'
    CHECK (popup_trigger IN ('immediate','timer','scroll','exit_intent')),
  popup_delay_seconds  INT NOT NULL DEFAULT 5
    CHECK (popup_delay_seconds >= 0 AND popup_delay_seconds <= 600),
  popup_scroll_pct     INT NOT NULL DEFAULT 30
    CHECK (popup_scroll_pct >= 0 AND popup_scroll_pct <= 100),
  popup_show_on_pages  TEXT[] NOT NULL DEFAULT ARRAY['home','shop','product']::TEXT[],

  -- Promo code link
  promo_code_id        UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
  auto_apply_via_url   BOOLEAN NOT NULL DEFAULT true,
  show_code_in_banner  BOOLEAN NOT NULL DEFAULT true,
  show_code_in_popup   BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT marketing_campaigns_slug_unique UNIQUE (slug),
  CONSTRAINT marketing_campaigns_slug_format
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 2 AND 80),
  CONSTRAINT marketing_campaigns_window_valid
    CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at),
  CONSTRAINT marketing_campaigns_theme_color_format
    CHECK (theme_color IS NULL OR theme_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT marketing_campaigns_theme_text_color_format
    CHECK (theme_text_color IS NULL OR theme_text_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT marketing_campaigns_theme_accent_color_format
    CHECK (theme_accent_color IS NULL OR theme_accent_color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Index for the active-campaign lookup (storefront on every page).
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_active_lookup
  ON marketing_campaigns (is_enabled, priority DESC, starts_at DESC NULLS LAST)
  WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_slug
  ON marketing_campaigns (slug);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_window
  ON marketing_campaigns (starts_at, ends_at);

-- =====================================================
-- RPC: huidige actieve campagne (server-side gefilterd op
-- venster + master toggle, hoogste prioriteit wint).
-- SECURITY DEFINER zodat ook bezoekers het kunnen oproepen
-- zonder dat we publieke RLS te ruim hoeven te maken.
-- =====================================================
CREATE OR REPLACE FUNCTION get_active_marketing_campaign()
RETURNS SETOF marketing_campaigns
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM marketing_campaigns
  WHERE is_enabled = true
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at   IS NULL OR ends_at   >  NOW())
  ORDER BY priority DESC, starts_at DESC NULLS LAST, created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_active_marketing_campaign() TO anon, authenticated;

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Bezoekers kunnen geen rijen direct uit de tabel lezen; ze gebruiken
-- altijd de RPC hierboven (die filtert al op enabled + window).
-- Admins krijgen volledige toegang via hun is_admin flag.

CREATE POLICY "Admins can read all marketing campaigns"
  ON marketing_campaigns FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert marketing campaigns"
  ON marketing_campaigns FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update marketing campaigns"
  ON marketing_campaigns FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete marketing campaigns"
  ON marketing_campaigns FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- =====================================================
-- updated_at trigger
-- =====================================================
CREATE OR REPLACE FUNCTION update_marketing_campaign_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS marketing_campaigns_updated_at_trigger
  ON marketing_campaigns;

CREATE TRIGGER marketing_campaigns_updated_at_trigger
  BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_campaign_timestamp();

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE marketing_campaigns IS
  'Marketing campagnes (Koningsdag, Black Friday, ...): banner, popup, theme en promo code op één plek, met start/eind venster.';
COMMENT ON COLUMN marketing_campaigns.slug IS
  'URL-vriendelijke identifier; gebruikt in ?campaign=<slug> voor auto-apply.';
COMMENT ON COLUMN marketing_campaigns.is_enabled IS
  'Master switch. Pas zichtbaar op storefront als ook starts_at/ends_at venster geldig is.';
COMMENT ON COLUMN marketing_campaigns.priority IS
  'Bij overlappende campagnes wint de hoogste prioriteit.';
COMMENT ON COLUMN marketing_campaigns.popup_show_on_pages IS
  'Allowlist: home, shop, product, blog, about. Andere pages tonen geen popup.';
COMMENT ON COLUMN marketing_campaigns.promo_code_id IS
  'Optionele koppeling naar promo_codes. Zonder code is de campagne puur informatief (banner/popup).';
COMMENT ON FUNCTION get_active_marketing_campaign() IS
  'Retourneert maximaal één rij: de huidige actieve campagne, of geen rij als er niets actief is.';
