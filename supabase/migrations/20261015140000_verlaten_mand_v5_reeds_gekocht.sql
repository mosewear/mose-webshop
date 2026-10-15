-- Verlaten manden: niemand mailen die daarna alsnog heeft afgerekend.
--
-- Aanleiding: Leon Hoving brak op 12 oktober om 18:32:58 af en rondde om
-- 18:37:15 een bestelling van precies hetzelfde bedrag af. Vier minuten.
-- Zijn onbetaalde bestelling bleef als "verlaten mand" staan.
--
-- Bij het nalopen bleek dat geen uitzondering maar de regel: van de acht
-- onbetaalde bestellingen in het systeem hebben ALLE ACHT een betaalde
-- bestelling van hetzelfde adres vlak erna. Meestal binnen een minuut of vijf,
-- soms een dag later, en niet altijd voor hetzelfde bedrag. Het zijn dus geen
-- verlaten manden maar overblijfselen van een betaalpoging die mislukte of
-- werd afgebroken, waarna de klant het opnieuw deed.
--
-- Zonder deze regel zou de eerste geslaagde cronrun acht mensen een
-- herinnering sturen voor iets wat ze allang in huis hebben. Dat is erger dan
-- de huidige situatie waarin er niets wordt verstuurd.
--
-- De marge van dertig minuten vóór het afbreken zit erin omdat de volgorde
-- van de twee records bij een herstart van het afrekenen niet gegarandeerd is.
-- Een aankoop van vóór die marge telt niet mee: wie in mei iets kocht en
-- vandaag een mand laat staan, hoort de herinnering gewoon te krijgen.

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
    -- Heeft deze klant het sindsdien alsnog gekocht? Dan niets sturen.
    AND NOT EXISTS (
      SELECT 1
      FROM orders betaald
      WHERE lower(betaald.email) = lower(o.email)
        AND betaald.id <> o.id
        AND betaald.payment_status = 'paid'
        AND betaald.created_at >= o.created_at - INTERVAL '30 minutes'
    )
  GROUP BY
    o.id, o.email, o.shipping_address, o.total, o.subtotal, o.shipping_cost,
    o.discount_amount, o.loyalty_tier_discount, o.gift_card_discount,
    o.locale, o.checkout_started_at, o.abandoned_cart_email_sent;
END;
$function$;

COMMENT ON FUNCTION public.get_abandoned_carts(integer, boolean, integer) IS
  'Onbetaalde bestellingen tussen hours_threshold en max_hours oud. Zonder eigen adressen, en zonder klanten die daarna alsnog hebben afgerekend. max_hours NULL = geen bovengrens.';

-- Index voor de EXISTS hierboven: zonder deze doet elke cronrun een scan over
-- de hele besteltabel per verlaten mand.
CREATE INDEX IF NOT EXISTS orders_email_betaald_idx
  ON orders (lower(email), created_at)
  WHERE payment_status = 'paid';
