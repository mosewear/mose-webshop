-- ISO 3166-1 alpha-2 from CDN edge (e.g. Vercel x-vercel-ip-country)
ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS country_code text;

COMMENT ON COLUMN analytics_events.country_code IS 'Visitor country ISO2 from edge headers when available';
