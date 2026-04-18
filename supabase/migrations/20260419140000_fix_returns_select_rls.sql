-- Tighten customer visibility: retouren alleen als gekoppelde order van deze gebruiker is
-- (user_id op order of zelfde e-mail als JWT). Voorkomt dat client-side queries
-- zonder API-filter data missen voor edge cases (user_id NULL op return).

DROP POLICY IF EXISTS "Users can view own returns" ON public.returns;

CREATE POLICY "Users can view own returns"
  ON public.returns FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = returns.order_id
      AND (
        o.user_id = auth.uid()
        OR (
          auth.jwt()->>'email' IS NOT NULL
          AND LOWER(TRIM(COALESCE(o.email, ''))) = LOWER(TRIM(auth.jwt()->>'email'))
        )
      )
    )
  );
