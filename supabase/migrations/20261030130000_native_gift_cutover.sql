-- Dormant cutover barrier. Installation does not switch any checkout or issuer.
BEGIN;
CREATE TABLE IF NOT EXISTS public.native_gift_cutover (
  id integer PRIMARY KEY CHECK(id=1),
  issuer text NOT NULL DEFAULT 'mose' CHECK(issuer IN ('mose','shopify_native')),
  activated_at timestamptz,
  shopify_product_ids text[] NOT NULL DEFAULT '{}',
  review_reference text,
  expiry_policy text CHECK(expiry_policy IS NULL OR expiry_policy='never'),
  CHECK(issuer='mose' OR (activated_at IS NOT NULL AND cardinality(shopify_product_ids)>0 AND review_reference IS NOT NULL AND length(review_reference)>=20 AND expiry_policy IS NOT NULL AND expiry_policy='never'))
);
INSERT INTO public.native_gift_cutover(id) VALUES(1) ON CONFLICT DO NOTHING;
ALTER TABLE public.native_gift_cutover ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.native_gift_cutover FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.native_gift_cutover TO service_role;

CREATE OR REPLACE FUNCTION public.guard_native_mose_gift_writer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE mode text;
BEGIN
  IF TG_TABLE_NAME='order_items' THEN
    IF NEW.is_gift_card IS DISTINCT FROM true THEN RETURN NEW; END IF;
  END IF;
  -- Shares the same row fence as activation, including requests that began
  -- before the switch. A native balance can never appear after the audit.
  SELECT issuer INTO mode FROM public.native_gift_cutover WHERE id=1 FOR SHARE;
  IF mode IS DISTINCT FROM 'mose' THEN RAISE EXCEPTION 'MOSE_GIFT_ISSUER_CLOSED_USE_SHOPIFY_NATIVE'; END IF;
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS guard_native_gift_card_writer ON public.gift_cards;
CREATE TRIGGER guard_native_gift_card_writer BEFORE INSERT OR UPDATE OF balance,status ON public.gift_cards FOR EACH ROW EXECUTE FUNCTION public.guard_native_mose_gift_writer();
DROP TRIGGER IF EXISTS guard_native_gift_order_writer ON public.order_items;
CREATE TRIGGER guard_native_gift_order_writer BEFORE INSERT OR UPDATE OF is_gift_card ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.guard_native_mose_gift_writer();

CREATE OR REPLACE FUNCTION public.native_gift_issuer_health()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public AS $fn$
SELECT jsonb_build_object('issuer',c.issuer,'activatedAt',c.activated_at,'shopifyProductIds',c.shopify_product_ids,'reviewReference',c.review_reference,'expiryPolicy',c.expiry_policy,
 'nativeCards',(SELECT count(*) FROM public.gift_cards),
 'writerGeneration',CASE WHEN (SELECT count(*) FROM pg_trigger WHERE tgname IN ('guard_native_gift_card_writer','guard_native_gift_order_writer') AND NOT tgisinternal AND tgenabled='O')=2 THEN 1 ELSE 0 END,
 'balances',(SELECT count(*) FROM public.gift_cards WHERE balance>0 AND status NOT IN ('expired','cancelled')),
 'pendingDelivery',(SELECT count(*) FROM public.gift_cards WHERE delivered_at IS NULL AND pending_delivery_code IS NOT NULL AND status NOT IN ('expired','cancelled')),
 'pendingLegacyGiftOrders',(SELECT count(DISTINCT o.id) FROM public.orders o JOIN public.order_items i ON i.order_id=o.id AND i.is_gift_card=true
   WHERE (o.payment_status='paid' AND o.gift_cards_issued_at IS NULL) OR COALESCE(o.payment_status,'pending') NOT IN ('paid','failed','expired','cancelled','canceled','refunded')))
FROM public.native_gift_cutover c WHERE c.id=1;
$fn$;

DROP FUNCTION IF EXISTS public.activate_native_gift_checkout(text[],text);
CREATE OR REPLACE FUNCTION public.activate_native_gift_checkout(p_product_ids text[],p_review_reference text,p_expiry_policy text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE mode text; health jsonb;
BEGIN
  IF p_expiry_policy IS DISTINCT FROM 'never' THEN RAISE EXCEPTION 'NATIVE_GIFT_NEVER_EXPIRY_REVIEW_REQUIRED'; END IF;
  IF p_product_ids IS NULL OR cardinality(p_product_ids)=0 OR EXISTS(SELECT 1 FROM unnest(p_product_ids)id WHERE id IS NULL OR id !~ '^gid://shopify/Product/[1-9][0-9]*$')
    OR cardinality(p_product_ids)<>(SELECT count(DISTINCT id) FROM unnest(p_product_ids)id)
    OR p_review_reference IS NULL OR length(btrim(p_review_reference))<20 THEN RAISE EXCEPTION 'NATIVE_GIFT_REVIEW_REQUIRED'; END IF;
  SELECT issuer INTO mode FROM public.native_gift_cutover WHERE id=1 FOR UPDATE;
  IF mode='shopify_native' THEN
    IF NOT EXISTS(SELECT 1 FROM public.native_gift_cutover WHERE id=1 AND shopify_product_ids=p_product_ids) THEN RAISE EXCEPTION 'NATIVE_GIFT_CUTOVER_ALREADY_BOUND'; END IF;
    RETURN true;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.products WHERE id='bc6c495d-fbc9-48e4-8d24-a9f8f23e3b8c' AND is_gift_card=true) THEN RAISE EXCEPTION 'NATIVE_GIFT_LOCAL_PRODUCT_MISSING'; END IF;
  health:=public.native_gift_issuer_health();
  IF health IS NULL OR (health->>'nativeCards')::bigint<>0 OR (health->>'writerGeneration')::integer<>1 OR (health->>'balances')::bigint<>0 OR (health->>'pendingDelivery')::bigint<>0 OR (health->>'pendingLegacyGiftOrders')::bigint<>0 THEN
    RAISE EXCEPTION 'NATIVE_GIFT_LEGACY_OBLIGATIONS_REMAIN';
  END IF;
  UPDATE public.native_gift_cutover SET issuer='shopify_native',activated_at=now(),shopify_product_ids=p_product_ids,review_reference=btrim(p_review_reference),expiry_policy='never' WHERE id=1;
  UPDATE public.products SET gift_card_default_validity_months=NULL WHERE id='bc6c495d-fbc9-48e4-8d24-a9f8f23e3b8c' AND is_gift_card=true;
  RETURN true;
END $fn$;
REVOKE ALL ON FUNCTION public.guard_native_mose_gift_writer() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.native_gift_issuer_health() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.activate_native_gift_checkout(text[],text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_gift_issuer_health() TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_native_gift_checkout(text[],text,text) TO service_role;
COMMIT;
