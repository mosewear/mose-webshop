-- Campagnes via Postmark (stream 'campagnes') aan wie de toestemmingsmail
-- kreeg en zich niet afmeldde. De doelgroep groeit vanzelf mee met de
-- toestemmingsronde: elk verzendmoment kijkt wie er op dat moment bij hoort.
--
-- Regels die de doelgroep bewaakt (zie campagne_claim):
--   * toestemmingsmail minstens wachttijd_minuten geleden ontvangen
--   * niet afgemeld, gebounced of geklaagd, niet op een blokkadelijst
--   * deze campagne nog niet gehad
--   * de afgelopen min_dagen_tussen dagen geen andere campagne gehad
-- Bevestigers gaan voor.

CREATE TABLE IF NOT EXISTS public.campagnes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text NOT NULL UNIQUE,
  naam              text NOT NULL,
  onderwerp         text NOT NULL,
  voorvertoning     text,
  html              text NOT NULL,
  status            text NOT NULL DEFAULT 'concept' CHECK (status IN ('concept', 'actief', 'gestopt', 'klaar')),
  stopreden         text,
  gestopt_op        timestamptz,
  wachttijd_minuten int NOT NULL DEFAULT 90 CHECK (wachttijd_minuten >= 0),
  min_dagen_tussen  int NOT NULL DEFAULT 6 CHECK (min_dagen_tussen >= 0),
  per_run           int NOT NULL DEFAULT 250 CHECK (per_run BETWEEN 1 AND 500),
  max_bounce_pct    numeric NOT NULL DEFAULT 3,
  max_klacht_pct    numeric NOT NULL DEFAULT 0.1,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campagne_momenten (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campagne_id  uuid NOT NULL REFERENCES public.campagnes(id) ON DELETE CASCADE,
  label        text NOT NULL,
  start_op     timestamptz NOT NULL,
  -- even/oneven: de helft van de lijst op een vaste verdeling (voor de A/B-
  -- test van het verzendmoment); rest: iedereen die de campagne nog niet had.
  aandeel      text NOT NULL DEFAULT 'rest' CHECK (aandeel IN ('even', 'oneven', 'rest')),
  status       text NOT NULL DEFAULT 'gepland' CHECK (status IN ('gepland', 'bezig', 'klaar', 'overgeslagen')),
  gestart_op   timestamptz,
  klaar_op     timestamptz,
  UNIQUE (campagne_id, start_op)
);

CREATE TABLE IF NOT EXISTS public.campagne_ontvangers (
  campagne_id  uuid NOT NULL REFERENCES public.campagnes(id) ON DELETE CASCADE,
  email        text NOT NULL,
  moment_id    uuid REFERENCES public.campagne_momenten(id) ON DELETE SET NULL,
  status       text NOT NULL DEFAULT 'bezig' CHECK (status IN ('bezig', 'verzonden', 'bounce', 'klacht', 'afgemeld', 'mislukt')),
  postmark_id  text,
  fout         text,
  verzonden_op timestamptz,
  signaal_op   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campagne_id, email)
);
CREATE INDEX IF NOT EXISTS campagne_ontvangers_email ON public.campagne_ontvangers (email, verzonden_op);
CREATE INDEX IF NOT EXISTS campagne_ontvangers_postmark ON public.campagne_ontvangers (postmark_id);

ALTER TABLE public.campagnes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campagne_momenten ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campagne_ontvangers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.campagnes, public.campagne_momenten, public.campagne_ontvangers FROM anon, authenticated;
GRANT ALL ON public.campagnes, public.campagne_momenten, public.campagne_ontvangers TO service_role;

-- Bundelgrootte van het Postmark-abonnement; beide rondes rekenen ermee.
ALTER TABLE public.toestemming_instellingen ADD COLUMN IF NOT EXISTS postmark_bundel int NOT NULL DEFAULT 10000;

-- Claimt de volgende ontvangers voor een moment, atomair (advisory lock per
-- campagne), en zet ze op 'bezig'. Geeft niets als de campagne niet actief is.
CREATE OR REPLACE FUNCTION public.campagne_claim(p_moment uuid, p_limiet int)
RETURNS TABLE(email text, taal text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE
  m public.campagne_momenten;
  c public.campagnes;
BEGIN
  SELECT * INTO m FROM public.campagne_momenten WHERE id = p_moment;
  SELECT * INTO c FROM public.campagnes WHERE id = m.campagne_id;
  IF c.status <> 'actief' THEN RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(c.id::text));

  RETURN QUERY
  WITH kandidaten AS (
    SELECT t.email, t.taal
      FROM public.toestemming_ontvangers t
     WHERE t.groep <> 'test'
       AND t.status IN ('verzonden', 'bevestigd')
       AND t.verzonden_op IS NOT NULL
       AND t.verzonden_op <= now() - make_interval(mins => c.wachttijd_minuten)
       AND (m.aandeel = 'rest'
            OR (m.aandeel = 'even' AND (hashtext(t.email) & 1) = 0)
            OR (m.aandeel = 'oneven' AND (hashtext(t.email) & 1) = 1))
       AND NOT EXISTS (SELECT 1 FROM public.campagne_ontvangers r WHERE r.campagne_id = c.id AND r.email = t.email)
       AND NOT EXISTS (SELECT 1 FROM public.campagne_ontvangers r
                        WHERE r.email = t.email AND r.verzonden_op > now() - make_interval(days => c.min_dagen_tussen))
       AND NOT EXISTS (SELECT 1 FROM public.email_suppressions s WHERE lower(s.email) = t.email)
       AND NOT EXISTS (SELECT 1 FROM public.newsletter_subscribers n
                        WHERE lower(n.email) = t.email AND (n.status = 'unsubscribed' OR n.suppressed_at IS NOT NULL))
     ORDER BY (t.status = 'bevestigd') DESC, t.verzonden_op
     LIMIT p_limiet
  ), ingevoegd AS (
    INSERT INTO public.campagne_ontvangers (campagne_id, email, moment_id, status)
    SELECT c.id, k.email, m.id, 'bezig' FROM kandidaten k
    ON CONFLICT DO NOTHING
    RETURNING campagne_ontvangers.email
  )
  SELECT k.email, k.taal FROM kandidaten k JOIN ingevoegd i ON i.email = k.email;
END;
$$;
REVOKE ALL ON FUNCTION public.campagne_claim(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.campagne_claim(uuid, int) TO service_role;
