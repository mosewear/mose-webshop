-- One atomic native MOSE issuer per paid order. Does not enable Shopify gift-card checkout.
-- Apply before deploying the RPC caller. Existing balances/codes and completed issuances remain intact.
BEGIN;
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS source_order_item_id uuid REFERENCES public.order_items(id) ON DELETE RESTRICT;
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS source_unit_index integer CHECK (source_unit_index >= 0);
CREATE UNIQUE INDEX IF NOT EXISTS gift_cards_purchase_unit_once ON public.gift_cards(source_order_item_id,source_unit_index)
  WHERE source_order_item_id IS NOT NULL AND source_unit_index IS NOT NULL;

CREATE OR REPLACE FUNCTION public.issue_paid_order_gift_cards(p_order_id uuid,p_units jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE o public.orders%ROWTYPE; item record; unit jsonb; n integer; expected_count integer;
  code text; code_hash text; meta jsonb; recipient text; validity integer; issued jsonb;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'GIFT_ORDER_NOT_FOUND'; END IF;
  IF o.payment_status IS DISTINCT FROM 'paid' THEN RETURN '[]'::jsonb; END IF;
  -- A retry may redeliver the same undelivered code, never generate a second capability.
  IF o.gift_cards_issued_at IS NULL THEN
    IF EXISTS(SELECT 1 FROM public.gift_cards WHERE purchased_by_order_id=p_order_id) THEN
      RAISE EXCEPTION 'GIFT_LEGACY_PARTIAL_ISSUANCE_REQUIRES_REVIEW';
    END IF;
    PERFORM 1 FROM public.order_items WHERE order_id=p_order_id ORDER BY id FOR UPDATE;
    SELECT COALESCE(sum(quantity),0)::integer INTO expected_count FROM public.order_items WHERE order_id=p_order_id AND is_gift_card=true;
    IF p_units IS NULL OR jsonb_typeof(p_units)<>'array' OR jsonb_array_length(p_units)<>expected_count THEN
      RAISE EXCEPTION 'GIFT_UNIT_COUNT_MISMATCH';
    END IF;
    IF (SELECT count(DISTINCT (u->>'orderItemId',u->>'unitIndex')) FROM jsonb_array_elements(p_units)u)<>expected_count THEN
      RAISE EXCEPTION 'GIFT_DUPLICATE_PURCHASE_UNIT';
    END IF;
    FOR item IN SELECT * FROM public.order_items WHERE order_id=p_order_id AND is_gift_card=true ORDER BY id LOOP
      IF item.quantity IS NULL OR item.quantity<1 OR item.price_at_purchase IS NULL OR item.price_at_purchase<=0 THEN RAISE EXCEPTION 'GIFT_INVALID_PAID_ITEM'; END IF;
      meta:=COALESCE(item.gift_card_metadata,'{}'::jsonb);
      SELECT gift_card_default_validity_months INTO validity FROM public.products WHERE id=item.product_id;
      validity:=COALESCE(validity,24);
      IF validity<1 OR validity>1200 THEN RAISE EXCEPTION 'GIFT_INVALID_VALIDITY'; END IF;
      recipient:=COALESCE(NULLIF(btrim(meta->>'recipientEmail'),''),NULLIF(btrim(o.email),''));
      IF recipient IS NULL THEN RAISE EXCEPTION 'GIFT_RECIPIENT_REQUIRED'; END IF;
      FOR n IN 0..item.quantity-1 LOOP
        SELECT u INTO unit FROM jsonb_array_elements(p_units)u WHERE u->>'orderItemId'=item.id::text AND u->>'unitIndex'=n::text;
        IF unit IS NULL THEN RAISE EXCEPTION 'GIFT_PURCHASE_UNIT_MISSING'; END IF;
        code:=unit->>'code';code_hash:=unit->>'codeHash';
        IF code IS NULL OR code !~ '^MOSE(-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}){4}$' OR code_hash IS NULL OR code_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'GIFT_INVALID_CAPABILITY'; END IF;
        INSERT INTO public.gift_cards(code_hash,code_last4,initial_amount,balance,currency,status,expires_at,source,
          purchased_by_email,purchased_by_order_id,recipient_email,recipient_name,sender_name,personal_message,
          scheduled_send_at,pending_delivery_code,source_order_item_id,source_unit_index)
        VALUES(code_hash,right(code,4),item.price_at_purchase,item.price_at_purchase,'EUR','active',now()+make_interval(months=>validity),'purchase',
          o.email,p_order_id,recipient,NULLIF(btrim(meta->>'recipientName'),''),NULLIF(btrim(meta->>'senderName'),''),NULLIF(btrim(meta->>'personalMessage'),''),
          COALESCE(NULLIF(meta->>'scheduledSendAt','')::timestamptz,now()),code,item.id,n);
      END LOOP;
    END LOOP;
    UPDATE public.orders SET gift_cards_issued_at=now() WHERE id=p_order_id;
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('code',g.pending_delivery_code,'amount',g.initial_amount,'currency',g.currency,
    'expiresAt',g.expires_at,'recipientEmail',g.recipient_email,'recipientName',g.recipient_name,'senderName',g.sender_name,
    'personalMessage',g.personal_message,'purchaserEmail',COALESCE(g.purchased_by_email,''),'scheduledSendAt',g.scheduled_send_at) ORDER BY g.source_order_item_id,g.source_unit_index),'[]'::jsonb)
    INTO issued FROM public.gift_cards g WHERE g.purchased_by_order_id=p_order_id AND g.delivered_at IS NULL AND g.pending_delivery_code IS NOT NULL AND g.delivery_attempts<5;
  RETURN issued;
END $fn$;
REVOKE ALL ON FUNCTION public.issue_paid_order_gift_cards(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.issue_paid_order_gift_cards(uuid,jsonb) TO service_role;
COMMIT;
