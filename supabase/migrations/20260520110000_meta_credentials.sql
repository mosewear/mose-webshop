-- Phase 0: Meta Marketing API credentials storage.
--
-- Stores the System User token + ad account / business identifiers used by
-- the AI Campaign Autopilot to call the Meta Marketing API server-side.
-- Tokens are sensitive: rows are service-role only (no admin SELECT path).

CREATE TABLE IF NOT EXISTS meta_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL DEFAULT 'mose_primary',
  business_id TEXT NOT NULL,
  ad_account_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  token_scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  token_expires_at TIMESTAMPTZ,
  pixel_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(label)
);

COMMENT ON TABLE meta_credentials IS 'Meta Marketing API credentials for the autopilot. Service-role only, never readable from client or admin SSR.';
COMMENT ON COLUMN meta_credentials.label IS 'Logical identifier for this credential set (e.g. mose_primary). Allows multi-account future use.';
COMMENT ON COLUMN meta_credentials.access_token IS 'System User token. Treat as a production secret.';
COMMENT ON COLUMN meta_credentials.token_expires_at IS 'NULL for non-expiring System User tokens.';

CREATE INDEX IF NOT EXISTS idx_meta_credentials_label ON meta_credentials(label);

ALTER TABLE meta_credentials ENABLE ROW LEVEL SECURITY;

-- Intentionally NO policies for authenticated / anon: only the Supabase
-- service-role bypasses RLS, so only server-side code with the service key
-- can read or write these rows. Verified clients (browser + admin SSR with
-- user cookie) cannot see tokens.
