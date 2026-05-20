-- Phase 0: per-SKU economics so the autopilot can optimise on contribution
-- margin instead of platform-reported ROAS.
--
-- Rows are scoped per product, optionally narrowed to a specific variant
-- when costs differ by size/colour. Lookups fall back from variant -> product
-- (handled in the optimizer view in a later migration).

CREATE TABLE IF NOT EXISTS ad_sku_economics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  cost_price NUMERIC(10, 2) NOT NULL CHECK (cost_price >= 0),
  shipping_cost_avg NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (shipping_cost_avg >= 0),
  transaction_fee_pct NUMERIC(5, 4) NOT NULL DEFAULT 0.0290 CHECK (transaction_fee_pct >= 0 AND transaction_fee_pct < 1),
  vat_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.21 CHECK (vat_rate >= 0 AND vat_rate < 1),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ad_sku_economics IS 'Per-SKU cost data used to compute contribution margin in the AI campaign autopilot.';
COMMENT ON COLUMN ad_sku_economics.cost_price IS 'Unit COGS in EUR (excl. VAT).';
COMMENT ON COLUMN ad_sku_economics.shipping_cost_avg IS 'Average outbound shipping cost in EUR (excl. VAT). Falls back to site-wide average if 0.';
COMMENT ON COLUMN ad_sku_economics.transaction_fee_pct IS 'Payment processing fee as fraction of order total (0.0290 = 2.9%).';
COMMENT ON COLUMN ad_sku_economics.vat_rate IS 'Applicable VAT rate as fraction (0.21 = 21%).';

-- Unique constraint: one row per (product, variant) combination. variant_id
-- NULL means the row applies to the entire product (fallback). The partial
-- unique indexes encode this without needing a sentinel value.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ad_sku_economics_product_variant
  ON ad_sku_economics(product_id, variant_id)
  WHERE variant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ad_sku_economics_product_only
  ON ad_sku_economics(product_id)
  WHERE variant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ad_sku_economics_product_id ON ad_sku_economics(product_id);
CREATE INDEX IF NOT EXISTS idx_ad_sku_economics_variant_id ON ad_sku_economics(variant_id) WHERE variant_id IS NOT NULL;

-- Auto-update updated_at on row change.
CREATE OR REPLACE FUNCTION trg_ad_sku_economics_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ad_sku_economics_set_updated_at ON ad_sku_economics;
CREATE TRIGGER ad_sku_economics_set_updated_at
  BEFORE UPDATE ON ad_sku_economics
  FOR EACH ROW EXECUTE FUNCTION trg_ad_sku_economics_set_updated_at();

ALTER TABLE ad_sku_economics ENABLE ROW LEVEL SECURITY;

-- Admins (admin + manager) can view and manage SKU economics. Viewers can read
-- only. Service role bypasses RLS as usual.
CREATE POLICY "Admins manage sku economics" ON ad_sku_economics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
