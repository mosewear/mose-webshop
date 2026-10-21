-- Automatisch opbouwen van het tempo van de toestemmingsronde.
-- tempo_stap 0, 1, 2 = 50 per 2 uur, 50 per uur, 100 per uur. De code
-- (src/lib/toestemming.ts, pasTempoAan) beslist; hier staat alleen de stand.
ALTER TABLE public.toestemming_instellingen
  ADD COLUMN IF NOT EXISTS tempo_stap int NOT NULL DEFAULT 0 CHECK (tempo_stap BETWEEN 0 AND 2),
  ADD COLUMN IF NOT EXISTS tempo_sinds timestamptz,
  ADD COLUMN IF NOT EXISTS tempo_automatisch boolean NOT NULL DEFAULT true;
UPDATE public.toestemming_instellingen SET tempo_stap = 0, tempo_sinds = now(), plukgrootte = 50, interval_minuten = 120 WHERE id = 1;
