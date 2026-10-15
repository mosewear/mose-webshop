-- Verlaten winkelmanden: selectie herzien.
--
-- Drie dingen klopten niet aan de oude functie.
--
-- 1. GEEN BOVENGRENS. De functie gaf elke onbetaalde bestelling terug die
--    ouder was dan de drempel, hoe oud ook. In de administratie staan nu acht
--    van zulke bestellingen, de oudste van 3 februari 2026. Een herinnering
--    "je winkelmand staat nog klaar" acht maanden na dato is geen service maar
--    een vergissing. Er komt een bovengrens bij: standaard zeven dagen.
--
-- 2. EIGEN ADRESSEN. Tussen die acht zit een bestelling op info@mosewear.com.
--    Adressen op het eigen domein horen niet in een klantmailing thuis.
--
-- 3. GEEN TAAL. De bestelling weet in welke taal hij is geplaatst, maar de
--    functie gaf dat niet terug, dus de mail ging altijd in het Nederlands de
--    deur uit. De kolom gaat nu mee.
--
-- De returnkolommen veranderen, dus de functie moet eerst weg. De enige
-- aanroeper is /api/abandoned-cart-cron.

DROP FUNCTION IF EXISTS public.get_abandoned_carts(integer, boolean);
DROP FUNCTION IF EXISTS public.get_abandoned_carts(integer, boolean, integer);

CREATE OR REPLACE FUNCTION public.get_abandoned_carts(
  hours_threshold integer DEFAULT 24,
  email_not_sent_only boolean DEFAULT true,
  max_hours integer DEFAULT 168
)
RETURNS TABLE(
  order_id uuid,
  customer_email text,
  customer_name text,
  total numeric,
  subtotal numeric,
  shipping_cost numeric,
  discount numeric,
  locale text,
  -- De kolom is 'timestamp without time zone' (waarden in UTC). Hier
  -- timestamptz zetten laat de functie struikelen op het returntype.
  checkout_started_at timestamp,
  hours_since_abandonment numeric,
  order_items jsonb,
  abandoned_cart_email_sent boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.email::TEXT,
    (o.shipping_address->>'name')::TEXT,
    o.total,
    o.subtotal,
    o.shipping_cost,
    -- Alle kortingen bij elkaar. De mail rekent zelf de verzendkosten uit met
    -- de regels van vandaag, en zonder dit bedrag zou het totaal in de mail
    -- hoger uitvallen dan wat de klant bij het afrekenen ziet.
    (COALESCE(o.discount_amount, 0)
      + COALESCE(o.loyalty_tier_discount, 0)
      + COALESCE(o.gift_card_discount, 0)),
    COALESCE(o.locale, 'nl')::TEXT,
    o.checkout_started_at,
    EXTRACT(EPOCH FROM (NOW() - o.checkout_started_at)) / 3600 AS hours_since_abandonment,
    jsonb_agg(
      jsonb_build_object(
        'product_name', oi.product_name,
        'size', oi.size,
        'color', oi.color,
        'quantity', oi.quantity,
        'price', oi.price_at_purchase,
        'image_url', oi.image_url
      )
    ) AS items,
    o.abandoned_cart_email_sent
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.payment_status IN ('unpaid', 'pending')
    AND o.checkout_started_at IS NOT NULL
    AND o.checkout_started_at < NOW() - (hours_threshold || ' hours')::INTERVAL
    -- De bovengrens. NULL betekent uitdrukkelijk "geen grens", voor het
    -- diagnosescherm dat juist alles wil zien.
    AND (
      max_hours IS NULL
      OR o.checkout_started_at > NOW() - (max_hours || ' hours')::INTERVAL
    )
    AND (NOT email_not_sent_only OR o.abandoned_cart_email_sent = false)
    AND o.status <> 'cancelled'
    AND o.email IS NOT NULL
    AND o.email <> ''
    AND o.email NOT ILIKE '%@mosewear.com'
  GROUP BY
    o.id, o.email, o.shipping_address, o.total, o.subtotal, o.shipping_cost,
    o.discount_amount, o.loyalty_tier_discount, o.gift_card_discount,
    o.locale, o.checkout_started_at, o.abandoned_cart_email_sent;
END;
$function$;

COMMENT ON FUNCTION public.get_abandoned_carts(integer, boolean, integer) IS
  'Onbetaalde bestellingen tussen hours_threshold en max_hours oud, zonder eigen adressen. max_hours NULL = geen bovengrens.';
