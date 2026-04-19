-- Inventory v2: audit trail, stock receipts, RPCs (profiles-based admin, not admin_users)

DROP FUNCTION IF EXISTS public.update_product_stock(uuid, integer, text, text, uuid);

-- Clean slate if legacy/broken inventory_logs exists (from old migrations)
DROP TABLE IF EXISTS public.stock_receipt_lines CASCADE;
DROP TABLE IF EXISTS public.inventory_logs CASCADE;
DROP TABLE IF EXISTS public.stock_receipts CASCADE;

-- Receipts (inbound batches)
CREATE TABLE public.stock_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  notes TEXT,
  expected_total INT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_receipts_created_at ON public.stock_receipts(created_at DESC);
CREATE INDEX idx_stock_receipts_created_by ON public.stock_receipts(created_by);

-- Lines per receipt
CREATE TABLE public.stock_receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.stock_receipts(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity_added INT NOT NULL CHECK (quantity_added > 0),
  inventory_type TEXT NOT NULL CHECK (inventory_type IN ('regular', 'presale')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_receipt_lines_receipt ON public.stock_receipt_lines(receipt_id);
CREATE INDEX idx_stock_receipt_lines_variant ON public.stock_receipt_lines(variant_id);

-- Audit log
CREATE TABLE public.inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  change_amount INT NOT NULL,
  previous_stock INT NOT NULL,
  new_stock INT NOT NULL,
  inventory_type TEXT NOT NULL CHECK (inventory_type IN ('regular', 'presale')),
  reason TEXT NOT NULL,
  notes TEXT,
  receipt_id UUID REFERENCES public.stock_receipts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_logs_variant_created ON public.inventory_logs(variant_id, created_at DESC);
CREATE INDEX idx_inventory_logs_receipt ON public.inventory_logs(receipt_id) WHERE receipt_id IS NOT NULL;
CREATE INDEX idx_inventory_logs_created ON public.inventory_logs(created_at DESC);

ALTER TABLE public.stock_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- Admin policies (profiles.is_admin)
CREATE POLICY "stock_receipts_admin_select" ON public.stock_receipts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

CREATE POLICY "stock_receipts_admin_insert" ON public.stock_receipts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

CREATE POLICY "stock_receipt_lines_admin_select" ON public.stock_receipt_lines
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

CREATE POLICY "stock_receipt_lines_admin_insert" ON public.stock_receipt_lines
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

CREATE POLICY "inventory_logs_admin_select" ON public.inventory_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

CREATE POLICY "inventory_logs_admin_insert" ON public.inventory_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

COMMENT ON TABLE public.stock_receipts IS 'Inbound stock batches (leveringen)';
COMMENT ON TABLE public.stock_receipt_lines IS 'Per-variant lines for a stock receipt';
COMMENT ON TABLE public.inventory_logs IS 'Stock movement audit trail';

-- Helper: verify caller is admin
CREATE OR REPLACE FUNCTION public._inventory_assert_admin()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid AND is_admin = true) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_apply_regular_delta(
  p_variant_id uuid,
  p_delta integer,
  p_reason text,
  p_notes text DEFAULT NULL,
  p_receipt_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_prev int;
  v_new int;
  v_actual int;
BEGIN
  v_uid := public._inventory_assert_admin();

  IF p_variant_id IS NULL THEN
    RAISE EXCEPTION 'variant_required' USING ERRCODE = 'P0001';
  END IF;
  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'delta_invalid' USING ERRCODE = 'P0001';
  END IF;
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = 'P0001';
  END IF;

  SELECT stock_quantity INTO v_prev FROM public.product_variants WHERE id = p_variant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'variant_not_found' USING ERRCODE = 'P0001';
  END IF;

  v_new := GREATEST(0, COALESCE(v_prev, 0) + p_delta);
  v_actual := v_new - COALESCE(v_prev, 0);

  UPDATE public.product_variants
  SET stock_quantity = v_new
  WHERE id = p_variant_id;

  INSERT INTO public.inventory_logs (
    variant_id, profile_id, change_amount, previous_stock, new_stock,
    inventory_type, reason, notes, receipt_id
  ) VALUES (
    p_variant_id, v_uid, v_actual, COALESCE(v_prev, 0), v_new,
    'regular', trim(p_reason), p_notes, p_receipt_id
  );

  RETURN jsonb_build_object(
    'variant_id', p_variant_id,
    'previous_stock', COALESCE(v_prev, 0),
    'new_stock', v_new,
    'change_amount', v_actual,
    'inventory_type', 'regular'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_apply_presale_delta(
  p_variant_id uuid,
  p_delta integer,
  p_reason text,
  p_notes text DEFAULT NULL,
  p_receipt_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_prev int;
  v_new int;
  v_actual int;
BEGIN
  v_uid := public._inventory_assert_admin();

  IF p_variant_id IS NULL THEN
    RAISE EXCEPTION 'variant_required' USING ERRCODE = 'P0001';
  END IF;
  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'delta_invalid' USING ERRCODE = 'P0001';
  END IF;
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = 'P0001';
  END IF;

  SELECT presale_stock_quantity INTO v_prev FROM public.product_variants WHERE id = p_variant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'variant_not_found' USING ERRCODE = 'P0001';
  END IF;

  v_new := GREATEST(0, COALESCE(v_prev, 0) + p_delta);
  v_actual := v_new - COALESCE(v_prev, 0);

  UPDATE public.product_variants
  SET presale_stock_quantity = v_new
  WHERE id = p_variant_id;

  INSERT INTO public.inventory_logs (
    variant_id, profile_id, change_amount, previous_stock, new_stock,
    inventory_type, reason, notes, receipt_id
  ) VALUES (
    p_variant_id, v_uid, v_actual, COALESCE(v_prev, 0), v_new,
    'presale', trim(p_reason), p_notes, p_receipt_id
  );

  RETURN jsonb_build_object(
    'variant_id', p_variant_id,
    'previous_stock', COALESCE(v_prev, 0),
    'new_stock', v_new,
    'change_amount', v_actual,
    'inventory_type', 'presale'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_commit_receipt(
  p_title text,
  p_lines jsonb,
  p_notes text DEFAULT NULL,
  p_expected_total integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_receipt_id uuid;
  v_line jsonb;
  v_variant_id uuid;
  v_qty int;
  v_inv_type text;
  v_sum int := 0;
  v_mismatch boolean := false;
BEGIN
  v_uid := public._inventory_assert_admin();

  IF p_title IS NULL OR trim(p_title) = '' THEN
    RAISE EXCEPTION 'title_required' USING ERRCODE = 'P0001';
  END IF;
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'lines_required' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.stock_receipts (title, notes, expected_total, created_by)
  VALUES (trim(p_title), p_notes, p_expected_total, v_uid)
  RETURNING id INTO v_receipt_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_variant_id := (v_line->>'variant_id')::uuid;
    v_qty := (v_line->>'quantity_added')::int;
    v_inv_type := coalesce(nullif(trim(v_line->>'inventory_type'), ''), 'regular');

    IF v_variant_id IS NULL THEN
      RAISE EXCEPTION 'invalid_line_variant' USING ERRCODE = 'P0001';
    END IF;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'invalid_line_qty' USING ERRCODE = 'P0001';
    END IF;
    IF v_inv_type NOT IN ('regular', 'presale') THEN
      RAISE EXCEPTION 'invalid_line_type' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.stock_receipt_lines (receipt_id, variant_id, quantity_added, inventory_type)
    VALUES (v_receipt_id, v_variant_id, v_qty, v_inv_type);

    IF v_inv_type = 'regular' THEN
      PERFORM public.inventory_apply_regular_delta(v_variant_id, v_qty, 'receipt', p_notes, v_receipt_id);
    ELSE
      PERFORM public.inventory_apply_presale_delta(v_variant_id, v_qty, 'receipt', p_notes, v_receipt_id);
    END IF;

    v_sum := v_sum + v_qty;
  END LOOP;

  IF p_expected_total IS NOT NULL AND p_expected_total <> v_sum THEN
    v_mismatch := true;
  END IF;

  RETURN jsonb_build_object(
    'receipt_id', v_receipt_id,
    'total_added', v_sum,
    'expected_total', p_expected_total,
    'expected_mismatch', v_mismatch
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.inventory_apply_regular_delta(uuid, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_apply_presale_delta(uuid, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_commit_receipt(text, jsonb, text, integer) TO authenticated;
