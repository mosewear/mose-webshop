-- Reporting views must never bypass their callers' underlying RLS policies.
-- Only server-side jobs consume paid-order and advertising economics reports.
BEGIN;

ALTER VIEW public.v_paid_orders SET (security_invoker = true);
ALTER VIEW public.v_ad_optimizer_signals SET (security_invoker = true);
ALTER VIEW public.product_variants_with_total_stock SET (security_invoker = true);

REVOKE ALL ON public.v_paid_orders FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_ad_optimizer_signals FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_paid_orders TO service_role;
GRANT SELECT ON public.v_ad_optimizer_signals TO service_role;

-- Preserve stock view grants; the invoker now obeys product_variants RLS.
COMMIT;
