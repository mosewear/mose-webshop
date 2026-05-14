-- =====================================================
-- Chunked campaign sends: next batch of active subscribers
-- who have not yet received a given template_key (order_emails audit).
-- Used by /api/admin/campaigns/spring-drop/send to avoid loading 10k+
-- rows per request and to stay within serverless timeouts.
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_order_emails_template_status_lower_recipient
  ON order_emails (template_key, status, lower(recipient_email));

CREATE OR REPLACE FUNCTION public.newsletter_recipients_not_yet_mailed(
  p_template_key text,
  p_limit int
)
RETURNS TABLE (id uuid, email text, locale text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ns.id,
    ns.email::text,
    coalesce(ns.locale, 'nl')::text AS locale
  FROM newsletter_subscribers ns
  WHERE ns.status = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM order_emails oe
      WHERE oe.template_key = p_template_key
        AND oe.status = 'sent'
        AND lower(oe.recipient_email) = lower(ns.email)
    )
  ORDER BY ns.subscribed_at ASC
  LIMIT greatest(1, least(coalesce(p_limit, 200), 500));
$$;

REVOKE ALL ON FUNCTION public.newsletter_recipients_not_yet_mailed(text, int)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.newsletter_recipients_not_yet_mailed(text, int)
  TO service_role;

COMMENT ON FUNCTION public.newsletter_recipients_not_yet_mailed(text, int) IS
  'Returns up to p_limit active newsletter subscribers who have no successful order_emails row for p_template_key.';
