-- =====================================================
-- Instagram OAuth: extra display/audit kolommen
-- =====================================================
-- Voegt kolommen toe aan instagram_credentials zodat we na de OAuth
-- "Connect with Instagram" flow ook de Page-info en het IG-username
-- naast het token kunnen opslaan. De admin-UI gebruikt deze velden om
-- te tonen welk account er momenteel gekoppeld is.

ALTER TABLE instagram_credentials
  ADD COLUMN IF NOT EXISTS page_id     TEXT,
  ADD COLUMN IF NOT EXISTS page_name   TEXT,
  ADD COLUMN IF NOT EXISTS ig_username TEXT;

COMMENT ON COLUMN instagram_credentials.page_id IS
  'Facebook Page ID waarvan het long-lived Page Access Token is afgeleid.';
COMMENT ON COLUMN instagram_credentials.page_name IS
  'Leesbare naam van de gekoppelde Facebook Page (UI display).';
COMMENT ON COLUMN instagram_credentials.ig_username IS
  'Instagram-username van het gekoppelde Business Account (UI display).';
