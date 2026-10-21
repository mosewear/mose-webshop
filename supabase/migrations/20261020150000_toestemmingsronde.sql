-- Toestemmingsronde voor de oude maillijst (lijst C in Brevo: geïmporteerd op
-- 14-05-2026, nooit gemaild). Elk adres krijgt één mail met de vraag of het
-- op de lijst wil blijven. Wie bevestigt, blijft; wie niets doet, gaat eraf.
--
-- Verzonden in plukken via een Postmark-broadcaststream met een vaste
-- wachttijd ertussen. Vóór elke pluk en bij elke bounce of klacht worden de
-- grenzen opnieuw berekend; gaat er één over, dan stopt de ronde zichzelf.
--
-- Alleen de service-rol leest en schrijft. RLS staat aan zonder regels, dus
-- de publieke sleutel ziet niets.

CREATE TABLE IF NOT EXISTS public.toestemming_ontvangers (
  email          text PRIMARY KEY CHECK (email = lower(email)),
  taal           text NOT NULL DEFAULT 'nl' CHECK (taal IN ('nl', 'en')),
  voornaam       text,
  -- particulier gaat automatisch mee; zakelijk wacht op akkoord van Rick,
  -- want daar zitten de contacten van het oude energiebedrijf tussen.
  groep          text NOT NULL CHECK (groep IN ('particulier', 'zakelijk', 'test')),
  status         text NOT NULL DEFAULT 'wachtrij' CHECK (status IN (
                   'wachtrij', 'vastgehouden', 'bezig', 'verzonden',
                   'bevestigd', 'afgemeld', 'bounce', 'klacht', 'mislukt')),
  -- Lager is eerder. Echte aanmeldingen (formulier, checkout) gaan voor.
  prioriteit     int  NOT NULL DEFAULT 100,
  volgorde       double precision NOT NULL DEFAULT random(),
  token          text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  bron           text,
  pluk           int,
  postmark_id    text,
  fout           text,
  verzonden_op   timestamptz,
  bevestigd_op   timestamptz,
  afgemeld_op    timestamptz,
  signaal_op     timestamptz,
  -- Bewijs van toestemming: wanneer, vanaf welk IP en welke browser.
  bevestiging    jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS toestemming_ontvangers_rij
  ON public.toestemming_ontvangers (status, prioriteit, volgorde);
CREATE INDEX IF NOT EXISTS toestemming_ontvangers_pluk
  ON public.toestemming_ontvangers (pluk);

CREATE TABLE IF NOT EXISTS public.toestemming_instellingen (
  id                 int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  actief             boolean NOT NULL DEFAULT false,
  plukgrootte        int     NOT NULL DEFAULT 50  CHECK (plukgrootte BETWEEN 1 AND 500),
  interval_minuten   int     NOT NULL DEFAULT 60  CHECK (interval_minuten >= 30),
  -- Venster in Amsterdamse tijd. 's Nachts niets: dan wordt een mail
  -- 's ochtends tussen twintig andere weggeveegd, en dat telt als signaal.
  venster_van        int     NOT NULL DEFAULT 8   CHECK (venster_van BETWEEN 0 AND 23),
  venster_tot        int     NOT NULL DEFAULT 21  CHECK (venster_tot BETWEEN 1 AND 24),
  max_bounce_pct     numeric NOT NULL DEFAULT 5,
  max_klacht_pct     numeric NOT NULL DEFAULT 0.1,
  -- Een pluk met zoveel bounces of meer stopt meteen, los van het totaal.
  max_bounces_pluk   int     NOT NULL DEFAULT 5,
  laatste_pluk       int     NOT NULL DEFAULT 0,
  laatste_pluk_op    timestamptz,
  gestopt_op         timestamptz,
  stopreden          text,
  brevo_lijst_id     int,
  updated_at         timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.toestemming_instellingen (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.toestemming_ontvangers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toestemming_instellingen ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.toestemming_ontvangers, public.toestemming_instellingen FROM anon, authenticated;

-- Tellingen in één keer, voor de stopregels en het dashboard. Testadressen
-- tellen niet mee.
CREATE OR REPLACE FUNCTION public.toestemming_cijfers()
RETURNS TABLE(
  totaal bigint, wachtrij bigint, vastgehouden bigint, verzonden bigint,
  bevestigd bigint, afgemeld bigint, bounces bigint, klachten bigint, mislukt bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'wachtrij'),
    count(*) FILTER (WHERE status = 'vastgehouden'),
    -- Alles wat de deur uit is, ook als het daarna bevestigd of gebounced is.
    count(*) FILTER (WHERE verzonden_op IS NOT NULL),
    count(*) FILTER (WHERE status = 'bevestigd'),
    count(*) FILTER (WHERE status = 'afgemeld'),
    count(*) FILTER (WHERE status = 'bounce'),
    count(*) FILTER (WHERE status = 'klacht'),
    count(*) FILTER (WHERE status = 'mislukt')
  FROM public.toestemming_ontvangers
  WHERE groep <> 'test';
$$;
REVOKE ALL ON FUNCTION public.toestemming_cijfers() FROM PUBLIC, anon, authenticated;

-- Eén pluk claimen, atomair. Twee gelijktijdige aanroepen (cron plus de knop
-- in de admin) kunnen zo nooit dezelfde adressen of dezelfde pluk pakken.
-- Geeft niets terug als het niet mag: uit, gestopt, buiten venster of te vroeg.
CREATE OR REPLACE FUNCTION public.toestemming_claim_pluk(p_negeer_wachttijd boolean DEFAULT false)
RETURNS TABLE(pluk int, email text, taal text, voornaam text, token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE
  inst public.toestemming_instellingen;
  uur int := extract(hour FROM now() AT TIME ZONE 'Europe/Amsterdam');
  nieuw int;
BEGIN
  SELECT * INTO inst FROM public.toestemming_instellingen WHERE id = 1 FOR UPDATE;
  IF NOT inst.actief OR inst.gestopt_op IS NOT NULL THEN RETURN; END IF;
  IF uur < inst.venster_van OR uur >= inst.venster_tot THEN RETURN; END IF;
  IF NOT p_negeer_wachttijd AND inst.laatste_pluk_op IS NOT NULL
     AND inst.laatste_pluk_op > now() - make_interval(mins => inst.interval_minuten - 2) THEN
    RETURN;
  END IF;
  -- Een vorige pluk die halverwege afbrak (time-out) blijft op 'bezig' staan;
  -- die adressen eerst afmaken in plaats van een nieuwe pluk te beginnen.
  IF EXISTS (SELECT 1 FROM public.toestemming_ontvangers o WHERE o.status = 'bezig') THEN
    RETURN QUERY SELECT o.pluk, o.email, o.taal, o.voornaam, o.token
      FROM public.toestemming_ontvangers o WHERE o.status = 'bezig';
    RETURN;
  END IF;

  nieuw := inst.laatste_pluk + 1;
  UPDATE public.toestemming_instellingen
     SET laatste_pluk = nieuw, laatste_pluk_op = now(), updated_at = now()
   WHERE id = 1;

  RETURN QUERY
  UPDATE public.toestemming_ontvangers o
     SET status = 'bezig', pluk = nieuw
   WHERE o.email IN (
     SELECT x.email FROM public.toestemming_ontvangers x
      WHERE x.status = 'wachtrij'
      ORDER BY x.prioriteit, x.volgorde
      LIMIT inst.plukgrootte
      FOR UPDATE SKIP LOCKED)
  RETURNING o.pluk, o.email, o.taal, o.voornaam, o.token;
END;
$$;
REVOKE ALL ON FUNCTION public.toestemming_claim_pluk(boolean) FROM PUBLIC, anon, authenticated;

-- Expliciet: alleen de service-rol (zie Supabase-wijziging van 30-10-2026,
-- waarna nieuwe tabellen geen automatische rechten meer krijgen).
GRANT ALL ON public.toestemming_ontvangers, public.toestemming_instellingen TO service_role;
GRANT EXECUTE ON FUNCTION public.toestemming_cijfers(), public.toestemming_claim_pluk(boolean) TO service_role;
