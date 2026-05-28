-- Postmark migration — bounce/complaint suppression list.
--
-- Why this exists
-- ---------------
-- MOSE was suspended by Resend after a bulk send hit too many hard
-- bounces. Postmark (and every reputable ESP) enforces the same
-- deliverability rules — > 1 % hard-bounce rate triggers an automatic
-- shutdown. Without a suppression list every retry-send to the same
-- dead address keeps tipping us over the threshold.
--
-- This migration adds the two pieces every send path now consults:
--
-- 1. `newsletter_subscribers` gets three extra columns so a subscriber
--    that bounces or complains is *flagged in place* (the row stays so
--    re-subscription is still possible, but recipient queries skip it).
--
-- 2. A standalone `email_suppressions` table for addresses we never
--    stored as a subscriber (guest checkout customers, back-in-stock
--    waiters, contact-form spammers). The Postmark webhook upserts
--    into both targets so we never email a known-bad address twice.
--
-- The `newsletter_recipients_not_yet_mailed` RPC is recreated to honour
-- the suppression flag (same signature, same behaviour for non-flagged
-- rows, so callers stay untouched).

ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS suppressed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suppression_reason TEXT,
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ;

COMMENT ON COLUMN newsletter_subscribers.suppressed_at IS
  'Set by the Postmark webhook when a hard bounce or spam complaint is reported. While non-null the recipient is skipped by every send path (transactional + marketing). Re-subscribe clears this together with unsubscribed_at.';
COMMENT ON COLUMN newsletter_subscribers.suppression_reason IS
  'Free-form context — typical values: hard_bounce, spam_complaint, manual.';
COMMENT ON COLUMN newsletter_subscribers.bounced_at IS
  'First-seen hard-bounce timestamp. Distinct from suppressed_at so we can tell apart "bounced, then re-subscribed and bounced again" from "manually suppressed but never bounced".';

CREATE TABLE IF NOT EXISTS email_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('hard_bounce', 'spam_complaint', 'manual', 'soft_bounce_threshold')),
  source TEXT NOT NULL DEFAULT 'postmark_webhook',
  provider_message_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness so 'Foo@Bar.com' and 'foo@bar.com' map
-- to the same suppression row — matches the lower(recipient_email)
-- comparisons used everywhere else.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_suppressions_email_lower
  ON email_suppressions ((lower(email)));

CREATE INDEX IF NOT EXISTS idx_email_suppressions_created_at
  ON email_suppressions (created_at DESC);

ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;

-- Service role writes (webhook) and reads (send paths) directly; the
-- table is never exposed to authenticated/anon clients to keep PII
-- (bounce reasons) out of any leaked anon JWT.
DROP POLICY IF EXISTS "email_suppressions_service_role_all" ON email_suppressions;
CREATE POLICY "email_suppressions_service_role_all" ON email_suppressions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE email_suppressions IS
  'Hard-bounce / spam-complaint registry for addresses NOT stored as newsletter subscribers (guest checkout customers, BIS waiters, contact form senders). The Postmark webhook upserts here on every Bounce/SpamComplaint event; src/lib/email-suppression.ts isEmailSuppressed() consults this table + newsletter_subscribers before every send.';

-- Recreate the chunked-campaign RPC so suppressed subscribers are
-- silently skipped in every batch. Same args, same return shape — no
-- caller change.
DROP FUNCTION IF EXISTS public.newsletter_recipients_not_yet_mailed(text, int);

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
    AND ns.suppressed_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM email_suppressions es
      WHERE lower(es.email) = lower(ns.email)
    )
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
  'Returns up to p_limit active newsletter subscribers who: (a) have status=active, (b) are not suppressed (neither newsletter_subscribers.suppressed_at nor a matching email_suppressions row), and (c) have no successful order_emails row for p_template_key. Used by the spring-drop chunked sender.';
