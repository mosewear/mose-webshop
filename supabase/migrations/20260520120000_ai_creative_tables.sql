-- Phase 3a: foundation for the garment-preserving AI creative pipeline.
--
-- Three tables:
--   * ai_creative_scene_library — pre-approved scenes that products can be
--     composited into. Owned by admins; populated either by uploading
--     reference photos from our photoshoot or by curating a stock set.
--   * ai_creative_runs         — one row per generation batch. Tracks
--     which product/variant + scene + model + params were used and the
--     cumulative cost.
--   * ai_creative_variants     — individual images coming out of a run,
--     with QA scores (SSIM vs source garment, brand-palette distance,
--     ad-policy lint outcome) and an approval workflow.
--
-- RLS:
--   * Admins (any admin_role) read everything.
--   * admin/manager can insert + update.
--   * Only the service-role can write the QA scores + meta_creative_id
--     fields (those are populated by background jobs).
--
-- All image URLs point at Supabase Storage (`images` bucket, prefix
-- `ai-creatives/scenes/` or `ai-creatives/variants/<run_id>/`).

-- =====================================================================
-- ai_creative_scene_library
-- =====================================================================
CREATE TABLE IF NOT EXISTS ai_creative_scene_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  description TEXT,
  scene_type TEXT NOT NULL CHECK (scene_type IN ('lifestyle', 'studio', 'editorial', 'flatlay', 'street')),
  reference_image_url TEXT NOT NULL,
  bg_removed_url TEXT,
  focal_x NUMERIC(4, 3) NOT NULL DEFAULT 0.5 CHECK (focal_x >= 0 AND focal_x <= 1),
  focal_y NUMERIC(4, 3) NOT NULL DEFAULT 0.5 CHECK (focal_y >= 0 AND focal_y <= 1),
  palette_hex TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  prompt_hint TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (label)
);
COMMENT ON TABLE ai_creative_scene_library IS 'Pre-approved scenes for the garment-preserving creative pipeline.';
COMMENT ON COLUMN ai_creative_scene_library.focal_x IS 'Normalized 0..1 x focal point so we can keep the model in-frame across crops.';
COMMENT ON COLUMN ai_creative_scene_library.palette_hex IS 'Dominant colours extracted from the scene; used to nudge AI prompts and run brand-palette QA.';

CREATE INDEX IF NOT EXISTS idx_ai_creative_scene_library_active ON ai_creative_scene_library(is_active, scene_type);

ALTER TABLE ai_creative_scene_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read scenes" ON ai_creative_scene_library
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins manage scenes" ON ai_creative_scene_library
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND is_admin = true
        AND COALESCE(admin_role, 'admin') IN ('admin', 'manager')
    )
  );

CREATE TRIGGER trg_ai_creative_scene_library_updated_at
  BEFORE UPDATE ON ai_creative_scene_library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- ai_creative_runs
-- =====================================================================
CREATE TABLE IF NOT EXISTS ai_creative_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID REFERENCES ad_autopilot_decisions(id) ON DELETE SET NULL,
  source_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  source_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  scene_id UUID NOT NULL REFERENCES ai_creative_scene_library(id) ON DELETE RESTRICT,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'replicate',
  model TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  total_variants INTEGER NOT NULL DEFAULT 0,
  total_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
COMMENT ON TABLE ai_creative_runs IS 'One row per AI creative generation batch (product + scene + model + N variants).';

CREATE INDEX IF NOT EXISTS idx_ai_creative_runs_product ON ai_creative_runs(source_product_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_creative_runs_status ON ai_creative_runs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_creative_runs_decision ON ai_creative_runs(decision_id) WHERE decision_id IS NOT NULL;

ALTER TABLE ai_creative_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read creative runs" ON ai_creative_runs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admin/manager insert creative runs" ON ai_creative_runs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND is_admin = true
        AND COALESCE(admin_role, 'admin') IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin/manager update creative runs" ON ai_creative_runs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND is_admin = true
        AND COALESCE(admin_role, 'admin') IN ('admin', 'manager')
    )
  );

-- =====================================================================
-- ai_creative_variants
-- =====================================================================
CREATE TABLE IF NOT EXISTS ai_creative_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES ai_creative_runs(id) ON DELETE CASCADE,
  variant_index INTEGER NOT NULL,
  output_url TEXT NOT NULL,
  thumbnail_url TEXT,
  mask_url TEXT,
  ssim_score NUMERIC(5, 4) CHECK (ssim_score >= 0 AND ssim_score <= 1),
  palette_distance NUMERIC(8, 4),
  brand_color_pass BOOLEAN,
  ad_policy_pass BOOLEAN,
  ad_policy_issues TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  qa_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published', 'archived')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  published_to_meta_at TIMESTAMPTZ,
  meta_creative_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE ai_creative_variants IS 'Generated creative outputs with QA scores and an approval workflow.';
COMMENT ON COLUMN ai_creative_variants.ssim_score IS 'Structural similarity between the generated image and the source garment crop (0..1). Higher = better preservation.';
COMMENT ON COLUMN ai_creative_variants.palette_distance IS 'Mean CIE76 / deltaE distance between the variant palette and the brand palette. Lower = closer to brand.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_creative_variants_run_idx ON ai_creative_variants(run_id, variant_index);
CREATE INDEX IF NOT EXISTS idx_ai_creative_variants_status ON ai_creative_variants(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_creative_variants_published ON ai_creative_variants(published_to_meta_at) WHERE published_to_meta_at IS NOT NULL;

ALTER TABLE ai_creative_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read variants" ON ai_creative_variants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admin/manager review variants" ON ai_creative_variants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND is_admin = true
        AND COALESCE(admin_role, 'admin') IN ('admin', 'manager')
    )
  );

-- The service-role still bypasses RLS so background jobs can insert
-- variants + QA scores even though there's no INSERT policy here.

COMMENT ON POLICY "Admins read variants" ON ai_creative_variants IS
  'Read access for any admin so the approval queue is visible to managers and viewers alike.';
