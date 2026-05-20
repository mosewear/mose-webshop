-- Phase 0: daily Meta Marketing API performance snapshots.
--
-- One row per (entity, snapshot_date). Entities are nested: campaign,
-- ad_set, ad — captured at all three levels so the optimizer can reason at
-- the right granularity. `meta_entity_id` is the platform ID; the parent
-- chain is denormalised for fast filtering.

CREATE TABLE IF NOT EXISTS ad_campaign_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  account_id TEXT NOT NULL,
  entity_level TEXT NOT NULL CHECK (entity_level IN ('account', 'campaign', 'ad_set', 'ad')),
  meta_entity_id TEXT NOT NULL,
  campaign_id TEXT,
  ad_set_id TEXT,
  ad_id TEXT,
  name TEXT,
  objective TEXT,
  status TEXT,
  spend NUMERIC(12, 2) NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  link_clicks BIGINT NOT NULL DEFAULT 0,
  attributed_purchases BIGINT NOT NULL DEFAULT 0,
  attributed_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
  attributed_add_to_cart BIGINT NOT NULL DEFAULT 0,
  attributed_initiate_checkout BIGINT NOT NULL DEFAULT 0,
  ctr NUMERIC(7, 4),
  cpm NUMERIC(10, 4),
  cpc NUMERIC(10, 4),
  frequency NUMERIC(6, 4),
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ad_campaign_snapshots IS 'Daily snapshots of Meta Marketing API performance per entity (account/campaign/ad_set/ad). Source of truth for the autopilot reasoning loop.';
COMMENT ON COLUMN ad_campaign_snapshots.entity_level IS 'Which Meta hierarchy level this row represents.';
COMMENT ON COLUMN ad_campaign_snapshots.raw_payload IS 'Full raw API response for debugging and forward-compatibility (new fields).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_ad_campaign_snapshots_entity_date
  ON ad_campaign_snapshots(meta_entity_id, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_ad_campaign_snapshots_date ON ad_campaign_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_campaign_snapshots_account ON ad_campaign_snapshots(account_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_campaign_snapshots_campaign ON ad_campaign_snapshots(campaign_id, snapshot_date DESC) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_campaign_snapshots_ad_set ON ad_campaign_snapshots(ad_set_id, snapshot_date DESC) WHERE ad_set_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_campaign_snapshots_ad ON ad_campaign_snapshots(ad_id, snapshot_date DESC) WHERE ad_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_campaign_snapshots_level ON ad_campaign_snapshots(entity_level, snapshot_date DESC);

ALTER TABLE ad_campaign_snapshots ENABLE ROW LEVEL SECURITY;

-- Read-only for admins / managers / viewers. Writes only via service role
-- (snapshot ingestion is a server-side job).
CREATE POLICY "Admins read campaign snapshots" ON ad_campaign_snapshots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
