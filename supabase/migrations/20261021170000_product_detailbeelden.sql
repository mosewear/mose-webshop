-- Detailbeelden per product en kleur voor de strip "Van dichtbij" op de
-- productpagina. Bewust een eigen tabel en niet product_images: zo blijven de
-- galerij, de shoptegels, het menu en de Google-feed precies zoals ze waren,
-- en is terugdraaien één DELETE (of actief = false).
CREATE TABLE IF NOT EXISTS public.product_detail_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color       text NOT NULL,
  position    int  NOT NULL DEFAULT 0,
  url         text NOT NULL,
  label_nl    text NOT NULL,
  label_en    text NOT NULL,
  alt_nl      text NOT NULL,
  alt_en      text NOT NULL,
  -- AI-productvisualisatie op basis van eigen fotografie, of echte foto.
  herkomst    text NOT NULL DEFAULT 'ai' CHECK (herkomst IN ('ai', 'foto')),
  actief      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, color, position)
);
CREATE INDEX IF NOT EXISTS product_detail_images_product ON public.product_detail_images (product_id, color, position);

ALTER TABLE public.product_detail_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "detailbeelden lezen" ON public.product_detail_images;
CREATE POLICY "detailbeelden lezen" ON public.product_detail_images FOR SELECT TO anon, authenticated USING (actief);
DROP POLICY IF EXISTS "detailbeelden beheren" ON public.product_detail_images;
CREATE POLICY "detailbeelden beheren" ON public.product_detail_images FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
