-- Generalize the order_emails table so it can be used as a central email log
-- for all outgoing emails (order-, return-, marketing- and insider-emails).
--
-- Changes:
--   * Make order_id nullable (so non-order emails can be logged too).
--   * Add template_key (e.g. "order_confirmation", "insider_welcome").
--   * Add resend_id (the message id returned by Resend).
--   * Add locale (nl / en) so we can show the language used.
--   * Widen the email_type column so we can fit longer keys.
--   * Add handy indexes for the admin email log UI.

ALTER TABLE order_emails
  ALTER COLUMN order_id DROP NOT NULL;

ALTER TABLE order_emails
  ADD COLUMN IF NOT EXISTS template_key VARCHAR(80);

ALTER TABLE order_emails
  ADD COLUMN IF NOT EXISTS resend_id VARCHAR(120);

ALTER TABLE order_emails
  ADD COLUMN IF NOT EXISTS locale VARCHAR(8);

ALTER TABLE order_emails
  ALTER COLUMN email_type TYPE VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_order_emails_template_key
  ON order_emails(template_key);

CREATE INDEX IF NOT EXISTS idx_order_emails_recipient_email
  ON order_emails(recipient_email);

CREATE INDEX IF NOT EXISTS idx_order_emails_status
  ON order_emails(status);
