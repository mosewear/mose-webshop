-- =====================================================
-- CAMPAIGN EMAIL SENT TRACKER
--
-- Generieke dedup-tabel voor handmatige campagne-blasts (zoals de
-- Spring Drop 2026). Identiek patroon aan `insider_email_sent`, maar
-- generiek over meerdere campagnes en mail-nummers.
--
-- NB: De Spring Drop 2026 send-API werkt OOK zonder deze tabel: hij
-- valt terug op de bestaande `order_emails` audit-log
-- (template_key + recipient_email) om dubbele sends te voorkomen.
-- Deze tabel is een latere optimalisatie zodat we per-campagne
-- counters kunnen tonen zonder LIKE-queries op template_key.
--
-- Bekend gebruik:
--   campaign_key      mail_number
--   ----------------- -----------
--   spring_drop_2026  1, 2, 3
--
-- Gebruikt door /api/admin/campaigns/spring-drop/send om dubbele sends
-- naar dezelfde abonnee te voorkomen wanneer admin per ongeluk twee keer
-- op "verstuur" drukt of een batch herhaald moet worden.
-- =====================================================

CREATE TABLE IF NOT EXISTS campaign_email_sent (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id   UUID NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  campaign_key    TEXT NOT NULL,
  mail_number     INT  NOT NULL,
  resend_id       TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaign_email_sent_unique
    UNIQUE (subscriber_id, campaign_key, mail_number)
);

CREATE INDEX IF NOT EXISTS idx_campaign_email_sent_campaign_mail
  ON campaign_email_sent (campaign_key, mail_number);

CREATE INDEX IF NOT EXISTS idx_campaign_email_sent_subscriber
  ON campaign_email_sent (subscriber_id);

COMMENT ON TABLE campaign_email_sent IS
  'Dedup-log voor handmatige campagne-blasts. Per (subscriber, campaign, mail) staat maximaal 1 rij. Service-role only.';

COMMENT ON COLUMN campaign_email_sent.campaign_key IS
  'Stabiele identifier per campagne, bv. spring_drop_2026.';

COMMENT ON COLUMN campaign_email_sent.mail_number IS
  'Volgnummer binnen de campagne (1, 2, 3, ...).';

-- =====================================================
-- RLS: alleen service-role lezen/schrijven (admin endpoints).
-- Anonieme/clients hebben hier nooit iets te zoeken.
-- =====================================================

ALTER TABLE campaign_email_sent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_email_sent_service_role_all"
  ON campaign_email_sent;

CREATE POLICY "campaign_email_sent_service_role_all"
  ON campaign_email_sent
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  RAISE NOTICE '✅ Created campaign_email_sent table + indexes + RLS service-role only';
END $$;
