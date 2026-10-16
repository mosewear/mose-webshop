-- Beheerfuncties afsluiten voor de publieke sleutel.
--
-- Deze functies zijn SECURITY DEFINER, wat betekent dat ze draaien met de
-- rechten van hun eigenaar en dus dwars door RLS heen kijken. Postgres geeft
-- een nieuwe functie standaard EXECUTE aan PUBLIC, en dat is nooit
-- teruggedraaid. Gevolg: met de anon-sleutel, die in de browser van elke
-- bezoeker staat, waren ze allemaal aan te roepen.
--
-- Aangetoond met die sleutel op 16-10-2026, voordat dit draaide:
--   get_abandoned_carts              -> naam, e-mailadres, bedrag en mandinhoud
--                                       van klanten die niet hebben afgerekend
--   newsletter_recipients_not_yet_mailed -> de adreslijst van de nieuwsbrief
--   admin_search_orders_for_return   -> volledige bestelregels met e-mailadres
--   get_revenue_stats                -> omzet, aantal orders, gemiddelde orderwaarde
--
-- En bij de schrijffuncties stond de deur net zo open: update_order_status,
-- award_loyalty_points, increment_promo_usage en de cadeaubonfuncties. Die heb
-- ik niet uitgeprobeerd, want dat zou echte gegevens veranderd hebben.
--
-- Hieronder gaat EXECUTE eraf bij PUBLIC, anon en authenticated, en alleen de
-- service_role houdt het. Elke aanroeper in de code is nagelopen: deze
-- zeventien worden uitsluitend aangeroepen vanuit serverroutes die de
-- service-sleutel gebruiken (afrekenen, de betaalwebhook, de cron, bestelling
-- volgen), of ze worden nergens aangeroepen.

REVOKE ALL ON FUNCTION public.admin_search_orders_for_return(p_query text, p_limit integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_search_orders_for_return(p_query text, p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.award_loyalty_points(p_email text, p_user_id uuid, p_order_id uuid, p_order_total numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_loyalty_points(p_email text, p_user_id uuid, p_order_id uuid, p_order_total numeric) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_old_analytics_events() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_analytics_events() TO service_role;

REVOKE ALL ON FUNCTION public.commit_gift_card_redemptions_for_order(p_order_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_gift_card_redemptions_for_order(p_order_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_abandoned_carts(hours_threshold integer, email_not_sent_only boolean, max_hours integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_abandoned_carts(hours_threshold integer, email_not_sent_only boolean, max_hours integer) TO service_role;

REVOKE ALL ON FUNCTION public.get_order_timeline(order_uuid uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_timeline(order_uuid uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_revenue_stats(start_date timestamp without time zone, end_date timestamp without time zone) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_revenue_stats(start_date timestamp without time zone, end_date timestamp without time zone) TO service_role;

REVOKE ALL ON FUNCTION public.increment_promo_usage(promo_code_value text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_promo_usage(promo_code_value text) TO service_role;

REVOKE ALL ON FUNCTION public.lookup_order_for_tracking(p_email text, p_order_ref text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_order_for_tracking(p_email text, p_order_ref text) TO service_role;

REVOKE ALL ON FUNCTION public.mark_abandoned_cart_email_sent(order_uuid uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_abandoned_cart_email_sent(order_uuid uuid) TO service_role;

REVOKE ALL ON FUNCTION public.newsletter_recipients_not_yet_mailed(p_template_key text, p_limit integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.newsletter_recipients_not_yet_mailed(p_template_key text, p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.reserve_gift_card_balance(p_card_id uuid, p_order_id uuid, p_amount numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_gift_card_balance(p_card_id uuid, p_order_id uuid, p_amount numeric) TO service_role;

REVOKE ALL ON FUNCTION public.reverse_gift_card_redemptions_for_order(p_order_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_gift_card_redemptions_for_order(p_order_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.track_promo_usage(promo_code_value text, order_id_value uuid, discount_amount_value numeric, order_total_value numeric, user_id_value uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_promo_usage(promo_code_value text, order_id_value uuid, discount_amount_value numeric, order_total_value numeric, user_id_value uuid) TO service_role;

REVOKE ALL ON FUNCTION public.update_customer_stats(p_email text, p_order_total numeric, p_order_date timestamp with time zone) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_customer_stats(p_email text, p_order_total numeric, p_order_date timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.update_order_status(p_order_id uuid, p_new_status text, p_notes text, p_admin_user_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status(p_order_id uuid, p_new_status text, p_notes text, p_admin_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.upsert_customer_profile(p_email text, p_first_name text, p_last_name text, p_phone text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_customer_profile(p_email text, p_first_name text, p_last_name text, p_phone text) TO service_role;
-- De beheerschermen roepen deze twee wél rechtstreeks vanuit de browser aan,
-- met de sessie van de ingelogde gebruiker. Die houden `authenticated`, maar
-- krijgen hieronder een eigen controle, want tot nu toe kon ELKE ingelogde
-- klant ze aanroepen: move_product_order verandert de volgorde van de winkel
-- en get_conversion_funnel geeft bedrijfscijfers terug.
REVOKE ALL ON FUNCTION public.get_conversion_funnel(timestamp with time zone, timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_conversion_funnel(timestamp with time zone, timestamp with time zone) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.move_product_order(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_product_order(uuid, text) TO authenticated, service_role;

-- De voorraadfuncties toetsen zelf al op beheerder via _inventory_assert_admin
-- en worden aangeroepen met de sessie van de beheerder. Anon hoeft er niet bij.
REVOKE ALL ON FUNCTION public._inventory_assert_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._inventory_assert_admin() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.inventory_apply_regular_delta(uuid, integer, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inventory_apply_regular_delta(uuid, integer, text, text, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.inventory_apply_presale_delta(uuid, integer, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inventory_apply_presale_delta(uuid, integer, text, text, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.inventory_commit_receipt(text, jsonb, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inventory_commit_receipt(text, jsonb, text, integer) TO authenticated, service_role;

-- Bewust ongemoeid gelaten, want deze horen publiek te zijn:
--   get_active_marketing_campaign()  de aankondigingsbalk
--   get_instagram_display_data()     de Instagram-feed op de site
--   track_product_view(uuid, text)   het meten van bezoek
--   get_product_activity(uuid)       geeft alleen twee tellingen terug
--   is_admin() en is_admin(uuid)     worden door de RLS-regels zelf aangeroepen;
--                                    EXECUTE hier weghalen breekt elke regel die
--                                    er gebruik van maakt.
